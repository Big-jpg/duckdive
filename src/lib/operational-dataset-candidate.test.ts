import {describe,expect,it} from "vitest";
import {expectedSemanticContractFingerprint} from "./dataset-draft-contract";
import {compileOperationalDatasetCandidate,OperationalDatasetCandidateError} from "./operational-dataset-candidate";
import type {ReviewedSemanticContractV1} from "./semantic-model-types";

function whoContract():ReviewedSemanticContractV1{
  const value:ReviewedSemanticContractV1={
    schemaVersion:"semantic-contract/v1",
    identity:{displayName:"WHO ambient air quality",sourceFormat:"fabric-tmdl",archiveFingerprint:"a".repeat(64),contractFingerprint:"0".repeat(64)},
    entities:[{name:"ambient_air_quality",description:"Historical air-quality observations published by the World Health Organization.",purpose:"Compare recorded pollutant concentrations across places and years.",grain:"One published air-quality observation for a city and measurement year.",provenance:{purpose:"user-confirmed",grain:"user-confirmed"},columns:[
      {name:"who_region",description:"WHO region",dataType:"string",isHidden:false,isKey:false,provenance:"declared"},
      {name:"iso3",description:"ISO country code",dataType:"string",isHidden:false,isKey:false,provenance:"declared"},
      {name:"country_name",description:"Country",dataType:"string",isHidden:false,isKey:false,provenance:"declared"},
      {name:"city",description:"City",dataType:"string",isHidden:false,isKey:false,provenance:"declared"},
      {name:"year",description:"Measurement year",dataType:"int64",isHidden:false,isKey:false,provenance:"declared"},
      {name:"pm25_concentration",description:"PM2.5 concentration",dataType:"int64",isHidden:false,isKey:false,provenance:"declared"},
      {name:"pm10_concentration",description:"PM10 concentration",dataType:"int64",isHidden:false,isKey:false,provenance:"declared"},
      {name:"no2_concentration",description:"NO2 concentration",dataType:"int64",isHidden:false,isKey:false,provenance:"declared"},
      {name:"latitude",description:"Latitude",dataType:"float",isHidden:false,isKey:false,provenance:"declared"},
      {name:"longitude",description:"Longitude",dataType:"float",isHidden:false,isKey:false,provenance:"declared"},
    ]}],
    measures:[{table:"ambient_air_quality",name:"average_pm25_concentration",description:"Average reviewed PM2.5 concentration",dax:"AVERAGE(ambient_air_quality[pm25_concentration])",formatString:"0.0",provenance:"user-confirmed"}],
    relationships:[],sourceSummary:"Import",diagnostics:[{code:"hierarchy-present",message:"A hierarchy is reviewed but not persisted.",acknowledged:true}],
  };
  value.identity.contractFingerprint=expectedSemanticContractFingerprint(value);return value;
}

describe("operational dataset candidate compiler",()=>{
  it("compiles the WHO fixture deterministically without creating executable SQL",()=>{
    const contract=whoContract(),first=compileOperationalDatasetCandidate(contract),second=compileOperationalDatasetCandidate(structuredClone(contract));
    expect(second).toEqual(first);expect(first.identity.candidateKey).toMatch(/^who-ambient-air-quality-[a-f0-9]{12}$/);
    expect(first.publicContract.entities[0].columns.map(column=>column.name)).toContain("pm25_concentration");
    expect(first.publicContract.measures[0].semanticEvidence).toMatchObject({language:"DAX",executable:false});
    expect(first.activation).toMatchObject({state:"preview-only",runtimeBinding:"unbound",sqlGenerated:false});
    expect(first.activation.limitations.map(item=>item.code)).toEqual(["dax-semantic-evidence-only","review-diagnostic:hierarchy-present"]);
  });

  it("preserves provenance but omits reviewed DAX text and raw content",()=>{
    const contract=whoContract(),candidate=compileOperationalDatasetCandidate(contract),serialized=JSON.stringify(candidate);
    expect(candidate.provenance.reviewedContractFingerprint).toBe(contract.identity.contractFingerprint);
    expect(candidate.provenance.archiveFingerprint).toBe(contract.identity.archiveFingerprint);
    expect(serialized).not.toContain("AVERAGE(");expect(serialized).not.toContain("rawTmdl");expect(serialized).not.toContain("connectionString");
  });

  it("rejects changed fingerprints, connectivity detail, and unsupported identifiers",()=>{
    const changed=whoContract();changed.entities[0].grain="Changed after review";
    expect(()=>compileOperationalDatasetCandidate(changed)).toThrow("fingerprint");
    const unsafe=whoContract();unsafe.entities[0].description="https://private.example/model";unsafe.identity.contractFingerprint=expectedSemanticContractFingerprint(unsafe);
    expect(()=>compileOperationalDatasetCandidate(unsafe)).toThrow("prohibited connectivity");
    const identifier=whoContract();identifier.entities[0].columns[0].name="who region";identifier.identity.contractFingerprint=expectedSemanticContractFingerprint(identifier);
    expect(()=>compileOperationalDatasetCandidate(identifier)).toThrow(OperationalDatasetCandidateError);
  });

  it("fails closed when a reviewed relationship references an unselected column",()=>{
    const contract=whoContract();contract.relationships=[{fromEntity:"ambient_air_quality",fromColumn:"missing_key",toEntity:"ambient_air_quality",toColumn:"iso3",fromCardinality:"many",toCardinality:"one",active:true,crossFilteringBehavior:"oneDirection",securityFilteringBehavior:"none",provenance:"user-confirmed"}];contract.identity.contractFingerprint=expectedSemanticContractFingerprint(contract);
    expect(()=>compileOperationalDatasetCandidate(contract)).toThrow("cannot form an operational preview");
  });

  it("preserves a reviewed relationship between selected operational columns",()=>{
    const contract=whoContract();contract.relationships=[{fromEntity:"ambient_air_quality",fromColumn:"iso3",toEntity:"ambient_air_quality",toColumn:"country_name",fromCardinality:"many",toCardinality:"one",active:true,crossFilteringBehavior:"oneDirection",securityFilteringBehavior:"none",provenance:"user-confirmed"}];contract.identity.contractFingerprint=expectedSemanticContractFingerprint(contract);
    expect(compileOperationalDatasetCandidate(contract).publicContract.relationships).toEqual([{fromEntity:"ambient_air_quality",fromColumn:"iso3",toEntity:"ambient_air_quality",toColumn:"country_name",fromCardinality:"many",toCardinality:"one",active:true,crossFilteringBehavior:"oneDirection",securityFilteringBehavior:"none",provenance:"user-confirmed"}]);
  });
});
