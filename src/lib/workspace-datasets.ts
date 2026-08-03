import {DATASETS,datasetByKey,resolveDatasetRuntime,type DatasetDefinition} from "./datasets";
import {getOperationalDatasetByKey,listOperationalDatasets,type OperationalDatasetRow} from "./operational-datasets-db";

export type ResolvedWorkspaceDataset={
  source:"static"|"operational";key:string;title:string;contractVersion:string;publicContract:unknown;
  lifecycleState:"ready"|OperationalDatasetRow["lifecycle_state"];
  capabilities:{agentQuery:boolean;editing:boolean;publicShare:boolean};
  runtime:null|{motherduckDatabase:string;serviceAccountUsername:string};
};

function staticDataset(dataset:DatasetDefinition,env:Record<string,string|undefined>):ResolvedWorkspaceDataset{
  const runtime=resolveDatasetRuntime(dataset,env);return {source:"static",key:dataset.key,title:dataset.title,contractVersion:dataset.contractVersion,publicContract:dataset.publicContract,lifecycleState:"ready",capabilities:dataset.capabilities,runtime:{motherduckDatabase:runtime.motherduckDatabase,serviceAccountUsername:runtime.serviceAccountUsername}};
}
function operationalDataset(dataset:OperationalDatasetRow):ResolvedWorkspaceDataset{return {source:"operational",key:dataset.dataset_key,title:dataset.display_name,contractVersion:dataset.contract_version,publicContract:dataset.public_contract_json,lifecycleState:dataset.lifecycle_state,capabilities:{agentQuery:false,editing:false,publicShare:false},runtime:null};}

export async function listWorkspaceDatasets(userId:string,env:Record<string,string|undefined>=process.env){return [...DATASETS.map(dataset=>staticDataset(dataset,env)),...(await listOperationalDatasets(userId)).map(operationalDataset)];}
export async function resolveWorkspaceDataset(userId:string,datasetKey:string,env:Record<string,string|undefined>=process.env){const registered=datasetByKey(datasetKey);if(registered)return staticDataset(registered,env);const operational=await getOperationalDatasetByKey(userId,datasetKey);return operational?operationalDataset(operational):null;}
