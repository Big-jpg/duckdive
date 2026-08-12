import {describe,expect,it} from "vitest";
import {VIC_HOUSING_DATASET} from "./datasets";
import type {DatasetReportPolicy} from "./dataset-types";
import {capabilitiesForPolicy,duckDiveReportValidationEnabled,normalizeReportPurpose,reportPurposeForStarter,reportUpdatePlanSchema,validateReportUpdatePlan} from "./duckdive-report";
import {reportMetadataSchemaUnavailable,starterReportVersion} from "./duckdive-report-db";

const policy=VIC_HOUSING_DATASET.reportPolicy;
const purpose=()=>reportPurposeForStarter({title:"Matchup",description:"Compare places",policy});

describe("DuckDive report explanation contract",()=>{
  it("derives capabilities and limitations from the active dataset policy",()=>{
    const ids=capabilitiesForPolicy(policy).map(item=>item.id);
    expect(ids).toContain("sales-volume");
    expect(ids).toContain("median-price");
    expect(ids).toContain("bedroom-segments");
    expect(purpose().limitations).toEqual(expect.arrayContaining([expect.objectContaining({id:"no-rental-data",label:"Rental prices"})]));
  });

  it("changes report policy without housing-specific report code",()=>{
    const airPolicy:DatasetReportPolicy={
      capabilities:[{id:"pollution-trend",label:"Compare pollution trends",examples:["Compare two stations"]}],
      limitations:[{id:"no-health-advice",label:"Health advice",reason:"The dataset contains readings, not clinical guidance."}],
      assumptions:[{id:"hourly-average",label:"Use hourly averages",source:"report-default",material:false}],
      scopeItems:[{id:"station",label:"Station",values:["North","South"]}],
      dateRange:{start:"2025-01-01",end:"2025-12-31",basis:"calendar-year"},
    };
    const air=reportPurposeForStarter({title:"Air quality",description:"Compare sensors",policy:airPolicy});
    expect(air).toMatchObject({schemaVersion:"report-purpose/v2",capabilities:[{id:"pollution-trend"}],limitations:[{id:"no-health-advice"}],scope:{items:[{id:"station"}],dateRange:{start:"2025-01-01",end:"2025-12-31"}}});
    expect(JSON.stringify(air)).not.toMatch(/housing|suburb|property/i);
  });

  it("normalizes legacy housing scope to generic v2 items",()=>{
    const current=purpose();
    const fields={title:current.title,summary:current.summary,goal:current.goal,focusAreas:current.focusAreas,capabilities:current.capabilities,limitations:current.limitations,assumptions:current.assumptions,confidence:current.confidence};
    const normalized=normalizeReportPurpose({...fields,scope:{locations:["Yarraville","Footscray"],propertyTypes:["House"],dateRange:{start:"2019",end:"2025",basis:"calendar-year"}}});
    expect(normalized).toMatchObject({schemaVersion:"report-purpose/v2",scope:{items:[{id:"locations",values:["Yarraville","Footscray"]},{id:"property-types",values:["House"]}],dateRange:{start:"2019",end:"2025"}}});
  });

  it("downgrades confidence deterministically when a material default is used",()=>{
    const base=purpose();
    const plan={request:"Compare houses",interpretedIntent:"Compare suburbs",purpose:{...base,assumptions:[...base.assumptions,{id:"property-type",label:"Houses means detached houses",source:"report-default" as const,material:true}]},capabilityIds:["suburb-comparison"],unsupportedRequests:[],materialClarification:null,added:[],changed:[],removed:[],unchanged:[],validations:[]};
    const result=validateReportUpdatePlan(plan,policy);
    expect(result.ok).toBe(true);
    if(result.ok)expect(result.plan.purpose.confidence).toEqual({level:"medium",reason:"A material default or model inference affects the interpretation."});
  });

  it("rejects a capability absent from the active dataset policy",()=>{
    const plan={request:"Show rentals",interpretedIntent:"Compare rentals",purpose:purpose(),capabilityIds:["rental-prices"],unsupportedRequests:["rental prices"],materialClarification:null,added:[],changed:[],removed:[],unchanged:[],validations:[]};
    expect(validateReportUpdatePlan(plan,policy).ok).toBe(false);
    expect(validateReportUpdatePlan(plan,policy,{validationEnabled:false}).ok).toBe(true);
  });

  it("can bypass failed plan validations without bypassing structural parsing",()=>{
    const plan={request:"Use brighter colours",interpretedIntent:"Increase chart contrast",purpose:purpose(),capabilityIds:[],unsupportedRequests:[],materialClarification:null,added:[],changed:["Chart colours"],removed:[],unchanged:[],validations:[{id:"palette",label:"Palette validation",status:"failed" as const,detail:"Not present in the analytical capability list"}]};
    expect(validateReportUpdatePlan(plan,policy).ok).toBe(false);
    expect(validateReportUpdatePlan(plan,policy,{validationEnabled:false}).ok).toBe(true);
    expect(validateReportUpdatePlan({},policy,{validationEnabled:false}).ok).toBe(false);
  });

  it("keeps report validation enabled unless explicitly set to false",()=>{
    expect(duckDiveReportValidationEnabled({})).toBe(true);
    expect(duckDiveReportValidationEnabled({DUCKDIVE_REPORT_VALIDATION_ENABLED:"true"})).toBe(true);
    expect(duckDiveReportValidationEnabled({DUCKDIVE_REPORT_VALIDATION_ENABLED:"false"})).toBe(false);
    expect(duckDiveReportValidationEnabled({DUCKDIVE_REPORT_VALIDATION_ENABLED:"FALSE"})).toBe(true);
  });

  it("keeps the structured plan schema machine-readable",()=>expect(reportUpdatePlanSchema.safeParse({}).success).toBe(false));

  it("can regenerate only a deterministic registered-starter explanation without persistence",()=>{
    const report=starterReportVersion({workspaceId:"workspace",diveId:"dive",version:3,sourceHash:"hash",title:"Market pulse",description:"Statewide signals",policy});
    expect(report).toMatchObject({version:3,runId:null,purpose:{schemaVersion:"report-purpose/v2",title:"Market pulse"},manifest:{version:3}});
    expect(reportMetadataSchemaUnavailable({code:"42P01"})).toBe(true);
    expect(reportMetadataSchemaUnavailable({code:"23505"})).toBe(false);
  });
});
