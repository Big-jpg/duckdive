import {createHash} from "node:crypto";
import {readFile} from "node:fs/promises";
import path from "node:path";
import {createMotherDuckUser,createEmbedSession} from "./motherduck-api";
import {motherduckServiceSql,sharedUsername} from "./motherduck-access";
import {getSetting,setSetting,getWorkspace,getWorkspaceDives,saveWorkspace,audit,type AppUser} from "./app-db";
import {mdString} from "./sql-literal";
import {analyticsPolicy} from "./analytics-contract";
import {hasExactWorkspaceDives,type WorkspaceDive} from "./workspace-dives";
import {datasetForStarterKey} from "./datasets";

export const STARTER_DIVES=[
 {key:"market-pulse",title:"VIC Market Pulse",label:"Statewide pulse",description:"Sale volume, price and land signals with suburb controls.",entryPrompt:"Start with the statewide picture",questions:["How is the Victorian housing market changing?","Which suburbs are gaining sales momentum?"],file:"market-pulse.tsx",accent:"blue"},
 {key:"suburb-story",title:"Suburb Story",label:"One location",description:"Eight-year suburb history and transparent bedroom samples.",entryPrompt:"Explore one suburb in depth",questions:["What has changed in Yarraville?","How have three-bedroom house prices moved in Footscray?"],file:"suburb-story.tsx",accent:"orange"},
 {key:"market-matchup",title:"Market Matchup",label:"Compare places",description:"A side-by-side evidence lab for two Victorian locations.",entryPrompt:"Compare two locations",questions:["How do Yarraville and Footscray compare?","Which of two suburbs has stronger sales momentum?"],file:"market-matchup.tsx",accent:"teal"},
] as const;
export type StarterKey=(typeof STARTER_DIVES)[number]["key"];
type Provisioned=(typeof STARTER_DIVES)[number]&{diveId:string};
export type StarterEntry={key:StarterKey;datasetKey:string;datasetTitle:string;title:string;label:string;description:string;entryPrompt:string;questions:readonly string[];accent:string};
export type WorkspaceEditorDive=StarterEntry&{diveId:string;contractVersion:string;publicContract:ReturnType<typeof starterDataset>["publicContract"]};

function starterDataset(starterKey:string){
  const dataset=datasetForStarterKey(starterKey);
  if(!dataset)throw new Error(`Starter ${starterKey} is not registered to a dataset`);
  return dataset;
}

function starterEntry(starter:(typeof STARTER_DIVES)[number]):StarterEntry{
  const dataset=starterDataset(starter.key);
  return {key:starter.key,datasetKey:dataset.key,datasetTitle:dataset.title,title:starter.title,label:starter.label,description:starter.description,entryPrompt:starter.entryPrompt,questions:starter.questions,accent:starter.accent};
}

export function starterEntries(){return STARTER_DIVES.map(starterEntry);}

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

function shareUrl(){const value=process.env.MOTHERDUCK_SHARE_URL;if(!value?.startsWith("md:_share/"))throw new Error("MOTHERDUCK_SHARE_URL must be the organization share URL emitted by MotherDuck");return value;}
export function renderDiveSource(source:string,share:string){return source
  .replaceAll("__DUCKDIVE_THEME_CSS__",DIVE_THEME_CSS)
  .replaceAll("__MOTHERDUCK_SHARE_URL__",share)
  .replaceAll("__PRICE_MIN__",String(analyticsPolicy.priceAud.minimum))
  .replaceAll("__PRICE_MAX__",String(analyticsPolicy.priceAud.maximum))
  .replaceAll("__LAND_MIN__",String(analyticsPolicy.landSizeSqm.minimum))
  .replaceAll("__LAND_MAX__",String(analyticsPolicy.landSizeSqm.maximum));}
