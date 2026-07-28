ALTER TABLE ops.ingest_file ADD COLUMN IF NOT EXISTS source_state varchar(3);
ALTER TABLE ops.ingest_file ADD COLUMN IF NOT EXISTS source_postcode char(4);
UPDATE ops.ingest_file
SET source_state=coalesce(source_state,upper((regexp_match(file_name,'-([A-Z]{2,3})-_\d{4}_\.csv$','i'))[1]),'WA'),
    source_postcode=coalesce(source_postcode,(regexp_match(file_name,'_(\d{4})_'))[1])
WHERE source_state IS NULL OR source_postcode IS NULL;
ALTER TABLE ops.ingest_file ALTER COLUMN source_state SET NOT NULL;

ALTER TABLE core.property ALTER COLUMN state TYPE varchar(3);
ALTER TABLE core.property ALTER COLUMN state DROP DEFAULT;

CREATE OR REPLACE PROCEDURE core.curate_file(target_file_id uuid) LANGUAGE plpgsql AS $$
BEGIN
 UPDATE ops.ingest_file SET status='cleaning',error=NULL WHERE file_id=target_file_id;

 INSERT INTO core.property(canonical_address,address_fingerprint,street_address,suburb,state,postcode,first_observed_at,last_observed_at)
 SELECT address_clean,encode(digest(address_clean||'|'||source_state||'|'||coalesce(postcode,''),'sha256'),'hex'),street_address,suburb,source_state,postcode,min(scraped_at),max(scraped_at)
 FROM (
  SELECT core.normalise_address(r.address_text) address_clean,
    core.normalise_address(regexp_replace(r.address_text,',[^,]+$','')) street_address,
    initcap(trim((regexp_match(r.address_text,',\s*([^,]+?)\s*$'))[1])) suburb,
    f.source_state,
    coalesce((regexp_match(r.address_text,'\b(\d{4})\b'))[1],f.source_postcode) postcode,
    CASE WHEN r.scraped_at_source~'^\d{4}-' THEN r.scraped_at_source::timestamptz END scraped_at
  FROM raw.sale_observation r JOIN ops.ingest_file f USING(file_id)
  WHERE r.file_id=target_file_id AND r.address_text IS NOT NULL
    AND r.address_text!~*'^(address (available|withheld)|contact agent)'
 ) x
 WHERE address_clean IS NOT NULL AND street_address IS NOT NULL AND suburb IS NOT NULL
 GROUP BY address_clean,street_address,suburb,source_state,postcode
 ON CONFLICT(address_fingerprint) DO UPDATE SET
  last_observed_at=greatest(core.property.last_observed_at,excluded.last_observed_at),updated_at=now();

 WITH candidates AS (
  SELECT r.*,(regexp_match(coalesce(r.detail_path,r.detail_url),'(\d+)(?:[/?#].*)?$'))[1]::bigint listing_id,
    core.normalise_address(r.address_text) address_clean,f.source_state,
    coalesce((regexp_match(r.address_text,'\b(\d{4})\b'))[1],f.source_postcode) postcode,
    CASE WHEN r.scraped_at_source~'^\d{4}-' THEN r.scraped_at_source::timestamptz END scraped_at,
    (CASE WHEN r.price_value_source~'^\d+$' THEN 100 ELSE 0 END+CASE WHEN r.sold_date_iso_source~'^\d{4}-' THEN 80 ELSE 0 END+
     CASE WHEN r.address_text IS NOT NULL THEN 40 ELSE 0 END+CASE WHEN r.land_size_sqm_source~'^\d+$' THEN 30 ELSE 0 END+
     CASE WHEN r.property_type_source IS NOT NULL THEN 10 ELSE 0 END) quality_score
  FROM raw.sale_observation r JOIN ops.ingest_file f USING(file_id) WHERE r.file_id=target_file_id
 )
 INSERT INTO core.listing(listing_id,property_id,detail_url,selected_observation_key,first_scraped_at,last_scraped_at,observation_count)
 SELECT c.listing_id,p.property_id,coalesce(max(c.detail_url),max(c.detail_path)),
  (array_agg(c.observation_key ORDER BY c.quality_score DESC,c.scraped_at DESC NULLS LAST))[1],min(c.scraped_at),max(c.scraped_at),count(*)
 FROM candidates c LEFT JOIN core.property p
  ON p.address_fingerprint=encode(digest(c.address_clean||'|'||c.source_state||'|'||coalesce(c.postcode,''),'sha256'),'hex')
 WHERE c.listing_id IS NOT NULL GROUP BY c.listing_id,p.property_id
 ON CONFLICT(listing_id) DO UPDATE SET property_id=coalesce(excluded.property_id,core.listing.property_id),
  last_scraped_at=greatest(core.listing.last_scraped_at,excluded.last_scraped_at),
  observation_count=greatest(core.listing.observation_count,excluded.observation_count),updated_at=now();

 INSERT INTO core.sale_event(property_id,listing_id,sold_date,price_aud,property_type,bedrooms,bathrooms,car_spaces,land_size_sqm,quality_score,sale_fingerprint)
 SELECT l.property_id,l.listing_id,
  CASE WHEN r.sold_date_iso_source~'^\d{4}-\d{2}-\d{2}$' THEN r.sold_date_iso_source::date END,
  CASE WHEN r.price_value_source~'^\d+$' THEN r.price_value_source::bigint END,initcap(r.property_type_source),
  CASE WHEN r.bedrooms_source~'^\d+$' THEN r.bedrooms_source::smallint END,
  CASE WHEN r.bathrooms_source~'^\d+$' THEN r.bathrooms_source::smallint END,
  CASE WHEN r.car_spaces_source~'^\d+$' THEN r.car_spaces_source::smallint END,
  CASE WHEN r.land_size_sqm_source~'^\d+$' THEN r.land_size_sqm_source::bigint END,220,
  encode(digest(l.property_id::text||'|'||coalesce(r.sold_date_iso_source,'')||'|'||coalesce(r.price_value_source,'')||'|'||l.listing_id::text,'sha256'),'hex')
 FROM core.listing l JOIN raw.sale_observation r ON r.observation_key=l.selected_observation_key
 WHERE r.file_id=target_file_id AND l.property_id IS NOT NULL
 ON CONFLICT(sale_fingerprint) DO UPDATE SET updated_at=now();

 UPDATE ops.ingest_file SET status='curated',completed_at=now() WHERE file_id=target_file_id;
