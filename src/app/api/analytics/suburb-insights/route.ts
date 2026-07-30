import {motherduck} from "@/lib/motherduck";
import {analyticsDefinitions,analyticsPolicy,insightsQuerySchema,jsonDate,jsonNumbers} from "@/lib/analytics-contract";
import {estateConfig} from "@/lib/estate";
import {currentUser} from "@/lib/auth";

export const dynamic="force-dynamic";
const numericSummary=["sale_count","reported_priced_sales","priced_sales","excluded_price_outliers","median_price_aud","average_price_aud","land_sample","land_price_pair_sample","land_price_correlation","median_land_size_sqm"];
const numericComparison=["current_sale_count","current_reported_priced_sales","current_priced_sales","current_median_price_aud","prior_sale_count","prior_reported_priced_sales","prior_priced_sales","prior_median_price_aud"];

export async function GET(request:Request){
  if(!await currentUser(request))return Response.json({error:"Authentication required"},{status:401});
  const estate=estateConfig();
  const parsed=insightsQuerySchema(estate.state).safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if(!parsed.success)return Response.json({error:parsed.error.flatten()},{status:400});
  const {suburb_key,from,to,bedrooms:bedroom}=parsed.data;
  const sql=motherduck();
  try{
    const dateRange=sql.unsafe(`sold_date BETWEEN DATE '${from}' AND DATE '${to}'`);
    const bedroomFilter=bedroom?sql`AND bedrooms=${bedroom}`:sql``;
    const {priceAud,landSizeSqm,bedrooms}=analyticsPolicy;
    const [summary]=await sql`SELECT count(*)::bigint sale_count,count(price_aud)::bigint reported_priced_sales,
      count(*) FILTER(WHERE price_aud BETWEEN ${priceAud.minimum} AND ${priceAud.maximum})::bigint priced_sales,
      count(*) FILTER(WHERE price_aud IS NOT NULL AND price_aud NOT BETWEEN ${priceAud.minimum} AND ${priceAud.maximum})::bigint excluded_price_outliers,
      percentile_cont(.5) WITHIN GROUP(ORDER BY price_aud) FILTER(WHERE price_aud BETWEEN ${priceAud.minimum} AND ${priceAud.maximum})::bigint median_price_aud,
      avg(price_aud) FILTER(WHERE price_aud BETWEEN ${priceAud.minimum} AND ${priceAud.maximum})::bigint average_price_aud,
      count(*) FILTER(WHERE land_size_sqm BETWEEN ${landSizeSqm.minimum} AND ${landSizeSqm.maximum})::bigint land_sample,
      count(*) FILTER(WHERE price_aud BETWEEN ${priceAud.minimum} AND ${priceAud.maximum} AND land_size_sqm BETWEEN ${landSizeSqm.minimum} AND ${landSizeSqm.maximum})::bigint land_price_pair_sample,
      corr(price_aud::double precision,land_size_sqm::double precision) FILTER(WHERE price_aud BETWEEN ${priceAud.minimum} AND ${priceAud.maximum} AND land_size_sqm BETWEEN ${landSizeSqm.minimum} AND ${landSizeSqm.maximum}) land_price_correlation,
      percentile_cont(.5) WITHIN GROUP(ORDER BY land_size_sqm) FILTER(WHERE land_size_sqm BETWEEN ${landSizeSqm.minimum} AND ${landSizeSqm.maximum})::bigint median_land_size_sqm
      FROM suburb_sale_facts WHERE state=${estate.state} AND suburb_key=${suburb_key} AND ${dateRange} ${bedroomFilter}`;
    const [comparison]=await sql`WITH periods AS (
        SELECT DATE ${sql.unsafe(`'${from}'`)} current_from,DATE ${sql.unsafe(`'${to}'`)} current_to,
          (DATE ${sql.unsafe(`'${from}'`)}-(((DATE ${sql.unsafe(`'${to}'`)}-DATE ${sql.unsafe(`'${from}'`)})+1)::integer))::date prior_from,
          (DATE ${sql.unsafe(`'${from}'`)}-1)::date prior_to
      )
      SELECT p.current_from,p.current_to,p.prior_from,p.prior_to,
        count(*) FILTER(WHERE f.sold_date BETWEEN p.current_from AND p.current_to)::bigint current_sale_count,
        count(f.price_aud) FILTER(WHERE f.sold_date BETWEEN p.current_from AND p.current_to)::bigint current_reported_priced_sales,
        count(*) FILTER(WHERE f.sold_date BETWEEN p.current_from AND p.current_to AND f.price_aud BETWEEN ${priceAud.minimum} AND ${priceAud.maximum})::bigint current_priced_sales,
        percentile_cont(.5) WITHIN GROUP(ORDER BY f.price_aud) FILTER(WHERE f.sold_date BETWEEN p.current_from AND p.current_to AND f.price_aud BETWEEN ${priceAud.minimum} AND ${priceAud.maximum})::bigint current_median_price_aud,
        count(*) FILTER(WHERE f.sold_date BETWEEN p.prior_from AND p.prior_to)::bigint prior_sale_count,
        count(f.price_aud) FILTER(WHERE f.sold_date BETWEEN p.prior_from AND p.prior_to)::bigint prior_reported_priced_sales,
        count(*) FILTER(WHERE f.sold_date BETWEEN p.prior_from AND p.prior_to AND f.price_aud BETWEEN ${priceAud.minimum} AND ${priceAud.maximum})::bigint prior_priced_sales,
        percentile_cont(.5) WITHIN GROUP(ORDER BY f.price_aud) FILTER(WHERE f.sold_date BETWEEN p.prior_from AND p.prior_to AND f.price_aud BETWEEN ${priceAud.minimum} AND ${priceAud.maximum})::bigint prior_median_price_aud
      FROM suburb_sale_facts f CROSS JOIN periods p
      WHERE f.state=${estate.state} AND f.suburb_key=${suburb_key} AND f.sold_date BETWEEN p.prior_from AND p.current_to ${bedroomFilter}
      GROUP BY p.current_from,p.current_to,p.prior_from,p.prior_to`;
    const bedroomSegments=await sql`SELECT CASE WHEN bedrooms BETWEEN 1 AND ${bedrooms.displayMaximum} THEN bedrooms::varchar ELSE ${`${bedrooms.displayMaximum+1}+`} END segment_label,
      count(*)::bigint sale_count,count(*) FILTER(WHERE price_aud BETWEEN ${priceAud.minimum} AND ${priceAud.maximum})::bigint priced_sales,
      percentile_cont(.5) WITHIN GROUP(ORDER BY price_aud) FILTER(WHERE price_aud BETWEEN ${priceAud.minimum} AND ${priceAud.maximum})::bigint median_price_aud
      FROM suburb_sale_facts WHERE state=${estate.state} AND suburb_key=${suburb_key} AND ${dateRange} AND bedrooms BETWEEN 1 AND ${bedrooms.filterMaximum}
      GROUP BY 1 ORDER BY min(bedrooms)`;
    const rolling=jsonNumbers(comparison as Record<string,unknown>,numericComparison);
    if(rolling){rolling.current_from=jsonDate(rolling.current_from);rolling.current_to=jsonDate(rolling.current_to);rolling.prior_from=jsonDate(rolling.prior_from);rolling.prior_to=jsonDate(rolling.prior_to);}
    return Response.json({summary:jsonNumbers(summary as Record<string,unknown>,numericSummary),rolling,
      bedrooms:bedroomSegments.map(row=>jsonNumbers(row as Record<string,unknown>,["sale_count","priced_sales","median_price_aud"])),
      meta:{source:"motherduck",scope:{property_type:estate.propertyType,state:estate.state},filters:parsed.data,definitions:analyticsDefinitions}},
      {headers:{"Cache-Control":"public, s-maxage=3600, stale-while-revalidate=86400"}});
  }finally{await sql.end();}
}
