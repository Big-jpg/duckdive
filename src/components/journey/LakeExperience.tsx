"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import {useRef,useState,type DragEvent} from "react";
import {JOURNEY_LIMITS} from "@/lib/journey-state";
import {useJourney} from "./JourneyProvider";

const LakeScene=dynamic(()=>import("./LakeScene"),{ssr:false,loading:()=> <div className="lake-canvas lake-loading"/>});
const examples=["CSV","XLSX","JSON","PDF","TXT","…"];
const sizeFormatter=new Intl.NumberFormat("en-AU",{maximumFractionDigits:1});
const mib=(bytes:number)=>sizeFormatter.format(bytes/1024/1024);
const statusLabel={arriving:"Entering Lake",floating:"Waiting in Lake",diving:"Entering Lake",transforming:"Preparing metadata",lake_ready:"Metadata ready"} as const;

export default function LakeExperience(){
  const inputRef=useRef<HTMLInputElement>(null),[dragging,setDragging]=useState(false),{state,hydrated,activity,notice,addFiles,reset}=useJourney();
  function drop(event:DragEvent){event.preventDefault();setDragging(false);const files=[...event.dataTransfer.items].filter(item=>item.kind==="file").map(item=>item.getAsFile()).filter((file):file is File=>Boolean(file));if(files.length)addFiles(files);}
  return <main id="main-content" className="lake-page">
    <section className="lake-heading"><p>Stage 01 · Browser-Only Lesson</p><h1>Choose files for the simulated Lake.</h1><span>DuckDive stores file names, types, and sizes for this browser tab. It does not read or upload file contents.</span></section>
    <section className={`lake-stage ${dragging?"dragging":""}`} onDragEnter={event=>{event.preventDefault();setDragging(true);}} onDragOver={event=>event.preventDefault()} onDragLeave={event=>{if(event.currentTarget===event.target)setDragging(false);}} onDrop={drop}>
      <LakeScene files={state.files} seed={state.visualSeed}/>
      <input ref={inputRef} className="sr-only" id="lake-files" name="lake-files" type="file" multiple autoComplete="off" onChange={event=>{if(event.target.files)addFiles(event.target.files);event.target.value="";}}/>
      <label htmlFor="lake-files" className="lake-hit-area"><span className="sr-only">Choose local files for the simulated Lake</span></label>
      <div className="lake-caption" aria-live="polite"><strong>{hydrated?activity.label:"Restoring Session…"}</strong><span>{activity.ready} metadata-ready · {activity.queued} preparing</span></div>
    </section>
    <ul className="file-examples" aria-label="Example file types">{examples.map(item=><li key={item}>{item}</li>)}</ul>
    <section className="lake-drop-card">
      <button onClick={()=>inputRef.current?.click()}><span aria-hidden="true">↥</span><strong>Choose Local Files</strong><small>or drop files onto the Lake above</small></button>
      <p>Any file type · 50&nbsp;MiB each · Up to {JOURNEY_LIMITS.fileCount} files</p>
      <em>Teaching simulation · File contents stay on your device</em>
    </section>
    <aside className="lake-import-cta" aria-label="CSV import option"><div><strong>Ready to use real data?</strong><span>The CSV importer is separate from this metadata-only lesson.</span></div><Link href="/datasets/csv">Import a CSV <b aria-hidden="true">→</b></Link></aside>
    {state.files.length?<section className="lake-queue" aria-labelledby="lake-queue-heading"><header><h2 id="lake-queue-heading">Session Metadata</h2><span>{state.files.length} {state.files.length===1?"file":"files"} · {mib(state.files.reduce((sum,file)=>sum+file.size,0))}&nbsp;MiB</span><button onClick={()=>{if(confirm("Clear all file metadata from this browser session?"))reset();}}>Reset Session</button></header><div>{state.files.map(file=><article key={file.id}><span aria-hidden="true">{file.extension}</span><p><strong title={file.name}>{file.name}</strong><small>{mib(file.size)}&nbsp;MiB · {statusLabel[file.status]}</small></p></article>)}</div></section>:null}
    <p className="lake-notice" role="status" aria-live="polite">{notice||"File contents are never read or uploaded in this lesson."}</p>
  </main>;
}
