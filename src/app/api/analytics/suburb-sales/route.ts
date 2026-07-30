import {motherduck} from "@/lib/motherduck";
import {analyticsDefinitions,analyticsPolicy,jsonDate,jsonNumbers,salesQuerySchema} from "@/lib/analytics-contract";
import {estateConfig} from "@/lib/estate";
import {currentUser} from "@/lib/auth";

export const dynamic="force-dynamic";

export async function GET(request:Request){
  if(!await currentUser(request))return Response.json({error:"Authentication required"},{status:401});
  const estate=estateConfig();
  const parsed=salesQuerySchema(estate.state).safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if(!parsed.success)return Response.json({error:parsed.error.flatten()},{status:400});
  const input=parsed.data,sql=motherduck();
  try{
    const suburbKeyFilter=input.suburb_key?sql`AND f.suburb_key=${input.suburb_key}`:sql``;
    const suburbFilter=input.suburb?sql`AND lower(d.suburb)=lower(${input.suburb})`:sql``;
    const postcodeFilter=input.postcode?sql`AND d.canonical_postcode=${input.postcode}`:sql``;
    const bedroomFilter=input.bedrooms?sql`AND f.bedrooms=${input.bedrooms}`:sql``;
    const fromFilter=input.from?sql.unsafe(`AND f.sold_date>=DATE '${input.from}'`):sql``;
    const toFilter=input.to?sql.unsafe(`AND f.sold_date<=DATE '${input.to}'`):sql``;
    const {minimum,maximum}=analyticsPolicy.priceAud;
    const rows=await sql`SELECT f.suburb_key,d.suburb,d.canonical_postcode postcode,date_trunc('month',f.sold_date)::date sale_month,
        count(*)::bigint sale_count,count(f.price_aud)::bigint reported_priced_sales,
        count(*) FILTER(WHERE f.price_aud BETWEEN ${minimum} AND ${maximum})::bigint priced_sales,
        percentile_cont(.5) WITHIN GROUP(ORDER BY f.price_aud) FILTER(WHERE f.price_aud BETWEEN ${minimum} AND ${maximum})::bigint median_price_aud,
        avg(f.price_aud) FILTER(WHERE f.price_aud BETWEEN ${minimum} AND ${maximum})::bigint average_price_aud,
        min(f.price_aud) FILTER(WHERE f.price_aud BETWEEN ${minimum} AND ${maximum})::bigint minimum_price_aud,
        max(f.price_aud) FILTER(WHERE f.price_aud BETWEEN ${minimum} AND ${maximum})::bigint maximum_price_aud
      FROM suburb_sale_facts f JOIN suburb_dimension d ON d.suburb_key=f.suburb_key
      WHERE f.state=${estate.state} ${suburbKeyFilter} ${suburbFilter} ${postcodeFilter} ${bedroomFilter} ${fromFilter} ${toFilter}
      GROUP BY f.suburb_key,d.suburb,d.canonical_postcode,date_trunc('month',f.sold_date)::date
      ORDER BY sale_month DESC,d.suburb,d.canonical_postcode LIMIT ${input.limit}`;
    const data=rows.map(row=>{const value=jsonNumbers(row as Record<string,unknown>,["sale_count","reported_priced_sales","priced_sales","median_price_aud","average_price_aud","minimum_price_aud","maximum_price_aud"]);if(value)value.sale_month=jsonDate(value.sale_month);return value;});
    return Response.json({data,meta:{rows:data.length,source:"motherduck",scope:{state:estate.state,property_type:estate.propertyType},filters:input,definitions:analyticsDefinitions}},
      {headers:{"Cache-Control":"public, s-maxage=3600, stale-while-revalidate=86400"}});
  }finally{await sql.end();}
}
