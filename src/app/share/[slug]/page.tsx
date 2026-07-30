import type {Metadata} from "next";
import Link from "next/link";
import {notFound} from "next/navigation";
import {audit,findPublicDiveShare,recordDiveShareView} from "@/lib/app-db";
import {validShareSlug} from "@/lib/dive-share";
import {createEmbedSession} from "@/lib/motherduck-api";

export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Shared Dive · DuckDive",robots:{index:false,follow:false,nocache:true}};

export default async function SharedDivePage({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;if(!validShareSlug(slug))notFound();
  const share=await findPublicDiveShare(slug);if(!share)notFound();
  const session=await createEmbedSession(share.dive_id,share.motherduck_username);
  await Promise.all([recordDiveShareView(share.share_id),audit("dive.share.viewed",null,share.share_id,{slug})]);
  return <main className="shared-dive-page"><header className="lab-header"><Link href="/" className="lab-brand"><span className="lab-duck">D</span><span>DUCKDIVE <i>GOLD</i></span></Link><span className="shared-badge">Shared view · read only</span></header><section className="dive-title"><div><p>Published Dive</p><h1>{share.title}</h1><span>{share.description}</span></div><span className="shared-slug">/{share.slug}</span></section><iframe className="dive-full" title={share.title} src={`https://embed-motherduck.com/sandbox/#session=${session}`} sandbox="allow-scripts allow-same-origin"/><footer className="shared-footer">Unlisted link · descriptive sales history, not a valuation</footer></main>;
}
