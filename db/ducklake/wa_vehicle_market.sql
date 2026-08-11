-- Managed MotherDuck DuckLake bootstrap. Execute only after explicit MotherDuck approval.
-- CREATE DATABASE wa_vehicle_market (TYPE DUCKLAKE);
USE wa_vehicle_market;

CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS stage;
CREATE SCHEMA IF NOT EXISTS contract;

-- DuckLake supports NOT NULL but does not enforce primary, unique, foreign-key,
-- or check constraints. The loader therefore validates identity and lineage before
-- each transaction and uses MERGE statements for deterministic idempotency.
CREATE TABLE IF NOT EXISTS core.dim_observation_run (
  run_key VARCHAR NOT NULL,
  run_id UUID NOT NULL,
  observation_date DATE NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL,
  scope_version VARCHAR NOT NULL,
  scope_fingerprint VARCHAR NOT NULL,
  source_total_start BIGINT NOT NULL,
  source_total_end BIGINT NOT NULL,
  pages_expected BIGINT NOT NULL,
  pages_fetched BIGINT NOT NULL,
  raw_hits BIGINT NOT NULL,
  unique_listing_ids BIGINT NOT NULL,
  duplicate_hits BIGINT NOT NULL,
  scope_violations BIGINT NOT NULL,
  collection_duration_ms BIGINT NOT NULL,
  run_status VARCHAR NOT NULL,
  adapter_version VARCHAR NOT NULL,
  parser_version VARCHAR NOT NULL,
  schema_version VARCHAR NOT NULL,
  model_version VARCHAR NOT NULL,
  raw_manifest_sha256 VARCHAR NOT NULL
);

