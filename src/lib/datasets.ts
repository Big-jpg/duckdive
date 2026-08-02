import {duckDiveContract} from "./duckdive-contract";

export type DatasetDefinition={
  key:string;
  title:string;
  description:string;
  kind:"historical"|"near-real-time";
  contractVersion:string;
  contract:unknown;
  starterKeys:readonly string[];
  motherduck:{databaseEnv:string;databaseDefault:string;serviceAccountEnv:string;serviceAccountDefault:string};
  capabilities:{agentQuery:boolean;editing:boolean;publicShare:boolean};
};

export const VIC_HOUSING_DATASET={
  key:"vic-housing",
  title:"VIC Housing",
  description:"Completed Victorian detached-house sales with governed price, land and volume semantics.",
  kind:"historical",
  contractVersion:"vic-housing/v1",
  contract:duckDiveContract,
  starterKeys:["market-pulse","suburb-story","market-matchup"],
  motherduck:{
    databaseEnv:"MOTHERDUCK_DATABASE",
    databaseDefault:"vic_house_data",
    serviceAccountEnv:"MOTHERDUCK_SHARED_SERVICE_ACCOUNT_USERNAME",
    serviceAccountDefault:"vic_house_lab",
  },
  capabilities:{agentQuery:true,editing:true,publicShare:true},
} as const satisfies DatasetDefinition;

export const DATASETS=[VIC_HOUSING_DATASET] as const;
export type RegisteredDataset=(typeof DATASETS)[number];

export function validateDatasetRegistry(datasets:readonly DatasetDefinition[]){
  const datasetKeys=new Set<string>(),starterKeys=new Set<string>();
  for(const dataset of datasets){
    if(!/^[a-z][a-z0-9-]*$/.test(dataset.key))throw new Error(`Invalid dataset key: ${dataset.key}`);
    if(datasetKeys.has(dataset.key))throw new Error(`Duplicate dataset key: ${dataset.key}`);
    datasetKeys.add(dataset.key);
    if(!dataset.starterKeys.length)throw new Error(`Dataset ${dataset.key} must register at least one starter`);
    for(const starterKey of dataset.starterKeys){
      if(starterKeys.has(starterKey))throw new Error(`Duplicate starter key: ${starterKey}`);
      starterKeys.add(starterKey);
    }
  }
}

validateDatasetRegistry(DATASETS);

export type DatasetRuntime={
  key:string;
  title:string;
  contractVersion:string;
  motherduckDatabase:string;
  serviceAccountUsername:string;
};

export type WorkspaceDatasetContext={
  dataset:RegisteredDataset;
  runtime:DatasetRuntime;
  starterKey:string;
};

function configuredValue(env:Record<string,string|undefined>,name:string,fallback:string){
  return (env[name]||fallback).trim();
}

export function datasetByKey(key:string){
  return DATASETS.find(dataset=>dataset.key===key)||null;
}

export function datasetForStarterKey(starterKey:string){
  return DATASETS.find(dataset=>dataset.starterKeys.some(registeredKey=>registeredKey===starterKey))||null;
}

export function resolveDatasetRuntime(dataset:DatasetDefinition,env:Record<string,string|undefined>=process.env):DatasetRuntime{
  const motherduckDatabase=configuredValue(env,dataset.motherduck.databaseEnv,dataset.motherduck.databaseDefault);
  if(!/^[a-z][a-z0-9_]*$/.test(motherduckDatabase))throw new Error(`Invalid MotherDuck database configured for dataset ${dataset.key}`);
  const serviceAccountUsername=configuredValue(env,dataset.motherduck.serviceAccountEnv,dataset.motherduck.serviceAccountDefault);
  if(!serviceAccountUsername)throw new Error(`Missing MotherDuck service account configured for dataset ${dataset.key}`);
  return {key:dataset.key,title:dataset.title,contractVersion:dataset.contractVersion,motherduckDatabase,serviceAccountUsername};
}

export function datasetContractPrompt(dataset:DatasetDefinition){
  return JSON.stringify(dataset.contract,null,2);
}

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
  if(!dataset||!dataset.starterKeys.some(starterKey=>starterKey===ownership.starter_key))return null;
  return {dataset,runtime:resolveDatasetRuntime(dataset,env),starterKey:ownership.starter_key};
}
