import {createHash} from "node:crypto";
import {readFile} from "node:fs/promises";
import path from "node:path";
import {createMotherDuckUser,createEmbedSession} from "./motherduck-api";
import {motherduckServiceSql} from "./motherduck-access";
import {getSetting,setSetting,getWorkspace,getWorkspaceDives,saveWorkspace,audit,type AppUser,type Workspace} from "./app-db";
import {mdString} from "./sql-literal";
import type {WorkspaceDive} from "./workspace-dives";
import {datasetForStarterKey,datasetWorkspaceManifest,defaultDataset,resolveDatasetRuntime,starterByKey,type DatasetDefinition,type DatasetStarterDefinition,type DatasetWorkspaceManifest} from "./datasets";

type Provisioned=DatasetStarterDefinition&{diveId:string};
export type StarterEntry=Omit<DatasetStarterDefinition,"file">&{datasetKey:string;datasetTitle:string};
export type WorkspaceEditorDive=StarterEntry&{diveId:string;contractVersion:string;publicContract:DatasetDefinition["publicContract"]};

function starterEntry(dataset:DatasetDefinition,starter:DatasetStarterDefinition):StarterEntry{
  return {key:starter.key,title:starter.title,label:starter.label,description:starter.description,outcome:starter.outcome,entryPrompt:starter.entryPrompt,questions:starter.questions,accent:starter.accent,datasetKey:dataset.key,datasetTitle:dataset.title};
}

export function starterEntries(dataset:DatasetDefinition=defaultDataset()){return dataset.starters.map(starter=>starterEntry(dataset,starter));}

export const DIVE_THEME_CSS=`
:root{--dd-bg:#fbfcf8;--dd-surface:#fff8e8;--dd-sand:#efd59b;--dd-ink:#182127;--dd-muted:#56656b;--dd-sky:#58bbe3;--dd-accent:#b66d2c;--dd-line:rgba(24,33,39,.22)}
@media(prefers-color-scheme:dark){:root{--dd-bg:#17120d;--dd-surface:#2a2015;--dd-sand:#3a2a18;--dd-ink:#f1d589;--dd-muted:#bda873;--dd-sky:#742d17;--dd-accent:#d86228;--dd-line:rgba(241,213,137,.24)}}
.dd-root{min-height:600px;background:linear-gradient(180deg,var(--dd-sky) 0 96px,var(--dd-bg) 96px);color:var(--dd-ink);font-family:Arial,Helvetica,sans-serif}
.dd-kicker{color:var(--dd-ink);font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}
.dd-muted{color:var(--dd-muted)}
.dd-control{border:1px solid var(--dd-line);border-radius:2px;background:var(--dd-surface);color:var(--dd-ink)}
.dd-panel{border:1px solid var(--dd-line);background:var(--dd-surface)}
.dd-rule{border-color:var(--dd-line)}
.dd-loading{background:var(--dd-sand)}
.recharts-cartesian-axis-tick-value{fill:var(--dd-muted)}
`;

export function renderDiveSource(source:string,dataset:DatasetDefinition,runtime=resolveDatasetRuntime(dataset)){
  let rendered=source.replaceAll("__DUCKDIVE_THEME_CSS__",DIVE_THEME_CSS);
  for(const [token,value] of Object.entries(dataset.sourceTemplateValues(runtime)))rendered=rendered.replaceAll(token,value);
  const unresolved=rendered.match(/__[A-Z][A-Z0-9_]+__/g);
  if(unresolved?.length)throw new Error(`Unresolved Dive source template values: ${[...new Set(unresolved)].join(", ")}`);
  return rendered;
}

async function content(dataset:DatasetDefinition,starter:DatasetStarterDefinition){
  return renderDiveSource(await readFile(path.join(process.cwd(),"src","dives",starter.file),"utf8"),dataset);
}

async function createDive(title:string,description:string,source:string,username:string){
  const sql=await motherduckServiceSql(username),rows=await sql.unsafe(`SELECT id FROM MD_CREATE_DIVE(title = ${mdString(title)}, content = ${mdString(source)}, description = ${mdString(description)})`);
  return String(rows[0].id);
}

const sourceSetups=new Map<string,Promise<Provisioned[]>>();
export async function sourceDives(dataset:DatasetDefinition=defaultDataset()){
  const cached=sourceSetups.get(dataset.key);if(cached)return cached;
  const setup=(async()=>{
    const runtime=resolveDatasetRuntime(dataset),username=runtime.serviceAccountUsername;
    await createMotherDuckUser(username);
    const result:Provisioned[]=[];
    for(const starter of dataset.starters){
      const source=await content(dataset,starter),hash=createHash("sha256").update(source).digest("hex"),idKey=`source_dive:${starter.key}`,hashKey=`source_hash:${starter.key}`;
      let diveId=await getSetting(idKey);
      if(!diveId){diveId=await createDive(starter.title,starter.description,source,username);await setSetting(idKey,diveId);}
      if(await getSetting(hashKey)!==hash){const sql=await motherduckServiceSql(username);await sql.unsafe(`SELECT * FROM MD_UPDATE_DIVE_CONTENT(id = ${mdString(diveId)}, content = ${mdString(source)})`);await setSetting(hashKey,hash);}
      result.push({...starter,diveId});
    }
    return result;
  })().catch(error=>{sourceSetups.delete(dataset.key);throw error;});
  sourceSetups.set(dataset.key,setup);return setup;
}

