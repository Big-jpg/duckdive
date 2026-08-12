import {z} from "zod";
import type {DatasetReportPolicy} from "./dataset-types";

export const capabilitySchema=z.object({id:z.string().regex(/^[a-z][a-z0-9-]*$/),label:z.string().trim().min(1).max(160),examples:z.array(z.string().trim().min(1).max(240)).max(8)});
export const assumptionSchema=z.object({id:z.string().trim().min(1).max(80),label:z.string().trim().min(1).max(200),explanation:z.string().trim().max(500).optional(),source:z.enum(["user-request","data-contract","report-default","model-inference"]),material:z.boolean()});
export const validationResultSchema=z.object({id:z.string().trim().min(1).max(80),label:z.string().trim().min(1).max(200),status:z.enum(["passed","warning","failed"]),detail:z.string().trim().max(500).optional()});
const limitationSchema=z.object({id:z.string().regex(/^[a-z][a-z0-9-]*$/),label:z.string().trim().min(1).max(160),reason:z.string().trim().min(1).max(300)});
const changeSetSchema=z.object({added:z.array(z.string().trim().min(1).max(240)).max(20),changed:z.array(z.string().trim().min(1).max(240)).max(20),removed:z.array(z.string().trim().min(1).max(240)).max(20),unchanged:z.array(z.string().trim().min(1).max(240)).max(20)});
const dateRangeSchema=z.object({start:z.string().trim().min(1).max(30),end:z.string().trim().min(1).max(30),basis:z.enum(["calendar-year","financial-year","rolling-period"])});
const scopeItemSchema=z.object({id:z.string().regex(/^[a-z][a-z0-9-]*$/),label:z.string().trim().min(1).max(120),values:z.array(z.string().trim().min(1).max(120)).min(1).max(20)});
const reportPurposeFields={
  title:z.string().trim().min(1).max(200),
  summary:z.string().trim().min(1).max(500),
  goal:z.string().trim().min(1).max(500),
  focusAreas:z.array(z.string().trim().min(1).max(160)).max(12),
  capabilities:z.array(capabilitySchema).max(20),
  limitations:z.array(limitationSchema).max(20),
  assumptions:z.array(assumptionSchema).max(30),
  confidence:z.object({level:z.enum(["high","medium","low"]),reason:z.string().trim().max(500).optional()}),
};

export const reportPurposeSchema=z.object({
  schemaVersion:z.literal("report-purpose/v2"),
  ...reportPurposeFields,
  scope:z.object({items:z.array(scopeItemSchema).max(20),dateRange:dateRangeSchema.optional()}),
});

const legacyReportPurposeSchema=z.object({
  ...reportPurposeFields,
  scope:z.object({locations:z.array(z.string().trim().min(1).max(120)).max(20).optional(),propertyTypes:z.array(z.string().trim().min(1).max(120)).max(10).optional(),dateRange:dateRangeSchema.optional()}),
});

export const reportChangeManifestSchema=z.object({request:z.string().trim().min(1).max(4_000),interpretedIntent:z.string().trim().min(1).max(500),requested:changeSetSchema,applied:changeSetSchema,validations:z.array(validationResultSchema).max(20),version:z.number().int().min(1),generatedAt:z.string().datetime()});
export const reportUpdatePlanSchema=z.object({request:z.string().trim().min(1).max(4_000),interpretedIntent:z.string().trim().min(1).max(500),purpose:reportPurposeSchema,capabilityIds:z.array(z.string().trim().min(1).max(80)).max(20),unsupportedRequests:z.array(z.string().trim().min(1).max(240)).max(20),materialClarification:z.string().trim().max(500).nullable(),added:z.array(z.string().trim().min(1).max(240)).max(20),changed:z.array(z.string().trim().min(1).max(240)).max(20),removed:z.array(z.string().trim().min(1).max(240)).max(20),unchanged:z.array(z.string().trim().min(1).max(240)).max(20),validations:z.array(validationResultSchema).max(20)});

