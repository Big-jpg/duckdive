import {createHash} from "node:crypto";
import {describe,expect,it} from "vitest";
import {
  compileOperationalQuery,
  MAX_OPERATIONAL_QUERY_LIMIT,
  OperationalRuntimePolicyError,
  reconcileRuntimeColumns,
  WHO_RUNTIME_RESOURCE_REFERENCE,
  type ResolvedOperationalRuntimeBinding,
  type RuntimeMetadata,
} from "./operational-runtime-policy";
import type {OperationalDatasetCandidateV1} from "./operational-dataset-candidate";

const binding:ResolvedOperationalRuntimeBinding={
  operationalDatasetId:"33333333-3333-4333-8333-333333333333",
  datasetKey:"dataset-"+"a".repeat(32),
  ownerUserId:"11111111-1111-4111-8111-111111111111",
  adapterKind:"motherduck-pg",
  resourceReference:WHO_RUNTIME_RESOURCE_REFERENCE,
  bindingState:"ready",
};
const columns=[
  {name:"who_region",dataType:"string"},{name:"iso3",dataType:"string"},{name:"country_name",dataType:"string"},{name:"city",dataType:"string"},
  {name:"year",dataType:"int64"},{name:"pm25_concentration",dataType:"int64"},{name:"pm10_concentration",dataType:"int64"},{name:"no2_concentration",dataType:"int64"},
  {name:"latitude",dataType:"float"},{name:"longitude",dataType:"float"},
] as const;
const contract={scope:"Air quality",entities:[{name:"ambient_air_quality",purpose:"Compare air quality",grain:"One observation",provenance:{purpose:"user-confirmed",grain:"user-confirmed"},columns:columns.map(column=>({...column,description:"",isKey:false,provenance:"declared" as const}))}],measures:[{entity:"ambient_air_quality",name:"average_pm25_concentration",description:"Average reviewed PM2.5 concentration",formatString:"0.0",provenance:"user-confirmed",semanticEvidence:{language:"DAX",executable:false,expressionFingerprint:createHash("sha256").update("AVERAGE(ambient_air_quality[pm25_concentration])").digest("hex")}}],relationships:[],caveats:[]} satisfies OperationalDatasetCandidateV1["publicContract"];
const context={userId:binding.ownerUserId,datasetKey:binding.datasetKey,binding,publicContract:contract};
const metadata:RuntimeMetadata={resourceReference:WHO_RUNTIME_RESOURCE_REFERENCE,columns};

describe("operational runtime policy",()=>{
  it("compiles an allowlisted bounded query with parameterized values",()=>{
    const compiled=compileOperationalQuery(context,{select:["country_name","average_pm25_concentration"],filters:[{column:"year",operator:"gte",value:2020},{column:"iso3",operator:"in",value:["AUS","NZL"]}],orderBy:[{field:"country_name",direction:"asc"}],limit:25});
    expect(compiled).toEqual({
      text:'SELECT "country_name", AVG("pm25_concentration") AS "average_pm25_concentration" FROM "sample_data"."who"."ambient_air_quality" WHERE "year" >= $1 AND "iso3" IN ($2, $3) GROUP BY "country_name" ORDER BY "country_name" ASC LIMIT 25',
      values:[2020,"AUS","NZL"],limit:25,
    });
    expect(compiled.text).not.toContain("AUS");expect(compiled.text).not.toContain(";");
  });

  it("fails closed for unknown fields, filters, excessive limits, and raw SQL-shaped input",()=>{
    expect(()=>compileOperationalQuery(context,{select:["vic_sale_price"]})).toThrow("not allowlisted");
    expect(()=>compileOperationalQuery(context,{select:["average_pm10_concentration"]})).toThrow("not allowlisted");
    const changedEvidence=structuredClone(contract);changedEvidence.measures[0].semanticEvidence.expressionFingerprint="c".repeat(64);
    expect(()=>compileOperationalQuery({...context,publicContract:changedEvidence},{select:["average_pm25_concentration"]})).toThrow("not allowlisted");
    expect(()=>compileOperationalQuery(context,{select:["country_name"],filters:[{column:"vic_suburb",operator:"eq",value:"Melbourne"}]})).toThrow("not allowlisted");
    expect(()=>compileOperationalQuery(context,{select:["country_name"],limit:MAX_OPERATIONAL_QUERY_LIMIT+1})).toThrow("request is invalid");
    expect(()=>compileOperationalQuery(context,{select:["country_name"],sql:"SELECT * FROM vic_house_data"})).toThrow("request is invalid");
  });

  it("makes cross-owner, cross-dataset, degraded, and revoked bindings unavailable",()=>{
    expect(()=>compileOperationalQuery({...context,userId:"another-owner"},{select:["country_name"]})).toThrow("unavailable");
    expect(()=>compileOperationalQuery({...context,datasetKey:"vic-housing"},{select:["country_name"]})).toThrow("unavailable");
    expect(()=>compileOperationalQuery({...context,binding:{...binding,bindingState:"degraded"}},{select:["country_name"]})).toThrow("unavailable");
    expect(()=>compileOperationalQuery({...context,binding:{...binding,bindingState:"revoked"}},{select:["country_name"]})).toThrow(OperationalRuntimePolicyError);
  });

  it("reconciles the reviewed WHO contract exactly",()=>{
    expect(reconcileRuntimeColumns(contract,metadata)).toEqual({status:"exact",resourceReference:WHO_RUNTIME_RESOURCE_REFERENCE,issues:[],readyEligible:true});
  });

  it("requires exact acknowledgement for a column variance and never acknowledges another resource",()=>{
    const changed={...metadata,columns:metadata.columns.filter(column=>column.name!=="longitude")};
    const variance=reconcileRuntimeColumns(contract,changed);
    expect(variance).toMatchObject({status:"variance",readyEligible:false,issues:[{code:"column-missing:longitude",acknowledgeable:true}]});
    expect(reconcileRuntimeColumns(contract,changed,["column-missing:longitude"])).toMatchObject({status:"acknowledged-variance",readyEligible:true});
    expect(reconcileRuntimeColumns(contract,{...metadata,resourceReference:"vic_house_data.mart.suburb_monthly_sales"},["resource-mismatch"])).toMatchObject({status:"variance",readyEligible:false,issues:[{acknowledgeable:false}]});
  });
});
