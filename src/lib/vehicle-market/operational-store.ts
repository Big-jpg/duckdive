import {randomUUID} from "node:crypto";
import {database} from "../db";
import {sourceScopeFingerprint} from "./autotrader-adapter";
import {VEHICLE_MARKET_ADAPTER_VERSION,VEHICLE_MARKET_MODEL_VERSION,VEHICLE_MARKET_PARSER_VERSION,VEHICLE_MARKET_SCHEMA_VERSION,valueHash,type ProcessedVehicleMarketRun} from "./contracts";
import type {PublishedVehicleMarketRun} from "./motherduck-publisher";

function connectionUrl(){
  const value=process.env.DATABASE_URL_UNPOOLED??process.env.DATABASE_URL;
  if(!value)throw new Error("HUMAN ACTION REQUIRED\n\nPurpose:\nRecord vehicle-market lineage in the existing DuckDive Neon control plane.\n\nAction:\nApply db/019_vehicle_market_ingestion.sql and provide DATABASE_URL_UNPOOLED or DATABASE_URL through the ignored operator environment.\n\nThen reply:\nready");
  return value;
}

export async function persistVehicleMarketOperationalRun(run:ProcessedVehicleMarketRun){
  const sql=database(connectionUrl(),process.env.DATABASE_URL_UNPOOLED?"DATABASE_URL_UNPOOLED":"DATABASE_URL"),scopeFingerprint=sourceScopeFingerprint(run.scope),startedAt=run.requestAttempts[0]?.requestedAt??`${run.observationDate}T00:00:00.000Z`,completedAt=run.requestAttempts.at(-1)?.completedAt??startedAt,quality=run.quality;
  try{return await sql.begin(async tx=>{
    const [inserted]=await tx<{run_id:string}[]>`INSERT INTO ops.vehicle_market_ingestion_run(
      run_id,source,market,observation_date,scope_version,scope,scope_fingerprint,source_total_start,source_total_end,pages_expected,pages_fetched,raw_hits,unique_listing_ids,duplicate_hits,scope_violations,vehicle_class_profile,missing_vehicle_class,adapter_version,parser_version,schema_version,model_version,status,collection_duration_ms,error_summary,started_at,completed_at
    ) VALUES(
      ${run.runId}::uuid,'autotrader','wa-used',${run.observationDate}::date,${run.scope.scopeVersion},${tx.json(run.scope as never)},${scopeFingerprint},${quality.sourceTotalStart},${quality.sourceTotalEnd},${quality.pagesExpected},${quality.pagesFetched},${quality.rawHits},${quality.uniqueListingIds},${quality.duplicateHits},${quality.scopeViolations},${tx.json(quality.vehicleClassProfile as never)},${quality.missingVehicleClass},${VEHICLE_MARKET_ADAPTER_VERSION},${VEHICLE_MARKET_PARSER_VERSION},${VEHICLE_MARKET_SCHEMA_VERSION},${VEHICLE_MARKET_MODEL_VERSION},${quality.runStatus},${quality.collectionDurationMs},${tx.json([...quality.errors,...quality.warnings].slice(0,20) as never)},${startedAt}::timestamptz,${completedAt}::timestamptz
    ) ON CONFLICT(run_id) DO NOTHING RETURNING run_id`;
    const [existing]=await tx<{scope_fingerprint:string;status:string;raw_hits:number;unique_listing_ids:number}[]>`SELECT scope_fingerprint,status,raw_hits,unique_listing_ids FROM ops.vehicle_market_ingestion_run WHERE run_id=${run.runId}::uuid`;
    if(!existing||existing.scope_fingerprint!==scopeFingerprint||existing.status!==quality.runStatus||Number(existing.raw_hits)!==quality.rawHits||Number(existing.unique_listing_ids)!==quality.uniqueListingIds)throw new Error("Conflicting operational lineage for vehicle-market run");

    const rawIds=new Map<string,string>();
    for(const page of run.rawPages){
      const rawObjectId=randomUUID();
      await tx`INSERT INTO ops.vehicle_market_raw_object(raw_object_id,run_id,object_reference,payload_sha256,response_bytes,persisted_at) VALUES(${rawObjectId}::uuid,${run.runId}::uuid,${page.objectPath},${page.payloadSha256},${page.responseBytes},${page.responseReceivedAt}::timestamptz) ON CONFLICT(object_reference) DO NOTHING`;
      const [raw]=await tx<{raw_object_id:string;payload_sha256:string;response_bytes:number}[]>`SELECT raw_object_id,payload_sha256,response_bytes FROM ops.vehicle_market_raw_object WHERE object_reference=${page.objectPath}`;
      if(!raw||raw.payload_sha256!==page.payloadSha256||Number(raw.response_bytes)!==page.responseBytes)throw new Error("Conflicting immutable raw-object lineage");
      rawIds.set(page.objectPath,raw.raw_object_id);
    }
    for(const attempt of run.requestAttempts){
      const page=run.rawPages.find(item=>item.requestRole===attempt.requestRole&&item.pageNumber===attempt.pageNumber&&item.attemptNumber===attempt.attemptNumber),rawObjectId=attempt.objectPath?rawIds.get(attempt.objectPath)??null:null,parameters=Object.fromEntries(new URL(attempt.requestUrl).searchParams);
      await tx`INSERT INTO ops.vehicle_market_ingestion_request(request_id,run_id,request_role,page_number,attempt_number,request_url,request_parameters,requested_at,response_received_at,duration_ms,http_status,raw_object_id,source_current_page,source_last_page,source_total,source_returned,network_error_code) VALUES(${randomUUID()}::uuid,${run.runId}::uuid,${attempt.requestRole},${attempt.pageNumber},${attempt.attemptNumber},${attempt.requestUrl},${tx.json(parameters as never)},${attempt.requestedAt}::timestamptz,${attempt.httpStatus==null?null:attempt.completedAt}::timestamptz,${attempt.durationMs},${attempt.httpStatus},${rawObjectId}::uuid,${page?.sourceCurrentPage??null},${page?.sourceLastPage??null},${page?.sourceTotal??null},${page?.sourceReturned??null},${attempt.networkErrorCode}) ON CONFLICT(run_id,request_role,page_number,attempt_number) DO NOTHING`;
    }
    if(inserted)for(const [severity,messages] of [["error",quality.errors],["warning",quality.warnings]] as const)for(const message of messages.slice(0,100))await tx`INSERT INTO ops.vehicle_market_validation_result(validation_result_id,run_id,validation_code,severity,detail) VALUES(${randomUUID()}::uuid,${run.runId}::uuid,${message.slice(0,120)},${severity},${tx.json({message:message.slice(0,1000)} as never)})`;
    return {runId:run.runId,status:quality.runStatus,rawObjects:rawIds.size,attempts:run.requestAttempts.length};
  });}finally{await sql.end();}
}

