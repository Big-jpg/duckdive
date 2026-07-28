import { database } from "../src/lib/db";
import {analyticsPolicy} from "../src/lib/analytics-contract";

const sourceBaseline={files:83,sourceRows:88422,minDate:"2004-09-14",maxDate:"2026-07-18"};
const sql=database(process.env.DATABASE_URL_UNPOOLED??process.env.DATABASE_URL);
try {
  const [actual]=await sql`SELECT
    (SELECT count(*) FROM ops.ingest_file)::int files,
    (SELECT coalesce(sum(source_rows),0) FROM ops.ingest_file)::int source_rows,
    (SELECT count(*) FROM raw.sale_observation)::int observations,
    (SELECT count(*) FROM core.listing)::int listings,
    (SELECT count(*) FROM core.sale_event s JOIN core.listing l USING(listing_id)
      JOIN raw.sale_observation r ON r.observation_key=l.selected_observation_key
      WHERE s.price_aud BETWEEN ${analyticsPolicy.priceAud.minimum} AND ${analyticsPolicy.priceAud.maximum}
        AND coalesce(r.price_text,'') !~* '[$]?[[:space:]]*[[:digit:],.]+[[:space:]]*[-–—][[:space:]]*[$]?[[:space:]]*[[:digit:],.]+' 
        AND coalesce(r.price_text,'') !~* 'price[[:space:]]+range|(^|[^[:alpha:]])range([^[:alpha:]]|$)|between[[:space:]]+[$]?'
        AND coalesce(r.price_text,'') !~* '^(from|offers?[[:space:]]+(from|over|above)|starting[[:space:]]+(from|at)|mid|high|low)'
        AND s.sold_date IS NOT NULL
        AND (r.scraped_at_source IS NULL OR s.sold_date<=r.scraped_at_source::timestamptz::date))::int core_analytical,
    (SELECT count(DISTINCT p.suburb) FROM core.sale_event s JOIN core.property p USING(property_id))::int suburbs,
    (SELECT min(sold_date) FROM core.sale_event) minimum_sold_date,
    (SELECT max(sold_date) FROM core.sale_event) maximum_sold_date`;
  console.log(JSON.stringify({sourceBaseline,neon:actual,checks:{
    files:Number(actual.files)===sourceBaseline.files,
    sourceRows:Number(actual.source_rows)===sourceBaseline.sourceRows,
    minimumDate:String(actual.minimum_sold_date).slice(0,10)===sourceBaseline.minDate,
    maximumDate:String(actual.maximum_sold_date).slice(0,10)===sourceBaseline.maxDate,
  }},null,2));
} finally { await sql.end(); }
