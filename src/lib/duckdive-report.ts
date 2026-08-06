import {z} from "zod";
import type {DatasetPublicContract} from "./datasets";

export const capabilitySchema=z.object({id:z.string().regex(/^[a-z][a-z0-9-]*$/),label:z.string().trim().min(1).max(160),examples:z.array(z.string().trim().min(1).max(240)).max(8)});
export const assumptionSchema=z.object({id:z.string().trim().min(1).max(80),label:z.string().trim().min(1).max(200),explanation:z.string().trim().max(500).optional(),source:z.enum(["user-request","data-contract","report-default","model-inference"]),material:z.boolean()});
export const validationResultSchema=z.object({id:z.string().trim().min(1).max(80),label:z.string().trim().min(1).max(200),status:z.enum(["passed","warning","failed"]),detail:z.string().trim().max(500).optional()});
const limitationSchema=z.object({id:z.string().regex(/^[a-z][a-z0-9-]*$/),label:z.string().trim().min(1).max(160),reason:z.string().trim().min(1).max(300)});
const changeSetSchema=z.object({added:z.array(z.string().trim().min(1).max(240)).max(20),changed:z.array(z.string().trim().min(1).max(240)).max(20),removed:z.array(z.string().trim().min(1).max(240)).max(20),unchanged:z.array(z.string().trim().min(1).max(240)).max(20)});
export const reportPurposeSchema=z.object({title:z.string().trim().min(1).max(200),summary:z.string().trim().min(1).max(500),goal:z.string().trim().min(1).max(500),scope:z.object({locations:z.array(z.string().trim().min(1).max(120)).max(20).optional(),propertyTypes:z.array(z.string().trim().min(1).max(120)).max(10).optional(),dateRange:z.object({start:z.string().trim().min(1).max(30),end:z.string().trim().min(1).max(30),basis:z.enum(["calendar-year","financial-year","rolling-period"])}).optional()}),focusAreas:z.array(z.string().trim().min(1).max(160)).max(12),capabilities:z.array(capabilitySchema).max(20),limitations:z.array(limitationSchema).max(20),assumptions:z.array(assumptionSchema).max(30),confidence:z.object({level:z.enum(["high","medium","low"]),reason:z.string().trim().max(500).optional()})});
export const reportChangeManifestSchema=z.object({request:z.string().trim().min(1).max(4_000),interpretedIntent:z.string().trim().min(1).max(500),requested:changeSetSchema,applied:changeSetSchema,validations:z.array(validationResultSchema).max(20),version:z.number().int().min(1),generatedAt:z.string().datetime()});

export const reportUpdatePlanSchema=z.object({request:z.string().trim().min(1).max(4_000),interpretedIntent:z.string().trim().min(1).max(500),purpose:reportPurposeSchema,capabilityIds:z.array(z.string().trim().min(1).max(80)).max(20),unsupportedRequests:z.array(z.string().trim().min(1).max(240)).max(20),materialClarification:z.string().trim().max(500).nullable(),added:z.array(z.string().trim().min(1).max(240)).max(20),changed:z.array(z.string().trim().min(1).max(240)).max(20),removed:z.array(z.string().trim().min(1).max(240)).max(20),unchanged:z.array(z.string().trim().min(1).max(240)).max(20),validations:z.array(validationResultSchema).max(20)});

export type Capability= z.infer<typeof capabilitySchema>;
export type Assumption=z.infer<typeof assumptionSchema>;
export type ValidationResult=z.infer<typeof validationResultSchema>;
export type ReportPurpose=z.infer<typeof reportPurposeSchema>;
export type ReportChangeManifest=z.infer<typeof reportChangeManifestSchema>;
export type ReportUpdatePlan=z.infer<typeof reportUpdatePlanSchema>;
export type ReportVersionMetadata={workspaceId:string;diveId:string;version:number;sourceHash:string;purpose:ReportPurpose;manifest:ReportChangeManifest;runId:string|null;createdAt:string};

export type CapabilityDefinition={id:string;label:string;examples:string[];requires:(contract:DatasetPublicContract)=>boolean};

