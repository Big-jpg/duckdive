import {createHash} from "node:crypto";
import type {OperationalDatasetCandidateV1} from "./operational-dataset-candidate";

export const WHO_RUNTIME_EXPECTED_COLUMNS=[
  {name:"who_region",dataType:"string"},{name:"iso3",dataType:"string"},{name:"country_name",dataType:"string"},{name:"city",dataType:"string"},
  {name:"year",dataType:"int64"},{name:"version",dataType:"string"},{name:"pm10_concentration",dataType:"float"},{name:"pm25_concentration",dataType:"float"},
  {name:"no2_concentration",dataType:"float"},{name:"pm10_tempcov",dataType:"float"},{name:"pm25_tempcov",dataType:"float"},{name:"no2_tempcov",dataType:"float"},
  {name:"type_of_stations",dataType:"string"},{name:"reference",dataType:"string"},{name:"web_link",dataType:"string"},{name:"population",dataType:"int64"},
  {name:"population_source",dataType:"string"},{name:"latitude",dataType:"float"},{name:"longitude",dataType:"float"},{name:"who_ms",dataType:"int64"},
] as const;

export function whoRuntimePublicContract():OperationalDatasetCandidateV1["publicContract"]{return {
  scope:"Compare World Health Organization ambient air-quality observations across places and years.",
  entities:[{name:"ambient_air_quality",purpose:"Compare recorded pollutant concentrations across places and years.",grain:"One published air-quality observation for a city and measurement year.",provenance:{purpose:"user-confirmed",grain:"user-confirmed"},columns:WHO_RUNTIME_EXPECTED_COLUMNS.map(column=>({...column,description:"",isKey:false,provenance:"declared" as const}))}],
  measures:[{entity:"ambient_air_quality",name:"average_pm25_concentration",description:"Average reviewed PM2.5 concentration",formatString:"0.0",provenance:"user-confirmed",semanticEvidence:{language:"DAX",executable:false,expressionFingerprint:createHash("sha256").update("AVERAGE(ambient_air_quality[pm25_concentration])").digest("hex")}}],
  relationships:[],caveats:[],
};}
