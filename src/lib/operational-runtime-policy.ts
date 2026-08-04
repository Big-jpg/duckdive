import {createHash} from "node:crypto";
import {z} from "zod";
import type {OperationalDatasetCandidateV1} from "./operational-dataset-candidate";

export const WHO_RUNTIME_RESOURCE_REFERENCE="sample_data.who.ambient_air_quality" as const;
export const OPERATIONAL_RUNTIME_ADAPTER_KIND="motherduck-pg" as const;
export const DEFAULT_OPERATIONAL_QUERY_LIMIT=100;
export const MAX_OPERATIONAL_QUERY_LIMIT=500;

const identifier=/^[A-Za-z_][A-Za-z0-9_]*$/;
const scalarSchema=z.union([z.string().max(1_000),z.number().finite(),z.boolean(),z.null()]);
const filterSchema=z.discriminatedUnion("operator",[
  z.object({column:z.string(),operator:z.enum(["eq","neq","gt","gte","lt","lte"]),value:scalarSchema}).strict(),
  z.object({column:z.string(),operator:z.literal("in"),value:z.array(scalarSchema).min(1).max(100)}).strict(),
]);

export const operationalQueryRequestSchema=z.object({
  select:z.array(z.string()).min(1).max(50),
  filters:z.array(filterSchema).max(20).default([]),
  orderBy:z.array(z.object({field:z.string(),direction:z.enum(["asc","desc"])}).strict()).max(5).default([]),
  limit:z.number().int().min(1).max(MAX_OPERATIONAL_QUERY_LIMIT).default(DEFAULT_OPERATIONAL_QUERY_LIMIT),
}).strict();

export type OperationalQueryRequest=z.input<typeof operationalQueryRequestSchema>;
export type ResolvedOperationalRuntimeBinding={
  operationalDatasetId:string;
  datasetKey:string;
  ownerUserId:string;
  adapterKind:typeof OPERATIONAL_RUNTIME_ADAPTER_KIND;
  resourceReference:string;
  bindingState:"binding"|"ready"|"degraded"|"revoked";
};
export type OperationalRuntimeContext={
  userId:string;
  datasetKey:string;
  binding:ResolvedOperationalRuntimeBinding;
  publicContract:OperationalDatasetCandidateV1["publicContract"];
};
export type RuntimeColumn={name:string;dataType:string};
export type RuntimeMetadata={resourceReference:string;columns:readonly RuntimeColumn[]};
export type RuntimeReconciliationIssue={code:string;message:string;acknowledgeable:boolean};
export type RuntimeReconciliationResult={
  status:"exact"|"variance"|"acknowledged-variance";
  resourceReference:string;
  issues:readonly RuntimeReconciliationIssue[];
  readyEligible:boolean;
};
export type CompiledOperationalQuery={text:string;values:readonly (string|number|boolean|null)[];limit:number};

type RuntimeMeasure={aggregate:"avg"|"count"|"min"|"max"|"sum";column:"*"|string;evidenceFingerprint:string};
type RuntimePolicy={
  resourceReference:typeof WHO_RUNTIME_RESOURCE_REFERENCE;
  entity:string;
  dimensions:readonly string[];
  filterColumns:readonly string[];
  measures:Readonly<Record<string,RuntimeMeasure>>;
};

export const WHO_RUNTIME_POLICY:RuntimePolicy={
  resourceReference:WHO_RUNTIME_RESOURCE_REFERENCE,
  entity:"ambient_air_quality",
  dimensions:["who_region","iso3","country_name","city","year","pm25_concentration","pm10_concentration","no2_concentration","latitude","longitude"],
  filterColumns:["who_region","iso3","country_name","city","year","pm25_concentration","pm10_concentration","no2_concentration"],
  measures:{
    average_pm25_concentration:{aggregate:"avg",column:"pm25_concentration",evidenceFingerprint:createHash("sha256").update("AVERAGE(ambient_air_quality[pm25_concentration])").digest("hex")},
  },
};

export class OperationalRuntimePolicyError extends Error{
  constructor(message:string){super(message);this.name="OperationalRuntimePolicyError";}
}

function quoteIdentifier(value:string){
  if(!identifier.test(value))throw new OperationalRuntimePolicyError("Runtime policy contains an unsafe identifier");
  return `"${value}"`;
}

