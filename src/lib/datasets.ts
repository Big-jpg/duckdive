import {VIC_HOUSING_DATASET} from "./dataset-definitions/vic-housing";
import {WA_VEHICLE_MARKET_DATASET} from "./dataset-definitions/wa-vehicle-market";
import type {DatasetDefinition,DatasetRuntime,DatasetWorkspaceManifest} from "./dataset-types";

export type {
  DatasetDefinition,
  DatasetPublicContract,
    DatasetReportPolicy,
  DatasetReportDateRange,
  DatasetRuntime,
  DatasetStarterDefinition,
  DatasetStarterManifest,
  DatasetWorkspaceManifest,
} from "./dataset-types";

export const DATASETS:readonly DatasetDefinition[]=[WA_VEHICLE_MARKET_DATASET];
export {VIC_HOUSING_DATASET,WA_VEHICLE_MARKET_DATASET};
export type RegisteredDataset=DatasetDefinition;

function nestedKeys(value:unknown):string[]{
  if(Array.isArray(value))return value.flatMap(nestedKeys);
  if(!value||typeof value!=="object")return [];
  return Object.entries(value).flatMap(([key,nested])=>[key,...nestedKeys(nested)]);
}

export function validateDatasetRegistry(datasets:readonly DatasetDefinition[]){
  const datasetKeys=new Set<string>(),starterKeys=new Set<string>();
  let defaultCount=0;
  for(const dataset of datasets){
    if(!/^[a-z][a-z0-9-]*$/.test(dataset.key))throw new Error(`Invalid dataset key: ${dataset.key}`);
    if(datasetKeys.has(dataset.key))throw new Error(`Duplicate dataset key: ${dataset.key}`);
    datasetKeys.add(dataset.key);
    if(dataset.default)defaultCount++;
    if(!dataset.starters.length)throw new Error(`Dataset ${dataset.key} must register at least one starter`);
    for(const selector of [dataset.motherduck.databaseEnv,dataset.motherduck.shareUrlEnv,dataset.motherduck.serviceAccountEnv]){
      if(!/^[A-Z][A-Z0-9_]*$/.test(selector))throw new Error(`Dataset ${dataset.key} has an unsafe runtime selector`);
    }
    for(const starter of dataset.starters){
      if(!/^[a-z][a-z0-9-]*$/.test(starter.key))throw new Error(`Invalid starter key: ${starter.key}`);
      if(starterKeys.has(starter.key))throw new Error(`Duplicate starter key: ${starter.key}`);
      if(!starter.questions.length)throw new Error(`Starter ${starter.key} must provide at least one example`);
      if(!/^[a-z0-9][a-z0-9-]*\.tsx$/.test(starter.file))throw new Error(`Starter ${starter.key} has an unsafe source file`);
      starterKeys.add(starter.key);
    }
    const publicKeys=nestedKeys(datasetWorkspaceManifest(dataset));
    if(publicKeys.some(key=>/(?:file|env|url|token|credential|serviceaccount|template)/i.test(key)))throw new Error(`Dataset ${dataset.key} has an unsafe public projection`);
  }
  if(defaultCount!==1)throw new Error("Dataset registry must contain exactly one default dataset");
}

validateDatasetRegistry(DATASETS);

function configuredValue(env:Record<string,string|undefined>,name:string,fallback:string){
  return (env[name]||fallback).trim();
}

export function defaultDataset(){
  const dataset=DATASETS.find(item=>item.default);
  if(!dataset)throw new Error("Default dataset is unavailable");
  return dataset;
}

export function datasetByKey(key:string){return DATASETS.find(dataset=>dataset.key===key)||null;}

export function datasetForStarterKey(starterKey:string){
  return DATASETS.find(dataset=>dataset.starters.some(starter=>starter.key===starterKey))||null;
}

export function starterByKey(starterKey:string){
  const dataset=datasetForStarterKey(starterKey);
  return dataset?.starters.find(starter=>starter.key===starterKey)||null;
}

export function datasetWorkspaceManifest(dataset:DatasetDefinition):DatasetWorkspaceManifest{
  return {
    key:dataset.key,
    title:dataset.title,
    description:dataset.description,
    kind:dataset.kind,
    contractVersion:dataset.contractVersion,
    presentation:dataset.presentation,
    starters:dataset.starters.map(starter=>({key:starter.key,title:starter.title,label:starter.label,description:starter.description,outcome:starter.outcome,entryPrompt:starter.entryPrompt,questions:starter.questions,accent:starter.accent})),
  };
}

export function resolveDatasetRuntime(dataset:DatasetDefinition,env:Record<string,string|undefined>=process.env):DatasetRuntime{
  const motherduckDatabase=configuredValue(env,dataset.motherduck.databaseEnv,dataset.motherduck.databaseDefault);
  if(!/^[a-z][a-z0-9_]*$/.test(motherduckDatabase))throw new Error(`Invalid MotherDuck database configured for dataset ${dataset.key}`);
  const motherduckShareUrl=(env[dataset.motherduck.shareUrlEnv]||"").trim();
  if(!/^md:_share\/[^\s"'`;\\]+$/.test(motherduckShareUrl))throw new Error(`Missing or invalid MotherDuck share configured for dataset ${dataset.key}`);
  const serviceAccountUsername=configuredValue(env,dataset.motherduck.serviceAccountEnv,dataset.motherduck.serviceAccountDefault);
  if(!/^[A-Za-z0-9][A-Za-z0-9._@-]{0,127}$/.test(serviceAccountUsername))throw new Error(`Missing or invalid MotherDuck service account configured for dataset ${dataset.key}`);
  return {key:dataset.key,title:dataset.title,contractVersion:dataset.contractVersion,motherduckDatabase,motherduckShareUrl,serviceAccountUsername};
}

export function datasetContractPrompt(dataset:DatasetDefinition){return JSON.stringify(dataset.contract,null,2);}
export function datasetReportPolicyPrompt(dataset:DatasetDefinition){return JSON.stringify(dataset.reportPolicy,null,2);}

export type WorkspaceDatasetContext={dataset:RegisteredDataset;runtime:DatasetRuntime;starterKey:string};

export function datasetContextForWorkspaceDive(
  diveIds:Record<string,string>,
  diveId:string,
  env:Record<string,string|undefined>=process.env,
):WorkspaceDatasetContext|null{
  const starterEntry=Object.entries(diveIds).find(([,ownedDiveId])=>ownedDiveId===diveId);
  if(!starterEntry)return null;
  const dataset=datasetForStarterKey(starterEntry[0]);
  if(!dataset)return null;
  return {dataset,runtime:resolveDatasetRuntime(dataset,env),starterKey:starterEntry[0]};
}

export function datasetContextForWorkspaceDiveRecord(
  ownership:{dataset_key:string;starter_key:string},
  env:Record<string,string|undefined>=process.env,
):WorkspaceDatasetContext|null{
  const dataset=datasetByKey(ownership.dataset_key);
  if(!dataset||!dataset.starters.some(starter=>starter.key===ownership.starter_key))return null;
  return {dataset,runtime:resolveDatasetRuntime(dataset,env),starterKey:ownership.starter_key};
}