export const capabilityMap:readonly CapabilityDefinition[]=[
  {id:"sales-volume",label:"Compare sales activity",examples:["Which suburb had more sales?","Show sales volume over time"],requires:contract=>contract.measures.volume!==undefined},
  {id:"median-price",label:"Compare median sale prices",examples:["Which suburb is more expensive?","Show median price trends"],requires:contract=>contract.measures.price!==undefined},
  {id:"price-trends",label:"Compare price and volume trends",examples:["How have price and sales volume changed?"],requires:contract=>Boolean(contract.dimensions.find(item=>item.includes("month")||item.includes("year")))},
  {id:"suburb-comparison",label:"Compare locations",examples:["Compare Yarraville with Seddon","Which suburb is growing faster?"],requires:contract=>Boolean(contract.dimensions.find(item=>item.startsWith("suburb")))},
  {id:"bedroom-segments",label:"Compare bedroom segments",examples:["Compare four-bedroom homes","Show the most common bedroom count"],requires:contract=>Boolean(contract.dimensions.find(item=>item.startsWith("bedrooms")))},
  {id:"land-statistics",label:"Compare land size and land signals",examples:["Compare median land size"],requires:contract=>contract.measures.land!==undefined},
  {id:"sales-velocity",label:"Compare recent sales momentum",examples:["Which suburb has stronger sales momentum?"],requires:contract=>contract.measures.salesVelocity!==undefined},
];

const limitationDefaults=[{id:"no-valuations",label:"Current property valuations",reason:"The active contract contains completed sales history, not current valuations."},{id:"no-rental-data",label:"Rental prices",reason:"The active contract contains completed sales only."},{id:"no-forecasts",label:"Forecast prices",reason:"The active contract is descriptive historical data, not a forecasting model."},{id:"no-external-context",label:"School quality, crime rates, and population growth",reason:"These external context fields are not present in the active contract."}];

export function capabilitiesForContract(contract:DatasetPublicContract){return capabilityMap.filter(item=>item.requires(contract)).map(({id,label,examples})=>({id,label,examples}));}

export function reportPurposeForStarter(input:{starterKey:string;title:string;description:string;contract:DatasetPublicContract}):ReportPurpose{
  const capabilities=capabilitiesForContract(input.contract);
  return {title:input.title,summary:input.description,goal:input.description,scope:{propertyTypes:["Detached houses"]},focusAreas:capabilities.slice(0,4).map(item=>item.label),capabilities,limitations:limitationDefaults,assumptions:[{id:"price-validity",label:"Reported prices use the governed validity rules",explanation:input.contract.caveats.find(item=>item.toLowerCase().includes("price")),source:"data-contract",material:true},{id:"volume-includes-unpriced",label:"Unpriced sales remain in sales volume",source:"data-contract",material:true}],confidence:{level:"high"}};
}

export function validateReportUpdatePlan(plan:unknown,contract:DatasetPublicContract){
  const parsed=reportUpdatePlanSchema.safeParse(plan);if(!parsed.success)return {ok:false as const,error:"The structured report plan is invalid",plan:null};
  const supported=new Set(capabilitiesForContract(contract).map(item=>item.id));
  if(parsed.data.capabilityIds.some(id=>!supported.has(id)))return {ok:false as const,error:"The report plan requested an unavailable capability",plan:parsed.data};
  if(parsed.data.validations.some(item=>item.status==="failed"))return {ok:false as const,error:"The report plan did not pass contract validation",plan:parsed.data};
  const inferred=parsed.data.purpose.assumptions.some(item=>item.material&&(item.source==="model-inference"||item.source==="report-default"));
  const confidence=inferred?{level:"medium" as const,reason:"A material default or model inference affects the interpretation."}:parsed.data.purpose.confidence;
  return {ok:true as const,error:null,plan:{...parsed.data,purpose:{...parsed.data.purpose,confidence}}};
}

export function manifestForPlan(plan:ReportUpdatePlan,version:number,applied:ReportChangeManifest["applied"],generatedAt=new Date().toISOString()):ReportChangeManifest{return {request:plan.request,interpretedIntent:plan.interpretedIntent,requested:{added:plan.added,changed:plan.changed,removed:plan.removed,unchanged:plan.unchanged},applied,validations:plan.validations,version,generatedAt};}
