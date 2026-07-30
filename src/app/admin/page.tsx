import type {Metadata} from "next";
import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import {currentUser} from "@/lib/auth";
import {getAdminDashboard} from "@/lib/admin-db";
import {aiLimits} from "@/lib/ai-limits";
import {publicShareLimits} from "@/lib/share-limits";
import AdminUserManager from "@/components/AdminUserManager";

export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Admin",robots:{index:false,follow:false}};
const number=new Intl.NumberFormat("en-AU");
const labels:Record<string,string>={"ai.completed":"AI completed","dive.share.published":"Share published","dive.share.revoked":"Share revoked","workspace.provisioned":"Workspace created","admin.access.upserted":"Access updated","admin.access.revoked":"Access revoked","auth.logout":"Signed out"};

export default async function AdminPage(){
  const user=await currentUser();if(!user)redirect("/login?next=%2Fadmin");if(user.role!=="admin")notFound();
  const {overview,users,audit}=await getAdminDashboard(),limits=aiLimits(),shareLimits=publicShareLimits();
  const cards=[
    ["Active people",overview.active_users,`${overview.linked_users} linked identities`],
    ["AI requests · 1h",overview.ai_requests_hour,`${overview.ai_requests_day} in 24 hours`],
    ["Login attempts · 15m",overview.login_attempts_15m,"Allowlisted and rejected requests"],
    ["Public loads · 1h",overview.public_share_loads_hour,`${shareLimits.globalHourly} global hourly cap`],
    ["Live share links",overview.active_shares,`${number.format(overview.share_views)} total views`],
    ["New chats · 24h",overview.chats_day,`${overview.audit_events_day} audited actions`],
    ["Revoked people",overview.revoked_users,"History retained"],
  ] as const;
  return <main className="admin-page">
    <header className="lab-header"><Link href="/" className="lab-brand"><span className="lab-duck">D</span><span>DUCKDIVE <i>GOLD</i></span></Link><nav><Link href="/">Dives</Link><Link href="/edit">Editor</Link><span>Admin · {user.email}</span></nav></header>
    <section className="admin-hero"><div><p className="admin-kicker">Private operations</p><h1>Keep it open.<br/><em>Keep it bounded.</em></h1><p>Manage dogfood access and watch the activity that can create cost. No clickstream, no surveillance—just identities, AI usage, chats, shares and security events.</p></div><aside><span>Hard cost limits</span><strong>{limits.perUserHourly}<small> AI / user / hour</small></strong><strong>{limits.globalHourly}<small> AI / all users / hour</small></strong><p>Public shares: {shareLimits.perVisitorHourly} loads per visitor/link and {shareLimits.globalHourly} loads globally per hour. Admission is serialized through Neon before paid services are called.</p></aside></section>
    <section className="admin-metrics">{cards.map(([label,value,detail])=><article key={label}><span>{label}</span><strong>{number.format(value)}</strong><small>{detail}</small></article>)}</section>
    <AdminUserManager users={users} currentUserId={user.user_id}/>
    <section className="admin-audit"><header><div><p className="admin-kicker">Recent audit</p><h2>Meaningful actions</h2></div><p>The latest 40 durable events. Routine page views are deliberately excluded.</p></header><div>{audit.length?audit.map(event=><article key={event.event_id}><time>{new Intl.DateTimeFormat("en-AU",{dateStyle:"medium",timeStyle:"short"}).format(new Date(event.occurred_at))}</time><strong>{labels[event.event_type]||event.event_type.replaceAll("."," ")}</strong><span>{event.actor_email||"System"}{event.target_email?` → ${event.target_email}`:""}</span></article>):<p className="admin-empty">No audited activity yet.</p>}</div></section>
  </main>;
}