END $$;

DROP MATERIALIZED VIEW IF EXISTS mart.suburb_monthly_sales;
DROP MATERIALIZED VIEW IF EXISTS mart.suburb_dimension;

CREATE MATERIALIZED VIEW mart.suburb_dimension AS
WITH observed AS (
 SELECT lower(p.state)||'-'||trim(both '-' from regexp_replace(lower(trim(p.suburb)),'[^a-z0-9]+','-','g')) suburb_key,
  p.state,p.suburb,p.postcode,count(*)::bigint sale_count,max(s.sold_date) last_sale_date
 FROM core.sale_event s JOIN core.property p USING(property_id)
 WHERE s.sold_date>=DATE '1990-01-01' AND nullif(trim(p.suburb),'') IS NOT NULL AND lower(trim(s.property_type))='house'
 GROUP BY 1,p.state,p.suburb,p.postcode
), ranked AS (
 SELECT *,row_number() OVER(PARTITION BY suburb_key ORDER BY sale_count DESC,last_sale_date DESC NULLS LAST,postcode NULLS LAST) postcode_rank
 FROM observed
), totals AS (
 SELECT suburb_key,sum(sale_count)::bigint sale_count,
  string_agg(DISTINCT postcode,',' ORDER BY postcode) FILTER(WHERE postcode IS NOT NULL) observed_postcodes
 FROM observed GROUP BY suburb_key
)
SELECT r.suburb_key,r.state,r.suburb,r.postcode canonical_postcode,t.observed_postcodes,t.sale_count,
 round(r.sale_count::numeric/nullif(t.sale_count,0),4) postcode_confidence
FROM ranked r JOIN totals t USING(suburb_key) WHERE r.postcode_rank=1 WITH NO DATA;
CREATE UNIQUE INDEX suburb_dimension_key ON mart.suburb_dimension(suburb_key);

CREATE MATERIALIZED VIEW mart.suburb_monthly_sales AS
SELECT d.suburb_key,d.state,d.suburb,d.canonical_postcode postcode,date_trunc('month',s.sold_date)::date sale_month,
 count(*)::bigint sale_count,
 percentile_cont(.5) WITHIN GROUP(ORDER BY s.price_aud) FILTER(WHERE s.price_aud IS NOT NULL)::bigint median_price_aud,
 avg(s.price_aud) FILTER(WHERE s.price_aud IS NOT NULL)::bigint average_price_aud,
 min(s.price_aud) FILTER(WHERE s.price_aud IS NOT NULL) minimum_price_aud,
 max(s.price_aud) FILTER(WHERE s.price_aud IS NOT NULL) maximum_price_aud
FROM core.sale_event s JOIN core.property p USING(property_id)
JOIN mart.suburb_dimension d ON d.suburb_key=lower(p.state)||'-'||trim(both '-' from regexp_replace(lower(trim(p.suburb)),'[^a-z0-9]+','-','g'))
WHERE s.sold_date>=DATE '1990-01-01' AND lower(trim(s.property_type))='house'
GROUP BY d.suburb_key,d.state,d.suburb,d.canonical_postcode,date_trunc('month',s.sold_date)::date WITH NO DATA;
CREATE UNIQUE INDEX suburb_monthly_sales_key ON mart.suburb_monthly_sales(suburb_key,sale_month);
REFRESH MATERIALIZED VIEW mart.suburb_dimension;
REFRESH MATERIALIZED VIEW mart.suburb_monthly_sales;