CREATE TABLE IF NOT EXISTS core.dim_listing (
  listing_key VARCHAR NOT NULL,
  source VARCHAR NOT NULL,
  source_listing_id VARCHAR NOT NULL,
  source_ref_id VARCHAR,
  canonical_url VARCHAR,
  source_created_at TIMESTAMPTZ,
  first_observed_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS core.dim_vehicle_spec (
  vehicle_spec_key VARCHAR NOT NULL,
  manufacturer_year INTEGER,
  make VARCHAR,
  model VARCHAR,
  series VARCHAR,
  variant VARCHAR,
  vehicle_class VARCHAR,
  body_type VARCHAR,
  body_type_group VARCHAR,
  segment VARCHAR,
  transmission VARCHAR,
  drive_type VARCHAR,
  fuel_type VARCHAR,
  engine_size_l DOUBLE,
  cylinders INTEGER,
  power_kw DOUBLE,
  seats INTEGER,
  doors INTEGER,
  safety_rating DOUBLE
);

CREATE TABLE IF NOT EXISTS core.dim_seller_version (
  seller_version_key VARCHAR NOT NULL,
  source_dealer_id VARCHAR,
  seller_type VARCHAR,
  seller_name VARCHAR,
  seller_city VARCHAR,
  seller_state VARCHAR,
  seller_subscription VARCHAR,
  is_dealer BOOLEAN,
  is_private BOOLEAN
);

CREATE TABLE IF NOT EXISTS core.dim_location (
  location_key VARCHAR NOT NULL,
  suburb VARCHAR,
  location_state VARCHAR,
  latitude DOUBLE,
  longitude DOUBLE
);

CREATE TABLE IF NOT EXISTS core.dim_listing_content (
  content_key VARCHAR NOT NULL,
  description VARCHAR,
  feature_set_key VARCHAR NOT NULL,
  normalized_feature_terms VARCHAR[] NOT NULL,
  photo_count INTEGER,
  has_video BOOLEAN
);

CREATE TABLE IF NOT EXISTS core.fact_listing_observation (
  run_key VARCHAR NOT NULL,
  listing_key VARCHAR NOT NULL,
  vehicle_spec_key VARCHAR NOT NULL,
  seller_version_key VARCHAR NOT NULL,
  location_key VARCHAR NOT NULL,
  content_key VARCHAR NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL,
  source_updated_at TIMESTAMPTZ,
  source_status VARCHAR,
  advertised_price BIGINT,
  driveaway_price BIGINT,
  odometer_km BIGINT,
  rego_expiry DATE,
  colour VARCHAR,
  is_registered BOOLEAN,
  is_top_ad BOOLEAN,
  is_auction BOOLEAN,
  source_prior_advertised_price BIGINT,
  source_prior_price_ended_at TIMESTAMPTZ,
  source_record_hash VARCHAR NOT NULL,
  raw_payload_sha256 VARCHAR NOT NULL,
  raw_object_reference VARCHAR NOT NULL,
  raw_page_number INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS stage.dim_observation_run AS SELECT NULL::UUID AS load_id,r.* FROM core.dim_observation_run r WHERE false;
CREATE TABLE IF NOT EXISTS stage.dim_listing AS SELECT NULL::UUID AS load_id,r.* FROM core.dim_listing r WHERE false;
CREATE TABLE IF NOT EXISTS stage.dim_vehicle_spec AS SELECT NULL::UUID AS load_id,r.* FROM core.dim_vehicle_spec r WHERE false;
CREATE TABLE IF NOT EXISTS stage.dim_seller_version AS SELECT NULL::UUID AS load_id,r.* FROM core.dim_seller_version r WHERE false;
CREATE TABLE IF NOT EXISTS stage.dim_location AS SELECT NULL::UUID AS load_id,r.* FROM core.dim_location r WHERE false;
CREATE TABLE IF NOT EXISTS stage.dim_listing_content AS SELECT NULL::UUID AS load_id,r.* FROM core.dim_listing_content r WHERE false;
CREATE TABLE IF NOT EXISTS stage.fact_listing_observation AS SELECT NULL::UUID AS load_id,r.* FROM core.fact_listing_observation r WHERE false;

CREATE OR REPLACE VIEW contract.vehicle_market_history AS
SELECT
  r.run_id,r.observation_date,r.observed_at,r.run_status,r.scope_fingerprint,
  l.listing_key,l.source_listing_id,l.source_ref_id,l.canonical_url,l.source_created_at,
  date_diff('day',CAST(l.source_created_at AS DATE),r.observation_date) AS listing_age_days,
  v.vehicle_spec_key,v.manufacturer_year,v.make,v.model,v.series,v.variant,v.vehicle_class,v.body_type,v.body_type_group,v.segment,
  v.transmission,v.drive_type,v.fuel_type,v.engine_size_l,v.cylinders,v.power_kw,v.seats,v.doors,v.safety_rating,
  s.seller_version_key,s.seller_type,s.seller_name,s.seller_city,s.seller_state,s.seller_subscription,s.is_dealer,s.is_private,
  loc.suburb,loc.location_state,loc.latitude,loc.longitude,
  c.photo_count,c.has_video,c.feature_set_key,c.normalized_feature_terms,
  f.source_updated_at,f.source_status,f.advertised_price,f.driveaway_price,f.odometer_km,
  f.rego_expiry,f.colour,f.is_registered,f.is_top_ad,f.is_auction,
  f.source_prior_advertised_price,f.source_prior_price_ended_at,
  f.source_record_hash,f.raw_payload_sha256,f.raw_object_reference,f.raw_page_number
FROM core.fact_listing_observation f
JOIN core.dim_observation_run r USING(run_key)
JOIN core.dim_listing l USING(listing_key)
JOIN core.dim_vehicle_spec v USING(vehicle_spec_key)
JOIN core.dim_seller_version s USING(seller_version_key)
JOIN core.dim_location loc USING(location_key)
JOIN core.dim_listing_content c USING(content_key)
WHERE r.run_status IN ('COMPLETE','CHANGED_DURING_CAPTURE');

CREATE OR REPLACE VIEW contract.vehicle_market_current AS
WITH latest AS (
  SELECT scope_fingerprint,max(observed_at) AS observed_at
  FROM core.dim_observation_run WHERE run_status IN ('COMPLETE','CHANGED_DURING_CAPTURE') GROUP BY scope_fingerprint
)
SELECT h.*
FROM contract.vehicle_market_history h
JOIN latest l USING(scope_fingerprint,observed_at);

CREATE OR REPLACE VIEW contract.listing_lifecycle AS
SELECT listing_key,source_listing_id,min(observed_at) AS first_observed_at,max(observed_at) AS last_observed_at,
       count(DISTINCT run_id) AS complete_observations,
       arg_min(advertised_price,observed_at) AS first_observed_price,
       arg_max(advertised_price,observed_at) AS current_observed_price
FROM contract.vehicle_market_history
GROUP BY listing_key,source_listing_id;

CREATE OR REPLACE VIEW contract.listing_events AS
WITH ordered_runs AS (
  SELECT run_key,scope_fingerprint,observed_at,
         lag(run_key) OVER(PARTITION BY scope_fingerprint ORDER BY observed_at) AS prior_run_key
  FROM core.dim_observation_run WHERE run_status='COMPLETE'
), comparable AS (
  SELECT * FROM ordered_runs WHERE prior_run_key IS NOT NULL
), same_listing AS (
  SELECT c.run_key,c.prior_run_key,n.listing_key,n.observed_at,
         p.advertised_price AS prior_price,n.advertised_price AS current_price,
         p.odometer_km AS prior_odometer_km,n.odometer_km,
         p.content_key AS prior_content_key,n.content_key,
         p.seller_version_key AS prior_seller_version_key,n.seller_version_key,
         p.vehicle_spec_key AS prior_vehicle_spec_key,n.vehicle_spec_key
  FROM comparable c
  JOIN core.fact_listing_observation n ON n.run_key=c.run_key
  JOIN core.fact_listing_observation p ON p.run_key=c.prior_run_key AND p.listing_key=n.listing_key
), newly_observed AS (
  SELECT c.run_key,n.listing_key,n.observed_at,'NEWLY_OBSERVED' AS event_type,NULL::BIGINT AS prior_value,NULL::BIGINT AS current_value
  FROM comparable c JOIN core.fact_listing_observation n ON n.run_key=c.run_key
  LEFT JOIN core.fact_listing_observation p ON p.run_key=c.prior_run_key AND p.listing_key=n.listing_key
  WHERE p.listing_key IS NULL
), no_longer_observed AS (
  SELECT c.run_key,p.listing_key,c.observed_at,'NO_LONGER_OBSERVED' AS event_type,NULL::BIGINT,NULL::BIGINT
  FROM comparable c JOIN core.fact_listing_observation p ON p.run_key=c.prior_run_key
  LEFT JOIN core.fact_listing_observation n ON n.run_key=c.run_key AND n.listing_key=p.listing_key
  WHERE n.listing_key IS NULL
), changes AS (
  SELECT run_key,listing_key,observed_at,'PRICE_CHANGED' AS event_type,prior_price,current_price FROM same_listing WHERE prior_price IS DISTINCT FROM current_price
  UNION ALL SELECT run_key,listing_key,observed_at,'ODOMETER_CHANGED',prior_odometer_km,odometer_km FROM same_listing WHERE prior_odometer_km IS DISTINCT FROM odometer_km
  UNION ALL SELECT run_key,listing_key,observed_at,'CONTENT_CHANGED',NULL,NULL FROM same_listing WHERE prior_content_key IS DISTINCT FROM content_key
  UNION ALL SELECT run_key,listing_key,observed_at,'SELLER_CHANGED',NULL,NULL FROM same_listing WHERE prior_seller_version_key IS DISTINCT FROM seller_version_key
  UNION ALL SELECT run_key,listing_key,observed_at,'SPECIFICATION_CHANGED',NULL,NULL FROM same_listing WHERE prior_vehicle_spec_key IS DISTINCT FROM vehicle_spec_key
)
SELECT * FROM newly_observed UNION ALL SELECT * FROM no_longer_observed UNION ALL SELECT * FROM changes;

CREATE OR REPLACE VIEW contract.market_timeseries AS
SELECT run_id,observation_date,observed_at,run_status,scope_fingerprint,count(*) AS listing_count,
       median(advertised_price) FILTER(WHERE advertised_price IS NOT NULL) AS median_asking_price,
       median(odometer_km) FILTER(WHERE odometer_km IS NOT NULL) AS median_odometer_km
FROM contract.vehicle_market_history GROUP BY run_id,observation_date,observed_at,run_status,scope_fingerprint;

CREATE OR REPLACE VIEW contract.vehicle_screen AS
WITH cohort AS (
  SELECT c.listing_key,
         count(peer.listing_key) AS cohort_size,
         median(peer.advertised_price) AS cohort_median_asking_price,
         quantile_cont(peer.advertised_price,0.25) AS cohort_p25_asking_price,
         quantile_cont(peer.advertised_price,0.75) AS cohort_p75_asking_price,
         count(peer.listing_key) FILTER(WHERE peer.advertised_price<=c.advertised_price)::DOUBLE/nullif(count(peer.listing_key),0) AS asking_price_percentile
  FROM contract.vehicle_market_current c
  LEFT JOIN contract.vehicle_market_current peer
    ON peer.make=c.make AND peer.model=c.model
   AND peer.manufacturer_year BETWEEN c.manufacturer_year-2 AND c.manufacturer_year+2
   AND peer.advertised_price IS NOT NULL
  GROUP BY c.listing_key,c.advertised_price
)
SELECT c.*,
       cohort.cohort_size,
       CASE WHEN cohort.cohort_size>=10 THEN cohort.cohort_median_asking_price END AS cohort_median_asking_price,
       CASE WHEN cohort.cohort_size>=10 THEN cohort.cohort_p25_asking_price END AS cohort_p25_asking_price,
       CASE WHEN cohort.cohort_size>=10 THEN cohort.cohort_p75_asking_price END AS cohort_p75_asking_price,
       CASE WHEN cohort.cohort_size>=10 AND c.advertised_price IS NOT NULL THEN cohort.asking_price_percentile END AS asking_price_percentile
FROM contract.vehicle_market_current c JOIN cohort USING(listing_key);

CREATE OR REPLACE VIEW contract.observation_run_quality AS
SELECT run_id,observation_date,observed_at,scope_version,scope_fingerprint,source_total_start,source_total_end,
       pages_expected,pages_fetched,raw_hits,unique_listing_ids,duplicate_hits,scope_violations,
       collection_duration_ms,run_status,adapter_version,parser_version,schema_version,model_version,raw_manifest_sha256
FROM core.dim_observation_run;

-- See load_vehicle_market_run.sql for the transactional, idempotent promotion.