export function workspaceDatasetProvisioningPlan(owned:readonly WorkspaceDive[],dataset:DatasetDefinition=defaultDataset()){
  const expected=new Set(dataset.starters.map(starter=>starter.key));
  for(const mapping of owned){
    if(expected.has(mapping.starter_key)&&mapping.dataset_key!==dataset.key)throw new Error(`Workspace starter ${mapping.starter_key} belongs to another dataset`);
    if(mapping.dataset_key===dataset.key&&!expected.has(mapping.starter_key))throw new Error(`Workspace contains an unregistered ${dataset.key} starter`);
  }
  return {missing:dataset.starters.filter(starter=>!owned.some(mapping=>mapping.dataset_key===dataset.key&&mapping.starter_key===starter.key)),preserved:owned.filter(mapping=>mapping.dataset_key!==dataset.key)};
}

export async function ensureWorkspaceDataset(user:AppUser,dataset:DatasetDefinition=defaultDataset()):Promise<Workspace>{
  const runtime=resolveDatasetRuntime(dataset),existing=await getWorkspace(user.user_id),owned=existing?await getWorkspaceDives(existing.workspace_id):[];
  const {missing}=workspaceDatasetProvisioningPlan(owned,dataset);
  if(!missing.length&&existing?.motherduck_username===runtime.serviceAccountUsername)return existing;
  const diveIds:Record<string,string>={},sourceIds:Record<string,string>={};
  if(missing.length){
    const sources=await sourceDives(dataset);
    for(const starter of missing){
      const source=sources.find(item=>item.key===starter.key);if(!source)throw new Error(`Source Dive is missing ${starter.key}`);
      diveIds[starter.key]=await createDive(`${starter.title} · ${user.user_id.slice(0,8)}`,starter.description,await content(dataset,starter),runtime.serviceAccountUsername);
      sourceIds[starter.key]=source.diveId;
    }
  }
  const workspace=await saveWorkspace(user.user_id,runtime.serviceAccountUsername,diveIds,sourceIds);
  if(missing.length)await audit("workspace.dataset_provisioned",user.user_id,workspace.workspace_id,{datasetKey:dataset.key,diveCount:missing.length});
  return workspace;
}

export async function workspaceDivePreview(user:AppUser,starterKey:string){
  const dataset=datasetForStarterKey(starterKey),starter=starterByKey(starterKey);
  if(!dataset||!starter)throw new Error("Unknown starter report");
  const workspace=await ensureWorkspaceDataset(user,dataset),owned=await getWorkspaceDives(workspace.workspace_id),mapping=owned.find(dive=>dive.dataset_key===dataset.key&&dive.starter_key===starter.key);
  if(!mapping)throw new Error(`Workspace is missing ${starter.key}`);
  return {dataset:datasetWorkspaceManifest(dataset),dive:{...starterEntry(dataset,starter),diveId:mapping.dive_id,session:await createEmbedSession(mapping.dive_id,workspace.motherduck_username)}};
}

export function buildWorkspaceEditorDives(owned:readonly WorkspaceDive[],dataset:DatasetDefinition=defaultDataset()){
  workspaceDatasetProvisioningPlan(owned,dataset);
  return dataset.starters.map(starter=>{
    const mapping=owned.find(dive=>dive.dataset_key===dataset.key&&dive.starter_key===starter.key);
    if(!mapping)throw new Error(`Workspace is missing registered ownership for ${starter.key}`);
    return {...starterEntry(dataset,starter),diveId:mapping.dive_id,contractVersion:dataset.contractVersion,publicContract:dataset.publicContract} satisfies WorkspaceEditorDive;
  });
}

export async function workspaceEditorManifest(user:AppUser):Promise<{workspaceId:string;dataset:DatasetWorkspaceManifest;diveIds:Record<string,string>;dives:WorkspaceEditorDive[]}>{
  const dataset=defaultDataset(),workspace=await ensureWorkspaceDataset(user,dataset),owned=await getWorkspaceDives(workspace.workspace_id),dives=buildWorkspaceEditorDives(owned,dataset);
  return {workspaceId:workspace.workspace_id,dataset:datasetWorkspaceManifest(dataset),diveIds:Object.fromEntries(dives.map(dive=>[dive.key,dive.diveId])),dives};
}
