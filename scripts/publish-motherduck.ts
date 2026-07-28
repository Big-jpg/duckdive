import postgres from "postgres";
import {database} from "../src/lib/db";
import {estateConfig} from "../src/lib/estate";
import {analyticsPolicy} from "../src/lib/analytics-contract";

const estate=estateConfig();
if(!/^[a-z][a-z0-9_]*$/.test(estate.motherduckDatabase))throw new Error("MOTHERDUCK_DATABASE must be a safe lowercase identifier");

const source=database(process.env.DATABASE_READ_URL||process.env.DATABASE_URL);
const token=process.env.MOTHERDUCK_TOKEN;
if(!token)throw new Error("MOTHERDUCK_TOKEN is required");
const target=postgres({host:process.env.MOTHERDUCK_PG_HOST||"pg.us-east-1-aws.motherduck.com",port:5432,database:`md:${estate.motherduckDatabase}`,username:"ducky",password:token,ssl:"require",max:2,prepare:false});

try{
  // Estate scope belongs at the publication boundary. Neon raw/core remain reusable.
  const dimensions=await source`WITH observed AS (
      SELECT lower(p.state)||'-'||trim(both '-' from regexp_replace(lower(trim(p.suburb)),'[^a-z0-9]+','-','g')) suburb_key,
        p.state,p.suburb,p.postcode,count(*)::bigint sale_count,max(s.sold_date) last_sale_date
      FROM core.sale_event s JOIN core.property p USING(property_id)
      WHERE s.sold_date IS NOT NULL AND nullif(trim(p.suburb),'') IS NOT NULL
        AND p.state=${estate.state} AND lower(trim(s.property_type))=lower(${estate.propertyType})
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
    FROM ranked r JOIN totals t USING(suburb_key) WHERE r.postcode_rank=1 ORDER BY r.suburb`;
  const rows=await source`WITH canonical AS (
      SELECT DISTINCT ON (lower(p.state)||'-'||trim(both '-' from regexp_replace(lower(trim(p.suburb)),'[^a-z0-9]+','-','g')))
        lower(p.state)||'-'||trim(both '-' from regexp_replace(lower(trim(p.suburb)),'[^a-z0-9]+','-','g')) suburb_key,
        p.state,p.suburb,p.postcode
      FROM core.sale_event s JOIN core.property p USING(property_id)
      WHERE s.sold_date IS NOT NULL AND nullif(trim(p.suburb),'') IS NOT NULL
        AND p.state=${estate.state} AND lower(trim(s.property_type))=lower(${estate.propertyType})
      GROUP BY p.state,p.suburb,p.postcode
      ORDER BY 1,count(*) DESC,max(s.sold_date) DESC NULLS LAST,p.postcode NULLS LAST
    )
    SELECT c.suburb_key,c.state,c.suburb,c.postcode,date_trunc('month',s.sold_date)::date sale_month,
      count(*)::bigint sale_count,count(s.price_aud)::bigint reported_priced_sales,
      count(*) FILTER(WHERE s.price_aud BETWEEN ${analyticsPolicy.priceAud.minimum} AND ${analyticsPolicy.priceAud.maximum})::bigint priced_sales,
      percentile_cont(.5) WITHIN GROUP(ORDER BY s.price_aud) FILTER(WHERE s.price_aud BETWEEN ${analyticsPolicy.priceAud.minimum} AND ${analyticsPolicy.priceAud.maximum})::bigint median_price_aud,
      avg(s.price_aud) FILTER(WHERE s.price_aud BETWEEN ${analyticsPolicy.priceAud.minimum} AND ${analyticsPolicy.priceAud.maximum})::bigint average_price_aud,
      min(s.price_aud) FILTER(WHERE s.price_aud BETWEEN ${analyticsPolicy.priceAud.minimum} AND ${analyticsPolicy.priceAud.maximum}) minimum_price_aud,
      max(s.price_aud) FILTER(WHERE s.price_aud BETWEEN ${analyticsPolicy.priceAud.minimum} AND ${analyticsPolicy.priceAud.maximum}) maximum_price_aud
    FROM core.sale_event s JOIN core.property p USING(property_id)
    JOIN canonical c ON c.suburb_key=lower(p.state)||'-'||trim(both '-' from regexp_replace(lower(trim(p.suburb)),'[^a-z0-9]+','-','g'))
    WHERE s.sold_date IS NOT NULL AND p.state=${estate.state} AND lower(trim(s.property_type))=lower(${estate.propertyType})
    GROUP BY c.suburb_key,c.state,c.suburb,c.postcode,date_trunc('month',s.sold_date)::date ORDER BY c.suburb,sale_month`;
  const facts=await source`SELECT lower(p.state)||'-'||trim(both '-' from regexp_replace(lower(trim(p.suburb)),'[^a-z0-9]+','-','g')) suburb_key,
      p.state,s.sold_date,s.price_aud,s.land_size_sqm,s.property_type,s.bedrooms,s.bathrooms,s.car_spaces
    FROM core.sale_event s JOIN core.property p USING(property_id)
    WHERE s.sold_date IS NOT NULL AND nullif(trim(p.suburb),'') IS NOT NULL
      AND p.state=${estate.state} AND lower(trim(s.property_type))=lower(${estate.propertyType})
    ORDER BY suburb_key,s.sold_date`;

  await target.begin(async tx=>{
    await tx`DROP TABLE IF EXISTS suburb_dimension_next`;
    await tx`CREATE TABLE suburb_dimension_next(suburb_key varchar,state varchar,suburb varchar,canonical_postcode varchar,observed_postcodes varchar,sale_count bigint,postcode_confidence decimal(5,4))`;
    for(let i=0;i<dimensions.length;i+=1000)await tx`INSERT INTO suburb_dimension_next ${tx(dimensions.slice(i,i+1000) as Record<string,unknown>[])}`;
    await tx`DROP TABLE IF EXISTS suburb_monthly_sales_next`;
    await tx`CREATE TABLE suburb_monthly_sales_next(suburb_key varchar,state varchar,suburb varchar,postcode varchar,sale_month date,sale_count bigint,reported_priced_sales bigint,priced_sales bigint,median_price_aud bigint,average_price_aud bigint,minimum_price_aud bigint,maximum_price_aud bigint)`;
    for(let i=0;i<rows.length;i+=1000)await tx`INSERT INTO suburb_monthly_sales_next ${tx(rows.slice(i,i+1000) as Record<string,unknown>[])}`;
    await tx`DROP TABLE IF EXISTS suburb_sale_facts_next`;
    await tx`CREATE TABLE suburb_sale_facts_next(suburb_key varchar,state varchar,sold_date date,price_aud bigint,land_size_sqm bigint,property_type varchar,bedrooms smallint,bathrooms smallint,car_spaces smallint)`;
    for(let i=0;i<facts.length;i+=4000)await tx`INSERT INTO suburb_sale_facts_next ${tx(facts.slice(i,i+4000) as Record<string,unknown>[])}`;
    await tx`DROP TABLE IF EXISTS suburb_dimension`;
    await tx`ALTER TABLE suburb_dimension_next RENAME TO suburb_dimension`;
    await tx`DROP TABLE IF EXISTS suburb_monthly_sales`;
    await tx`ALTER TABLE suburb_monthly_sales_next RENAME TO suburb_monthly_sales`;
    await tx`DROP TABLE IF EXISTS suburb_sale_facts`;
    await tx`ALTER TABLE suburb_sale_facts_next RENAME TO suburb_sale_facts`;
  });
  const shareName=`${estate.motherduckDatabase}_app`;
  await target.unsafe(`CREATE SHARE IF NOT EXISTS ${shareName} FROM ${estate.motherduckDatabase} (ACCESS RESTRICTED, VISIBILITY DISCOVERABLE, UPDATE AUTOMATIC)`);
  await target.unsafe(`GRANT READ ON SHARE ${shareName} TO ROLE explorer`);
  console.log(`published ${dimensions.length} ${estate.state} ${estate.propertyType} suburbs, ${rows.length} monthly rows, and ${facts.length} sale facts to ${estate.motherduckDatabase}`);
}finally{await source.end();await target.end();}