function quoteResourceReference(value:string){
  const parts=value.split(".");
  if(parts.length!==3||parts.some(part=>!identifier.test(part)))throw new OperationalRuntimePolicyError("Runtime resource reference is invalid");
  return parts.map(quoteIdentifier).join(".");
}

function assertRuntimeContext(context:OperationalRuntimeContext,policy:RuntimePolicy){
  const {binding}=context;
  if(binding.ownerUserId!==context.userId||binding.datasetKey!==context.datasetKey)throw new OperationalRuntimePolicyError("Operational runtime is unavailable");
  if(binding.bindingState!=="ready")throw new OperationalRuntimePolicyError("Operational runtime is unavailable");
  if(binding.adapterKind!==OPERATIONAL_RUNTIME_ADAPTER_KIND||binding.resourceReference!==policy.resourceReference)throw new OperationalRuntimePolicyError("Operational runtime is unavailable");
}

function reviewedRuntimeFields(context:OperationalRuntimeContext,policy:RuntimePolicy){
  const entity=context.publicContract.entities.find(item=>item.name===policy.entity);
  if(!entity||context.publicContract.entities.some(item=>item.name!==policy.entity))throw new OperationalRuntimePolicyError("Reviewed contract is incompatible with the runtime policy");
  return {
    dimensions:new Set(entity.columns.map(column=>column.name).filter(name=>policy.dimensions.includes(name))),
    measures:new Set(context.publicContract.measures.filter(measure=>{
      const implementation=policy.measures[measure.name];
      return measure.entity===policy.entity&&measure.semanticEvidence.executable===false&&implementation?.evidenceFingerprint===measure.semanticEvidence.expressionFingerprint;
    }).map(measure=>measure.name)),
  };
}

function selectExpression(field:string,policy:RuntimePolicy,dimensions:ReadonlySet<string>,measures:ReadonlySet<string>){
  if(dimensions.has(field))return quoteIdentifier(field);
  const measure=policy.measures[field];
  if(!measure||!measures.has(field))throw new OperationalRuntimePolicyError(`Field ${field} is not allowlisted by the reviewed contract`);
  const input=measure.column==="*"?"*":quoteIdentifier(measure.column);
  return `${measure.aggregate.toUpperCase()}(${input}) AS ${quoteIdentifier(field)}`;
}

export function compileOperationalQuery(context:OperationalRuntimeContext,value:unknown,policy:RuntimePolicy=WHO_RUNTIME_POLICY):CompiledOperationalQuery{
  assertRuntimeContext(context,policy);
  const parsed=operationalQueryRequestSchema.safeParse(value);
  if(!parsed.success)throw new OperationalRuntimePolicyError("Operational query request is invalid");
  const request=parsed.data,reviewed=reviewedRuntimeFields(context,policy),values:(string|number|boolean|null)[]=[],clauses:string[]=[];
  const selected=new Set(request.select);
  for(const filter of request.filters){
    if(!policy.filterColumns.includes(filter.column)||!reviewed.dimensions.has(filter.column))throw new OperationalRuntimePolicyError(`Filter ${filter.column} is not allowlisted by the reviewed contract`);
    const column=quoteIdentifier(filter.column);
    if(filter.operator==="in"){
      const placeholders=filter.value.map(item=>{values.push(item);return `$${values.length}`;});
      clauses.push(`${column} IN (${placeholders.join(", ")})`);
      continue;
    }
    if(filter.value===null){
      if(filter.operator!=="eq"&&filter.operator!=="neq")throw new OperationalRuntimePolicyError("Null filters support only equality");
      clauses.push(`${column} IS ${filter.operator==="neq"?"NOT ":""}NULL`);
      continue;
    }
    const operators={eq:"=",neq:"<>",gt:">",gte:">=",lt:"<",lte:"<="} as const;
    values.push(filter.value);clauses.push(`${column} ${operators[filter.operator]} $${values.length}`);
  }
  for(const order of request.orderBy){
    if(!selected.has(order.field))throw new OperationalRuntimePolicyError(`Order field ${order.field} must be selected`);
  }
  const selectedDimensions=request.select.filter(field=>reviewed.dimensions.has(field));
  const hasMeasure=request.select.some(field=>reviewed.measures.has(field));
  const group=hasMeasure&&selectedDimensions.length?` GROUP BY ${selectedDimensions.map(quoteIdentifier).join(", ")}`:"";
  const order=request.orderBy.length?` ORDER BY ${request.orderBy.map(item=>`${quoteIdentifier(item.field)} ${item.direction.toUpperCase()}`).join(", ")}`:"";
  const where=clauses.length?` WHERE ${clauses.join(" AND ")}`:"";
  const text=`SELECT ${request.select.map(field=>selectExpression(field,policy,reviewed.dimensions,reviewed.measures)).join(", ")} FROM ${quoteResourceReference(policy.resourceReference)}${where}${group}${order} LIMIT ${request.limit}`;
  return {text,values,limit:request.limit};
}