async function content(file:string){return renderDiveSource(await readFile(path.join(process.cwd(),"src","dives",file),"utf8"),shareUrl());}
async function createDive(title:string,description:string,source:string){const sql=await motherduckServiceSql();const rows=await sql.unsafe(`SELECT id FROM MD_CREATE_DIVE(title = ${mdString(title)}, content = ${mdString(source)}, description = ${mdString(description)})`);return String(rows[0].id);}
let setup:Promise<Provisioned[]>|null=null;
export async function sourceDives(){if(setup)return setup;setup=(async()=>{const username=sharedUsername();await createMotherDuckUser(username);const result:Provisioned[]=[];for(const starter of STARTER_DIVES){const source=await content(starter.file),hash=createHash("sha256").update(source).digest("hex"),idKey=`source_dive:${starter.key}`,hashKey=`source_hash:${starter.key}`;let diveId=await getSetting(idKey);if(!diveId){diveId=await createDive(starter.title,starter.description,source);await setSetting(idKey,diveId);}if(await getSetting(hashKey)!==hash){const sql=await motherduckServiceSql();await sql.unsafe(`SELECT * FROM MD_UPDATE_DIVE_CONTENT(id = ${mdString(diveId)}, content = ${mdString(source)})`);await setSetting(hashKey,hash);}result.push({...starter,diveId});}return result;})().catch(error=>{setup=null;throw error;});return setup;}
let publicCache:{expires:number;value:Awaited<ReturnType<typeof buildPublicGallery>>}|null=null;
async function buildPublicGallery(){const starters=await sourceDives();return Promise.all(starters.map(async starter=>{const session=await createEmbedSession(starter.diveId,sharedUsername());await audit("embed.public",null,starter.diveId);return {...starterEntry(starter),diveId:starter.diveId,session};}));}
export async function publicGallery(){if(publicCache&&publicCache.expires>Date.now())return publicCache.value;const value=await buildPublicGallery();publicCache={expires:Date.now()+5*60*1000,value};return value;}
export async function ensureUserWorkspace(user:AppUser){const existing=await getWorkspace(user.user_id);if(existing){const owned=await getWorkspaceDives(existing.workspace_id);if(hasExactWorkspaceDives(owned,STARTER_DIVES.map(starter=>starter.key)))return existing;throw new Error("Workspace has incomplete or invalid relational Dive ownership");}const starters=await sourceDives(),diveIds:Record<string,string>={},sourceIds:Record<string,string>={};for(const starter of starters){diveIds[starter.key]=await createDive(`${starter.title} · ${user.user_id.slice(0,8)}`,starter.description,await content(starter.file));sourceIds[starter.key]=starter.diveId;}const workspace=await saveWorkspace(user.user_id,sharedUsername(),diveIds,sourceIds);await audit("workspace.provisioned",user.user_id,workspace.workspace_id,{diveCount:starters.length});return workspace;}
export async function workspaceGallery(user:AppUser){const workspace=await ensureUserWorkspace(user),owned=await getWorkspaceDives(workspace.workspace_id);return Promise.all(STARTER_DIVES.map(async starter=>{const mapping=owned.find(dive=>dive.starter_key===starter.key);if(!mapping)throw new Error(`Workspace is missing ${starter.key}`);return {...starterEntry(starter),diveId:mapping.dive_id,session:await createEmbedSession(mapping.dive_id,workspace.motherduck_username)};}));}
export function buildWorkspaceEditorDives(owned:readonly WorkspaceDive[]){
  return STARTER_DIVES.map(starter=>{
    const mapping=owned.find(dive=>dive.starter_key===starter.key),dataset=starterDataset(starter.key);
    if(!mapping||mapping.dataset_key!==dataset.key)throw new Error(`Workspace is missing registered ownership for ${starter.key}`);
    return {...starterEntry(starter),diveId:mapping.dive_id,contractVersion:dataset.contractVersion,publicContract:dataset.publicContract} satisfies WorkspaceEditorDive;
  });
}
export async function workspaceEditorManifest(user:AppUser){
  const workspace=await ensureUserWorkspace(user),owned=await getWorkspaceDives(workspace.workspace_id);
  const dives=buildWorkspaceEditorDives(owned);
  return {workspaceId:workspace.workspace_id,diveIds:Object.fromEntries(dives.map(dive=>[dive.key,dive.diveId])),dives};
}
