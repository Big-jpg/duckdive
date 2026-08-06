import {describe,expect,it} from "vitest";
import {duckDivePublicContract} from "./duckdive-contract";
import {capabilitiesForContract,reportPurposeForStarter,reportUpdatePlanSchema,validateReportUpdatePlan} from "./duckdive-report";

describe("DuckDive report explanation contract",()=>{
  it("derives capabilities from the governed contract",()=>{
    const ids=capabilitiesForContract(duckDivePublicContract).map(item=>item.id);
    expect(ids).toContain("sales-volume");expect(ids).toContain("median-price");expect(ids).toContain("bedroom-segments");
  });

  it("uses curated limitations rather than an unbounded absent-data list",()=>{
    const purpose=reportPurposeForStarter({starterKey:"market-matchup",title:"Matchup",description:"Compare places",contract:duckDivePublicContract});
    expect(purpose.limitations).toEqual(expect.arrayContaining([expect.objectContaining({id:"no-rental-data",label:"Rental prices"})]));
  });

  it("downgrades confidence when a material default is used",()=>{
    const purpose=reportPurposeForStarter({starterKey:"market-matchup",title:"Matchup",description:"Compare places",contract:duckDivePublicContract});
    const plan={request:"Compare houses",interpretedIntent:"Compare suburbs",purpose:{...purpose,assumptions:[...purpose.assumptions,{id:"property-type",label:"Houses means detached houses",source:"report-default",material:true}]},capabilityIds:["suburb-comparison"],unsupportedRequests:[],materialClarification:null,added:[],changed:[],removed:[],unchanged:[],validations:[]};
    const result=validateReportUpdatePlan(plan,duckDivePublicContract);expect(result.ok).toBe(true);if(result.ok)expect(result.plan.purpose.confidence.level).toBe("medium");
  });

  it("rejects a capability absent from the active contract",()=>{
    const purpose=reportPurposeForStarter({starterKey:"market-matchup",title:"Matchup",description:"Compare places",contract:duckDivePublicContract});
    const plan={request:"Show rentals",interpretedIntent:"Compare rentals",purpose,capabilityIds:["rental-prices"],unsupportedRequests:["rental prices"],materialClarification:null,added:[],changed:[],removed:[],unchanged:[],validations:[]};
    expect(validateReportUpdatePlan(plan,duckDivePublicContract).ok).toBe(false);
  });

  it("keeps the structured plan schema machine-readable",()=>expect(reportUpdatePlanSchema.safeParse({}).success).toBe(false));
});
