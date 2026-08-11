-- Replace __LOAD_ID__ with the UUID whose validated rows have been staged.
-- The application-side analytical model performs complete row-level lineage
-- comparison before this promotion; these SQL guards protect the two grains
-- whose accidental overwrite would corrupt periodic observation history.
USE wa_vehicle_market;
BEGIN TRANSACTION;

SELECT CASE WHEN EXISTS(
  SELECT 1 FROM stage.dim_observation_run source
  JOIN core.dim_observation_run target USING(run_key)
  WHERE source.load_id=CAST('__LOAD_ID__' AS UUID)
    AND (source.run_id IS DISTINCT FROM target.run_id OR source.raw_manifest_sha256 IS DISTINCT FROM target.raw_manifest_sha256)
) THEN error('Conflicting run lineage') ELSE true END;

SELECT CASE WHEN EXISTS(
  SELECT 1 FROM stage.fact_listing_observation source
  JOIN core.fact_listing_observation target USING(run_key,listing_key)
  WHERE source.load_id=CAST('__LOAD_ID__' AS UUID)
    AND (source.source_record_hash IS DISTINCT FROM target.source_record_hash OR source.raw_payload_sha256 IS DISTINCT FROM target.raw_payload_sha256 OR source.raw_object_reference IS DISTINCT FROM target.raw_object_reference)
) THEN error('Conflicting observation fact lineage') ELSE true END;

MERGE INTO core.dim_observation_run target USING (SELECT * EXCLUDE(load_id) FROM stage.dim_observation_run WHERE load_id=CAST('__LOAD_ID__' AS UUID)) source ON target.run_key=source.run_key WHEN NOT MATCHED THEN INSERT BY NAME;
MERGE INTO core.dim_listing target USING (SELECT * EXCLUDE(load_id) FROM stage.dim_listing WHERE load_id=CAST('__LOAD_ID__' AS UUID)) source ON target.listing_key=source.listing_key WHEN NOT MATCHED THEN INSERT BY NAME;
MERGE INTO core.dim_vehicle_spec target USING (SELECT * EXCLUDE(load_id) FROM stage.dim_vehicle_spec WHERE load_id=CAST('__LOAD_ID__' AS UUID)) source ON target.vehicle_spec_key=source.vehicle_spec_key WHEN NOT MATCHED THEN INSERT BY NAME;
MERGE INTO core.dim_seller_version target USING (SELECT * EXCLUDE(load_id) FROM stage.dim_seller_version WHERE load_id=CAST('__LOAD_ID__' AS UUID)) source ON target.seller_version_key=source.seller_version_key WHEN NOT MATCHED THEN INSERT BY NAME;
MERGE INTO core.dim_location target USING (SELECT * EXCLUDE(load_id) FROM stage.dim_location WHERE load_id=CAST('__LOAD_ID__' AS UUID)) source ON target.location_key=source.location_key WHEN NOT MATCHED THEN INSERT BY NAME;
MERGE INTO core.dim_listing_content target USING (SELECT * EXCLUDE(load_id) FROM stage.dim_listing_content WHERE load_id=CAST('__LOAD_ID__' AS UUID)) source ON target.content_key=source.content_key WHEN NOT MATCHED THEN INSERT BY NAME;
MERGE INTO core.fact_listing_observation target USING (SELECT * EXCLUDE(load_id) FROM stage.fact_listing_observation WHERE load_id=CAST('__LOAD_ID__' AS UUID)) source ON target.run_key=source.run_key AND target.listing_key=source.listing_key WHEN NOT MATCHED THEN INSERT BY NAME;

DELETE FROM stage.dim_observation_run WHERE load_id=CAST('__LOAD_ID__' AS UUID);
DELETE FROM stage.dim_listing WHERE load_id=CAST('__LOAD_ID__' AS UUID);
DELETE FROM stage.dim_vehicle_spec WHERE load_id=CAST('__LOAD_ID__' AS UUID);
DELETE FROM stage.dim_seller_version WHERE load_id=CAST('__LOAD_ID__' AS UUID);
DELETE FROM stage.dim_location WHERE load_id=CAST('__LOAD_ID__' AS UUID);
DELETE FROM stage.dim_listing_content WHERE load_id=CAST('__LOAD_ID__' AS UUID);
DELETE FROM stage.fact_listing_observation WHERE load_id=CAST('__LOAD_ID__' AS UUID);
COMMIT;
