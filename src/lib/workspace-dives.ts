import {datasetForStarterKey} from "./datasets";

export type WorkspaceDive={
  workspace_id:string;
  dataset_key:string;
  starter_key:string;
  dive_id:string;
  source_dive_id:string;
};

export type NewWorkspaceDive=Omit<WorkspaceDive,"workspace_id">;

export function buildWorkspaceDives(diveIds:Record<string,string>,sourceDiveIds:Record<string,string>):NewWorkspaceDive[]{
  const ownedKeys=Object.keys(diveIds).sort(),sourceKeys=Object.keys(sourceDiveIds).sort();
  if(JSON.stringify(ownedKeys)!==JSON.stringify(sourceKeys))throw new Error("Owned and source Dive keys must match exactly");
  const seenDiveIds=new Set<string>();
  return ownedKeys.map(starterKey=>{
    const dataset=datasetForStarterKey(starterKey),diveId=diveIds[starterKey]?.trim(),sourceDiveId=sourceDiveIds[starterKey]?.trim();
    if(!dataset)throw new Error(`Unregistered starter key: ${starterKey}`);
    if(!diveId||!sourceDiveId)throw new Error(`Missing Dive ID for starter: ${starterKey}`);
    if(seenDiveIds.has(diveId))throw new Error(`Duplicate owned Dive ID: ${diveId}`);
    seenDiveIds.add(diveId);
    return {dataset_key:dataset.key,starter_key:starterKey,dive_id:diveId,source_dive_id:sourceDiveId};
  });
}

export function workspaceDiveIds(dives:readonly WorkspaceDive[]){
  return Object.fromEntries(dives.map(dive=>[dive.starter_key,dive.dive_id]));
}

export function hasExactWorkspaceDives(dives:readonly WorkspaceDive[],starterKeys:readonly string[]){
  if(dives.length!==starterKeys.length)return false;
  const expected=new Set(starterKeys);
  return dives.every(dive=>expected.has(dive.starter_key)&&datasetForStarterKey(dive.starter_key)?.key===dive.dataset_key);
}
