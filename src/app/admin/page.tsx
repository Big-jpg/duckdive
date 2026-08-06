import type {Metadata} from "next";
import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import {currentUser} from "@/lib/auth";
import {getAdminDashboard} from "@/lib/admin-db";
import {aiLimits} from "@/lib/ai-limits";
import {publicShareLimits} from "@/lib/share-limits";
import AdminUserManager from "@/components/AdminUserManager";
import AppBrand from "@/components/AppBrand";

export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Admin",robots:{index:false,follow:false}};
const number=new Intl.NumberFormat("en-AU");
const labels:Record<string,string>={"ai.completed":"AI completed","duckdive.applied":"DuckDive saved","duckdive.clarification":"DuckDive asked for detail","duckdive.failed":"DuckDive failed","duckdive.aborted":"DuckDive stopped","duckdive.reset":"Starter restored","duckdive.reset.no_change":"Starter already current","dive.share.published":"Share published","dive.share.revoked":"Share revoked","workspace.provisioned":"Workspace created","admin.access.upserted":"Access updated","admin.access.revoked":"Access revoked","auth.logout":"Signed out"};

export default async function AdminPage(){
  const user=await currentUser();if(!user)redirect("/login?next=%2Fadmin");if(user.role!=="admin")notFound();
  const {overview,users,audit}=await getAdminDashboard(),limits=aiLimits(),shareLimits=publicShareLimits();
  const cards=[
    ["People with access",overview.active_users,`${overview.linked_users} linked identities`],
    ["AI calls · 1h",overview.ai_requests_hour,`${overview.ai_requests_day} in 24 hours`],
    ["Sign-in attempts · 15m",overview.login_attempts_15m,"Accepted and rejected"],
    ["Shared-view loads · 1h",overview.public_share_loads_hour,`${shareLimits.globalHourly} hourly ceiling`],
    ["Active share links",overview.active_shares,`${number.format(overview.share_views)} total opens`],
    ["New conversations · 24h",overview.chats_day,`${overview.audit_events_day} audited events`],
    ["Revoked access",overview.revoked_users,"Identity and history retained"],
    ["DuckDives applied · 24h",overview.duckdives_applied_day,`${overview.duckdives_failed_day} failed · ${overview.duckdives_clarified_day} clarified`],
    ["Median DuckDive",Math.round(overview.duckdive_median_duration_ms/1000),`${number.format(overview.duckdive_median_tokens)} tokens · seconds shown`],
  ] as const;
  return <main id="main-content" className="admin-page">
    <header className="lab-header"><AppBrand/><nav aria-label="Administration navigation"><Link href="/workspace">Dives</Link><Link href="/edit">Editor</Link><span className="admin-identity">{user.email}</span></nav></header>
    <section className="admin-intro"><h1>Operations</h1><dl className="admin-limits"><div><dt>Per User</dt><dd>{limits.perUserHourly}<small>AI / hour</small></dd></div><div><dt>All Users</dt><dd>{limits.globalHourly}<small>AI / hour</small></dd></div><div><dt>Shared Views</dt><dd>{shareLimits.globalHourly}<small>loads / hour</small></dd></div></dl></section>
    <section className="admin-metrics">{cards.map(([label,value,detail])=><article key={label}><span>{label}</span><strong>{number.format(value)}</strong><small>{detail}</small></article>)}</section>
    <AdminUserManager users={users} currentUserId={user.user_id}/>
    <section className="admin-audit"><header><h2>Recent Activity</h2></header><div>{audit.length?audit.map(event=><article key={event.event_id}><time>{new Intl.DateTimeFormat("en-AU",{dateStyle:"medium",timeStyle:"short"}).format(new Date(event.occurred_at))}</time><strong>{labels[event.event_type]||event.event_type.replaceAll("."," ")}</strong><span>{event.actor_email||"System"}{event.target_email?` → ${event.target_email}`:""}</span></article>):<p className="admin-empty">No operational events recorded.</p>}</div></section>
  </main>;
}