export async function persistVehicleMarketPublicationResult(result:PublishedVehicleMarketRun){
  const sql=database(connectionUrl(),process.env.DATABASE_URL_UNPOOLED?"DATABASE_URL_UNPOOLED":"DATABASE_URL"),fingerprint=valueHash({runId:result.runId,targetDatabase:"wa_vehicle_market",sourceRows:result.sourceRows,factRows:result.factRows,dimensionCounts:result.dimensionCounts,rawManifestSha256:result.rawManifestSha256});
  try{return await sql.begin(async tx=>{
    const [existing]=await tx<{source_rows:number;fact_rows:number;dimension_counts:Record<string,number>;reconciliation_fingerprint:string}[]>`SELECT source_rows,fact_rows,dimension_counts,reconciliation_fingerprint FROM ops.vehicle_market_publication_result WHERE run_id=${result.runId}::uuid AND target_database='wa_vehicle_market'`;
    if(existing){if(Number(existing.source_rows)!==result.sourceRows||Number(existing.fact_rows)!==result.factRows||existing.reconciliation_fingerprint!==fingerprint||valueHash(existing.dimension_counts)!==valueHash(result.dimensionCounts))throw new Error("Conflicting vehicle-market publication reconciliation");return {runId:result.runId,status:"reconciled",factRows:result.factRows,reconciliationFingerprint:fingerprint};}
    await tx`INSERT INTO ops.vehicle_market_publication_result(publication_result_id,run_id,target_database,status,source_rows,fact_rows,dimension_counts,reconciliation_fingerprint,started_at,completed_at) VALUES(${randomUUID()}::uuid,${result.runId}::uuid,'wa_vehicle_market','reconciled',${result.sourceRows},${result.factRows},${tx.json(result.dimensionCounts as never)},${fingerprint},now(),now())`;
    return {runId:result.runId,status:"reconciled",factRows:result.factRows,reconciliationFingerprint:fingerprint};
  });}finally{await sql.end();}
}