const semanticTypeAliases:Readonly<Record<string,readonly string[]>>={
  string:["varchar","text","string"],
  int64:["bigint","integer","int64","ubigint","uinteger"],
  float:["double","float","float8","real"],
  decimal:["decimal","numeric"],
  boolean:["bool","boolean"],
  date:["date"],
  datetime:["timestamp","timestamp with time zone","timestamptz"],
};

function normalizedType(value:string){return value.trim().toLowerCase().replace(/\(.+\)$/g,"");}

export function reconcileRuntimeColumns(
  contract:OperationalDatasetCandidateV1["publicContract"],
  metadata:RuntimeMetadata,
  acknowledgedIssueCodes:readonly string[]=[],
):RuntimeReconciliationResult{
  if(metadata.resourceReference!==WHO_RUNTIME_RESOURCE_REFERENCE){
    return {status:"variance",resourceReference:metadata.resourceReference,issues:[{code:"resource-mismatch",message:"Runtime metadata came from an unapproved resource",acknowledgeable:false}],readyEligible:false};
  }
  const issues:RuntimeReconciliationIssue[]=[],entity=contract.entities.find(item=>item.name===WHO_RUNTIME_POLICY.entity);
  if(!entity)issues.push({code:"entity-missing",message:`Reviewed entity ${WHO_RUNTIME_POLICY.entity} is missing`,acknowledgeable:false});
  if(contract.entities.some(item=>item.name!==WHO_RUNTIME_POLICY.entity))issues.push({code:"entity-unexpected",message:"Reviewed contract contains an entity outside the WHO runtime policy",acknowledgeable:false});
  const expected=new Map(entity?.columns.map(column=>[column.name,column.dataType])||[]),live=new Map(metadata.columns.map(column=>[column.name,column.dataType]));
  for(const [name,dataType] of expected){
    const actual=live.get(name);
    if(!actual){issues.push({code:`column-missing:${name}`,message:`Reviewed column ${name} is absent from the runtime`,acknowledgeable:true});continue;}
    const accepted=semanticTypeAliases[dataType.toLowerCase()]||[dataType.toLowerCase()];
    if(!accepted.includes(normalizedType(actual)))issues.push({code:`column-type:${name}`,message:`Reviewed column ${name} has runtime type ${actual}, expected ${dataType}`,acknowledgeable:true});
  }
  for(const name of live.keys())if(!expected.has(name))issues.push({code:`column-unexpected:${name}`,message:`Runtime column ${name} is absent from the reviewed contract`,acknowledgeable:true});
  if(!issues.length)return {status:"exact",resourceReference:metadata.resourceReference,issues,readyEligible:true};
  const acknowledged=new Set(acknowledgedIssueCodes),acknowledgedAll=issues.every(issue=>issue.acknowledgeable&&acknowledged.has(issue.code))&&acknowledged.size===issues.length;
  return {status:acknowledgedAll?"acknowledged-variance":"variance",resourceReference:metadata.resourceReference,issues,readyEligible:acknowledgedAll};
}

export interface OperationalRuntimeAdapter{
  readonly kind:typeof OPERATIONAL_RUNTIME_ADAPTER_KIND;
  inspect(resourceReference:string):Promise<RuntimeMetadata>;
  query(compiled:CompiledOperationalQuery):Promise<readonly Record<string,unknown>[]>;
}
