import {createHash} from "node:crypto";
import {validateDatasetDraftPayload} from "./dataset-draft-contract";
import {canonicalJson,type ReviewedSemanticContractV1} from "./semantic-model-types";

export const OPERATIONAL_DATASET_CANDIDATE_SCHEMA_VERSION="operational-dataset-candidate/v1" as const;

export type OperationalDatasetCandidateV1={
  schemaVersion:typeof OPERATIONAL_DATASET_CANDIDATE_SCHEMA_VERSION;
  identity:{candidateKey:string;displayName:string;candidateFingerprint:string};
  provenance:{reviewedContractSchemaVersion:"semantic-contract/v1";reviewedContractFingerprint:string;archiveFingerprint:string;sourceFormat:"fabric-tmdl";sourceSummary:ReviewedSemanticContractV1["sourceSummary"]};
  publicContract:{
    scope:string;
    entities:{name:string;purpose:string;grain:string;provenance:{purpose:"user-confirmed";grain:"user-confirmed"};columns:{name:string;description:string;dataType:string;isKey:boolean;provenance:"declared"|"inferred"|"user-confirmed"}[]}[];
    measures:{entity:string;name:string;description:string;formatString:string;provenance:"user-confirmed";semanticEvidence:{language:"DAX";executable:false;expressionFingerprint:string}}[];
    relationships:{fromEntity:string;fromColumn:string;toEntity:string;toColumn:string;fromCardinality:string;toCardinality:string;active:boolean;crossFilteringBehavior:string;securityFilteringBehavior:string;provenance:"user-confirmed"}[];
    caveats:string[];
  };
  activation:{state:"preview-only";runtimeBinding:"unbound";sqlGenerated:false;limitations:{code:string;message:string}[]};
};

export class OperationalDatasetCandidateError extends Error{
  constructor(message:string,readonly issues:string[]=[]){super(message);this.name="OperationalDatasetCandidateError";}
}

const operationalIdentifier=/^[A-Za-z_][A-Za-z0-9_]*$/;
const compare=(left:string,right:string)=>left<right?-1:left>right?1:0;
const hash=(value:string)=>createHash("sha256").update(value).digest("hex");

function candidateFingerprintInput(candidate:OperationalDatasetCandidateV1){
  const clone=structuredClone(candidate);clone.identity.candidateFingerprint="0".repeat(64);return canonicalJson(clone);
}

function candidateKey(displayName:string,contractFingerprint:string){
  const slug=displayName.normalize("NFKD").replace(/[^A-Za-z0-9]+/g,"-").replace(/^-+|-+$/g,"").toLowerCase().slice(0,48)||"dataset";
  return `${slug}-${contractFingerprint.slice(0,12)}`;
}

function assertOperationalReferences(contract:ReviewedSemanticContractV1){
  const issues:string[]=[],entities=new Map<string,Set<string>>();
  for(const entity of contract.entities){
    if(!operationalIdentifier.test(entity.name))issues.push(`Entity ${entity.name} is not a supported operational identifier`);
    if(entities.has(entity.name)){issues.push(`Entity ${entity.name} is duplicated`);continue;}
    const columns=new Set<string>();entities.set(entity.name,columns);
    for(const column of entity.columns){
      if(!operationalIdentifier.test(column.name))issues.push(`Column ${entity.name}.${column.name} is not a supported operational identifier`);
      if(columns.has(column.name))issues.push(`Column ${entity.name}.${column.name} is duplicated`);columns.add(column.name);
    }
  }
  for(const measure of contract.measures){
    if(!operationalIdentifier.test(measure.name))issues.push(`Measure ${measure.name} is not a supported operational identifier`);
    if(!entities.has(measure.table))issues.push(`Measure ${measure.name} references an unselected entity`);
  }
  for(const relationship of contract.relationships){
    if(!entities.get(relationship.fromEntity)?.has(relationship.fromColumn))issues.push(`Relationship source ${relationship.fromEntity}.${relationship.fromColumn} is not selected`);
    if(!entities.get(relationship.toEntity)?.has(relationship.toColumn))issues.push(`Relationship target ${relationship.toEntity}.${relationship.toColumn} is not selected`);
  }
  if(issues.length)throw new OperationalDatasetCandidateError("The reviewed contract cannot form an operational preview",issues);
}