export type Capability=z.infer<typeof capabilitySchema>;
export type Assumption=z.infer<typeof assumptionSchema>;
export type ValidationResult=z.infer<typeof validationResultSchema>;
export type ReportPurpose=z.infer<typeof reportPurposeSchema>;
export type ReportChangeManifest=z.infer<typeof reportChangeManifestSchema>;
export type ReportUpdatePlan=z.infer<typeof reportUpdatePlanSchema>;
export type ReportVersionMetadata={workspaceId:string;diveId:string;version:number;sourceHash:string;purpose:ReportPurpose;manifest:ReportChangeManifest;runId:string|null;createdAt:string};

export function capabilitiesForPolicy(policy:DatasetReportPolicy):Capability[]{
  return policy.capabilities.map(item=>({id:item.id,label:item.label,examples:[...item.examples]}));
}

export function reportPurposeForStarter(input:{title:string;description:string;policy:DatasetReportPolicy}):ReportPurpose{
  const capabilities=capabilitiesForPolicy(input.policy);
  return {
    schemaVersion:"report-purpose/v2",
    title:input.title,
    summary:input.description,
    goal:input.description,
    scope:{items:input.policy.scopeItems.map(item=>({id:item.id,label:item.label,values:[...item.values]})),...(input.policy.dateRange?{dateRange:{...input.policy.dateRange}}:{})},
    focusAreas:capabilities.slice(0,4).map(item=>item.label),
    capabilities,
    limitations:input.policy.limitations.map(item=>({...item})),
    assumptions:input.policy.assumptions.map(item=>({...item})),
    confidence:{level:"high"},
  };
}

export function normalizeReportPurpose(value:unknown):ReportPurpose{
  const current=reportPurposeSchema.safeParse(value);
  if(current.success)return current.data;
  const legacy=legacyReportPurposeSchema.parse(value),items:ReportPurpose["scope"]["items"]=[];
  if(legacy.scope.locations?.length)items.push({id:"locations",label:"Locations",values:legacy.scope.locations});
  if(legacy.scope.propertyTypes?.length)items.push({id:"property-types",label:"Property type",values:legacy.scope.propertyTypes});
  return {...legacy,schemaVersion:"report-purpose/v2",scope:{items,...(legacy.scope.dateRange?{dateRange:legacy.scope.dateRange}:{})}};
}

export function duckDiveReportValidationEnabled(env:Record<string,string|undefined>=process.env){
  return env.DUCKDIVE_REPORT_VALIDATION_ENABLED!=="false";
}

export function validateReportUpdatePlan(plan:unknown,policy:DatasetReportPolicy,options:{validationEnabled?:boolean}={}){
  const parsed=reportUpdatePlanSchema.safeParse(plan);if(!parsed.success)return {ok:false as const,error:"The structured report plan is invalid",plan:null};
  if(options.validationEnabled!==false){
    const supported=new Set(policy.capabilities.map(item=>item.id));
    if(parsed.data.capabilityIds.some(id=>!supported.has(id)))return {ok:false as const,error:"The report plan requested an unavailable capability",plan:parsed.data};
    if(parsed.data.validations.some(item=>item.status==="failed"))return {ok:false as const,error:"The report plan did not pass contract validation",plan:parsed.data};
  }
  const inferred=parsed.data.purpose.assumptions.some(item=>item.material&&(item.source==="model-inference"||item.source==="report-default"));
  const confidence=inferred?{level:"medium" as const,reason:"A material default or model inference affects the interpretation."}:parsed.data.purpose.confidence;
  return {ok:true as const,error:null,plan:{...parsed.data,purpose:{...parsed.data.purpose,confidence}}};
}

export function manifestForPlan(plan:ReportUpdatePlan,version:number,applied:ReportChangeManifest["applied"],generatedAt=new Date().toISOString()):ReportChangeManifest{return {request:plan.request,interpretedIntent:plan.interpretedIntent,requested:{added:plan.added,changed:plan.changed,removed:plan.removed,unchanged:plan.unchanged},applied,validations:plan.validations,version,generatedAt};}
