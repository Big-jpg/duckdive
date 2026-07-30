import type {Metadata} from "next";
import {createHash} from "node:crypto";
import {headers} from "next/headers";
import {notFound} from "next/navigation";
import {audit,consumePublicShareQuota,findPublicDiveShare,recordDiveShareView} from "@/lib/app-db";
import {validShareSlug} from "@/lib/dive-share";
import {createEmbedSession} from "@/lib/motherduck-api";
import {publicShareLimits} from "@/lib/share-limits";
import AppBrand from "@/components/AppBrand";

export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Shared Dive · DuckDive",robots:{index:false,follow:false,nocache:true}};

export default async function SharedDivePage({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;if(!validShareSlug(slug))notFound();
  const share=await findPublicDiveShare(slug);if(!share)notFound();
  const requestHeaders=await headers(),ip=requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim()||"unknown",secret=process.env.NEON_AUTH_COOKIE_SECRET;
  if(!secret)notFound();
  const keyHash=createHash("sha256").update(`share|${slug}|${ip}|${secret}`).digest("hex"),limits=publicShareLimits();
  if(!await consumePublicShareQuota(share.share_id,keyHash,limits.perVisitorHourly,limits.globalHourly))notFound();
  const session=await createEmbedSession(share.dive_id,share.motherduck_username);
  await Promise.all([recordDiveShareView(share.share_id),audit("dive.share.viewed",null,share.share_id,{slug})]);
  return <main id="main-content" className="shared-dive-page"><header className="lab-header"><AppBrand/><span className="shared-badge">Shared View · Read Only</span></header><section className="dive-title"><div><p>Published Dive</p><h1>{share.title}</h1><span>{share.description}</span></div><span className="shared-slug">/{share.slug}</span></section><iframe className="dive-full" title={share.title} src={`https://embed-motherduck.com/sandbox/#session=${session}`} sandbox="allow-scripts allow-same-origin"/><footer className="shared-footer">Unlisted link · descriptive sales history, not a valuation</footer></main>;
}