export function compileOperationalDatasetCandidate(value:unknown):OperationalDatasetCandidateV1{
  const validated=validateDatasetDraftPayload(value);
  if(!validated.ok)throw new OperationalDatasetCandidateError(validated.error,validated.issues);
  const contract=validated.contract;assertOperationalReferences(contract);
  const diagnostics=[...contract.diagnostics].sort((a,b)=>compare(`${a.code}\0${a.message}`,`${b.code}\0${b.message}`));
  const limitations=[
    ...(contract.measures.length?[{code:"dax-semantic-evidence-only",message:"Reviewed DAX is retained as semantic evidence and is not executable DuckDB SQL."}]:[]),
    ...(contract.securitySummary?[{code:"security-summary-not-enforced",message:"The reviewed security summary is evidence only; no runtime policy is bound."}]:[]),
    ...(contract.sourceSummary!=="Import"?[{code:"source-mode-not-bound",message:`${contract.sourceSummary} connectivity is not activated by this preview.`}]:[]),
    ...diagnostics.map(item=>({code:`review-diagnostic:${item.code}`,message:item.message})),
  ];
  const candidate:OperationalDatasetCandidateV1={
    schemaVersion:OPERATIONAL_DATASET_CANDIDATE_SCHEMA_VERSION,
    identity:{candidateKey:candidateKey(contract.identity.displayName,contract.identity.contractFingerprint),displayName:contract.identity.displayName,candidateFingerprint:"0".repeat(64)},
    provenance:{reviewedContractSchemaVersion:contract.schemaVersion,reviewedContractFingerprint:contract.identity.contractFingerprint,archiveFingerprint:contract.identity.archiveFingerprint,sourceFormat:contract.identity.sourceFormat,sourceSummary:contract.sourceSummary},
    publicContract:{
      scope:contract.entities.map(entity=>entity.purpose).sort(compare).join(" "),
      entities:contract.entities.map(entity=>({name:entity.name,purpose:entity.purpose,grain:entity.grain,provenance:entity.provenance,columns:entity.columns.map(column=>({name:column.name,description:column.description,dataType:column.dataType,isKey:column.isKey,provenance:column.provenance})).sort((a,b)=>compare(a.name,b.name))})).sort((a,b)=>compare(a.name,b.name)),
      measures:contract.measures.map(measure=>({entity:measure.table,name:measure.name,description:measure.description,formatString:measure.formatString,provenance:measure.provenance,semanticEvidence:{language:"DAX" as const,executable:false as const,expressionFingerprint:hash(measure.dax)}})).sort((a,b)=>compare(`${a.entity}\0${a.name}`,`${b.entity}\0${b.name}`)),
      relationships:contract.relationships.map(relationship=>({fromEntity:relationship.fromEntity,fromColumn:relationship.fromColumn,toEntity:relationship.toEntity,toColumn:relationship.toColumn,fromCardinality:relationship.fromCardinality,toCardinality:relationship.toCardinality,active:relationship.active,crossFilteringBehavior:relationship.crossFilteringBehavior,securityFilteringBehavior:relationship.securityFilteringBehavior,provenance:relationship.provenance})).sort((a,b)=>compare(`${a.fromEntity}\0${a.fromColumn}\0${a.toEntity}\0${a.toColumn}`,`${b.fromEntity}\0${b.fromColumn}\0${b.toEntity}\0${b.toColumn}`)),
      caveats:diagnostics.map(item=>item.message),
    },
    activation:{state:"preview-only",runtimeBinding:"unbound",sqlGenerated:false,limitations},
  };
  candidate.identity.candidateFingerprint=hash(candidateFingerprintInput(candidate));return candidate;
}
