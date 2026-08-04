import {estateConfig} from "../src/lib/estate";

const errors:string[]=[],warnings:string[]=[];
const required=["DATABASE_URL","DATABASE_URL_UNPOOLED","MOTHERDUCK_TOKEN","MOTHERDUCK_SHARE_URL","MOTHERDUCK_WHO_SERVICE_ACCOUNT_USERNAME","NEON_AUTH_BASE_URL","NEON_AUTH_COOKIE_SECRET","RESEND_API_KEY","AUTH_EMAIL_FROM","INGEST_SECRET","NEXT_PUBLIC_SITE_URL"] as const;
for(const key of required)if(!process.env[key]?.trim())errors.push(`${key} is required`);
const estate=estateConfig();
if(estate.state!=="VIC")errors.push("ESTATE_STATE must be VIC for this deployment");
if(estate.motherduckDatabase!=="vic_house_data")errors.push("MOTHERDUCK_DATABASE must be vic_house_data for this deployment");
if(process.env.MOTHERDUCK_WHO_SERVICE_ACCOUNT_USERNAME===process.env.MOTHERDUCK_SHARED_SERVICE_ACCOUNT_USERNAME)errors.push("MOTHERDUCK_WHO_SERVICE_ACCOUNT_USERNAME must differ from the VIC service account");
if(process.env.NEON_AUTH_COOKIE_SECRET&&(process.env.NEON_AUTH_COOKIE_SECRET.length<32))errors.push("NEON_AUTH_COOKIE_SECRET must contain at least 32 characters");
if(process.env.NEON_AUTH_BASE_URL)try{const authUrl=new URL(process.env.NEON_AUTH_BASE_URL);if(authUrl.protocol!=="https:")errors.push("NEON_AUTH_BASE_URL must use HTTPS");}catch{errors.push("NEON_AUTH_BASE_URL must be an absolute URL");}
if(process.env.AUTH_EMAIL_FROM&&!/^.+@.+$/.test(process.env.AUTH_EMAIL_FROM))errors.push("AUTH_EMAIL_FROM must contain a configured sender address");
if(process.env.MOTHERDUCK_SHARE_URL?.includes("replace-with")||!process.env.MOTHERDUCK_SHARE_URL?.startsWith("md:_share/"))errors.push("MOTHERDUCK_SHARE_URL must be a provisioned md:_share URL");
try{const site=new URL(process.env.NEXT_PUBLIC_SITE_URL||"");if(site.protocol!=="https:"&&!['localhost','127.0.0.1'].includes(site.hostname))errors.push("NEXT_PUBLIC_SITE_URL must use HTTPS outside localhost");}catch{errors.push("NEXT_PUBLIC_SITE_URL must be an absolute URL");}
for(const key of ["DATABASE_URL","DATABASE_URL_UNPOOLED"] as const){try{const url=new URL(process.env[key]||"");if(!url.hostname)throw new Error();}catch{errors.push(`${key} must be a valid absolute PostgreSQL URL`);}}
if(!process.env.DATABASE_READ_URL)warnings.push("DATABASE_READ_URL is unset; application reads will use DATABASE_URL");
if(process.env.DATABASE_URL&&process.env.DATABASE_URL===process.env.DATABASE_URL_UNPOOLED)warnings.push("DATABASE_URL and DATABASE_URL_UNPOOLED are identical; confirm application traffic uses Neon's pooled endpoint");
if(!process.env.OPENAI_API_KEY&&!process.env.ANTHROPIC_API_KEY&&!process.env.AI_GATEWAY_API_KEY&&!process.env.VERCEL_OIDC_TOKEN)errors.push("Configure an AI provider key or a Vercel OIDC token");
if(process.env.NEXT_PUBLIC_SITE_URL?.includes("localhost"))warnings.push("NEXT_PUBLIC_SITE_URL still points to localhost");
if(warnings.length)console.warn(warnings.map(value=>`WARN: ${value}`).join("\n"));
if(errors.length){console.error(errors.map(value=>`ERROR: ${value}`).join("\n"));process.exitCode=1;}else console.log(`Preflight passed for ${estate.name} (${estate.state}, ${estate.motherduckDatabase})`);
