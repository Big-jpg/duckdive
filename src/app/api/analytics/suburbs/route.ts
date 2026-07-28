import {motherduck} from "@/lib/motherduck";
import {jsonNumbers} from "@/lib/analytics-contract";
import {estateConfig} from "@/lib/estate";

export const dynamic="force-dynamic";
export async function GET(){
  const estate=estateConfig(),sql=motherduck();
  try{
    const rows=await sql`SELECT suburb_key,state,suburb,canonical_postcode,observed_postcodes,sale_count,postcode_confidence
      FROM suburb_dimension WHERE state=${estate.state} ORDER BY suburb`;
    const data=rows.map(row=>jsonNumbers(row as Record<string,unknown>,["sale_count","postcode_confidence"]));
    return Response.json({data,meta:{rows:data.length,source:"motherduck",estate:{state:estate.state,name:estate.name,property_type:estate.propertyType}}},
      {headers:{"Cache-Control":"public, s-maxage=86400, stale-while-revalidate=604800"}});
  }finally{await sql.end();}
}
