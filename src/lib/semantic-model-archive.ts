"use client";

import JSZip from "jszip";
import {parseTmdlEvidence,type TmdlDocument} from "./tmdl-evidence-parser";
import {sha256Hex,type LocalSemanticEvidence} from "./semantic-model-types";

export const SEMANTIC_ARCHIVE_LIMITS={compressedBytes:50*1024*1024,fileCount:10_000,expandedBytes:250*1024*1024} as const;

export class SemanticModelArchiveError extends Error{
  constructor(message:string){super(message);this.name="SemanticModelArchiveError";}
}

function unsafePath(path:string){return path.includes("\\")||path.startsWith("/")||/^[a-z]:/i.test(path)||path.split("/").some(part=>part==="..");}

export function validateSemanticArchiveEntries(entries:readonly {name:string;originalName?:string;uncompressedSize:number}[]){
  if(entries.length>SEMANTIC_ARCHIVE_LIMITS.fileCount)throw new SemanticModelArchiveError("The archive contains too many entries.");
  let expanded=0;
  for(const entry of entries){
    const original=entry.originalName||entry.name;
    if(unsafePath(original)||original!==entry.name)throw new SemanticModelArchiveError("The archive contains an unsafe path.");
    expanded+=entry.uncompressedSize;
  }
  if(expanded>SEMANTIC_ARCHIVE_LIMITS.expandedBytes)throw new SemanticModelArchiveError("The archive exceeds the 250 MiB expanded limit.");
}

function roots(paths:string[]){return [...new Set(paths.filter(path=>path.endsWith(".SemanticModel/.platform")).map(path=>path.slice(0,-".platform".length)))];}

export async function openSemanticModelArchive(file:File):Promise<LocalSemanticEvidence>{
  if(typeof window==="undefined")throw new SemanticModelArchiveError("Semantic model archives can only be opened in a browser.");
  if(!file.name.toLowerCase().endsWith(".zip"))throw new SemanticModelArchiveError("Only .zip archives are accepted.");
  if(file.size>SEMANTIC_ARCHIVE_LIMITS.compressedBytes)throw new SemanticModelArchiveError("The archive exceeds the 50 MiB compressed limit.");
  const bytes=await file.arrayBuffer();
  let zip:JSZip;try{zip=await JSZip.loadAsync(bytes);}catch{throw new SemanticModelArchiveError("The archive is encrypted, damaged, or not a readable ZIP.");}
  const entries=Object.values(zip.files);
  validateSemanticArchiveEntries(entries.map(entry=>({name:entry.name,originalName:(entry as JSZip.JSZipObject&{unsafeOriginalName?:string}).unsafeOriginalName,uncompressedSize:Number((entry as unknown as {_data?:{uncompressedSize?:number}})._data?.uncompressedSize||0)})));
  const semanticRoots=roots(entries.map(entry=>entry.name));
  if(semanticRoots.length!==1)throw new SemanticModelArchiveError(semanticRoots.length?"The archive contains multiple semantic models.":"No *.SemanticModel/.platform file was found.");
  const root=semanticRoots[0],required=[`${root}definition.pbism`,`${root}definition/model.tmdl`,`${root}definition/relationships.tmdl`];
  const missing=required.find(path=>!zip.files[path]);if(missing)throw new SemanticModelArchiveError(`The semantic model is missing ${missing.split("/").pop()}.`);
  const tablePaths=entries.map(entry=>entry.name).filter(path=>path.startsWith(`${root}definition/tables/`)&&path.endsWith(".tmdl")&&!zip.files[path].dir);
  if(!tablePaths.length)throw new SemanticModelArchiveError("No table definitions were found in definition/tables/.");
  const definitionPaths=entries.map(entry=>entry.name).filter(path=>path.startsWith(`${root}definition/`)&&path.endsWith(".tmdl")&&!zip.files[path].dir).sort();
  const documents:TmdlDocument[]=[];
  for(const path of definitionPaths){
    const entry=zip.files[path],text=await entry.async("string");
    if(new TextEncoder().encode(text).byteLength>SEMANTIC_ARCHIVE_LIMITS.expandedBytes)throw new SemanticModelArchiveError("A TMDL document exceeds the expanded-size limit.");
    if(text.includes("\0")||text.includes("\uFFFD"))throw new SemanticModelArchiveError(`${path.slice(root.length)} is not valid UTF-8 TMDL text.`);
    documents.push({path:path.slice(root.length),text});
  }
  let platform:{metadata?:{displayName?:string}}={};try{platform=JSON.parse(await zip.files[`${root}.platform`].async("string"));}catch{throw new SemanticModelArchiveError("The .platform file is not valid JSON.");}
  try{JSON.parse(await zip.files[`${root}definition.pbism`].async("string"));}catch{throw new SemanticModelArchiveError("definition.pbism is not valid JSON.");}
  const displayName=platform.metadata?.displayName?.trim()||root.replace(/\/$/,"").split("/").pop()?.replace(/\.SemanticModel$/,"")||"Semantic model";
  return parseTmdlEvidence({displayName,archiveFingerprint:await sha256Hex(bytes),documents});
}
