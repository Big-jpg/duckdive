import {defaultDataset,resolveDatasetRuntime} from "../src/lib/datasets";

const errors:string[]=[],warnings:string[]=[],dataset=defaultDataset();
const required=["DATABASE_URL","DATABASE_URL_UNPOOLED","BLOB_READ_WRITE_TOKEN","MOTHERDUCK_TOKEN","WA_VEHICLE_MARKET_MOTHERDUCK_DATABASE","WA_VEHICLE_MARKET_SHARE_URL","WA_VEHICLE_MARKET_SERVICE_ACCOUNT_USERNAME","NEON_AUTH_BASE_URL","NEON_AUTH_COOKIE_SECRET","RESEND_API_KEY","AUTH_EMAIL_FROM","INGEST_SECRET","NEXT_PUBLIC_SITE_URL","VEHICLE_MARKET_SOURCE_ENABLED","VEHICLE_MARKET_ALLOW_FULL_WA_COLLECTION"] as const;
for(const key of required)if(!process.env[key]?.trim())errors.push(`${key} is required`);
let runtime:null|ReturnType<typeof resolveDatasetRuntime>=null;
try{runtime=resolveDatasetRuntime(dataset);}catch(error){errors.push(error instanceof Error?error.message:"Dataset runtime is invalid");}
if(dataset.key!=="wa-vehicle-market")errors.push("The WA branch must have wa-vehicle-market as its only active default dataset");
if(runtime?.motherduckDatabase!=="wa_vehicle_market")errors.push("WA_VEHICLE_MARKET_MOTHERDUCK_DATABASE must be wa_vehicle_market for this deployment");
for(const key of ["VEHICLE_MARKET_SOURCE_ENABLED","VEHICLE_MARKET_ALLOW_FULL_WA_COLLECTION"] as const)if(process.env[key]&&!/^(?:true|false)$/.test(process.env[key]))errors.push(`${key} must be exactly true or false`);
if(process.env.VEHICLE_MARKET_ALLOW_FULL_WA_COLLECTION==="true"&&process.env.VEHICLE_MARKET_SOURCE_ENABLED!=="true")errors.push("VEHICLE_MARKET_ALLOW_FULL_WA_COLLECTION cannot be true while VEHICLE_MARKET_SOURCE_ENABLED is false");
if(process.env.VEHICLE_MARKET_SOURCE_ENABLED==="true")warnings.push("Live source access is enabled; application startup still cannot initiate acquisition, but confirm this is intentional");
if(process.env.VEHICLE_MARKET_ALLOW_FULL_WA_COLLECTION==="true")warnings.push("Full WA collection is enabled; confirm current licensing approval before invoking the explicit CLI command");
if(process.env.NEON_AUTH_COOKIE_SECRET&&process.env.NEON_AUTH_COOKIE_SECRET.length<32)errors.push("NEON_AUTH_COOKIE_SECRET must contain at least 32 characters");
if(process.env.NEON_AUTH_BASE_URL)try{const authUrl=new URL(process.env.NEON_AUTH_BASE_URL);if(authUrl.protocol!=="https:")errors.push("NEON_AUTH_BASE_URL must use HTTPS");}catch{errors.push("NEON_AUTH_BASE_URL must be an absolute URL");}
if(process.env.AUTH_EMAIL_FROM&&!/^.+@.+$/.test(process.env.AUTH_EMAIL_FROM))errors.push("AUTH_EMAIL_FROM must contain a configured sender address");
try{const site=new URL(process.env.NEXT_PUBLIC_SITE_URL||"");if(site.protocol!=="https:"&&!['localhost','127.0.0.1'].includes(site.hostname))errors.push("NEXT_PUBLIC_SITE_URL must use HTTPS outside localhost");}catch{errors.push("NEXT_PUBLIC_SITE_URL must be an absolute URL");}
for(const key of ["DATABASE_URL","DATABASE_URL_UNPOOLED"] as const){try{const url=new URL(process.env[key]||"");if(!url.hostname)throw new Error();}catch{errors.push(`${key} must be a valid absolute PostgreSQL URL`);}}
if(!process.env.DATABASE_READ_URL)warnings.push("DATABASE_READ_URL is unset; application reads will use DATABASE_URL");
if(process.env.DATABASE_URL&&process.env.DATABASE_URL===process.env.DATABASE_URL_UNPOOLED)warnings.push("DATABASE_URL and DATABASE_URL_UNPOOLED are identical; confirm application traffic uses Neon's pooled endpoint");
if(!process.env.OPENAI_API_KEY&&!process.env.ANTHROPIC_API_KEY&&!process.env.AI_GATEWAY_API_KEY&&!process.env.VERCEL_OIDC_TOKEN)errors.push("Configure an AI provider key or a Vercel OIDC token");
if(process.env.NEXT_PUBLIC_SITE_URL?.includes("localhost"))warnings.push("NEXT_PUBLIC_SITE_URL still points to localhost");
if(warnings.length)console.warn(warnings.map(value=>`WARN: ${value}`).join("\n"));
if(errors.length){console.error(errors.map(value=>`ERROR: ${value}`).join("\n"));process.exitCode=1;}else console.log(`Preflight passed for ${dataset.title} (${runtime?.motherduckDatabase})`);
