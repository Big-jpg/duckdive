"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import type {AccessRequest} from "@/lib/access-request-db";

const date=new Intl.DateTimeFormat("en-AU",{dateStyle:"medium",timeStyle:"short"});

export default function AdminAccessRequests({requests}:{requests:AccessRequest[]}){
  const router=useRouter(),[busy,setBusy]=useState<string|null>(null),[notice,setNotice]=useState<{kind:"ok"|"error";text:string}|null>(null);
  async function review(item:AccessRequest,action:"approve"|"ignore"){
    if(action==="approve"&&!window.confirm(`Approve ${item.email} for member access?`))return;
    setBusy(item.request_id);setNotice(null);
    try{
      const response=await fetch("/api/admin/access-requests",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({requestId:item.request_id,action})});
      const result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(result.error||"Review failed");
      setNotice({kind:"ok",text:action==="approve"?`${item.email} now has member access.`:`${item.email} was ignored.`});router.refresh();
    }catch(error){setNotice({kind:"error",text:error instanceof Error?error.message:"Review failed"});}finally{setBusy(null);}
  }
  return <section className="admin-requests">
    <header><div><h2>Access requests</h2><p>Approve creates or reactivates member access. Ignore retains the market-research response without granting access.</p></div><strong>{requests.length} pending</strong></header>
    {notice?<p className={`admin-notice ${notice.kind}`} role={notice.kind==="error"?"alert":"status"} aria-live="polite">{notice.text}</p>:null}
    {requests.length?<div className="admin-request-list">{requests.map(item=><article key={item.request_id}>
      <div><h3>{item.name}</h3><a href={`mailto:${item.email}`}>{item.email}</a><span>{item.title||"No title supplied"} · {date.format(new Date(item.submitted_at))}</span></div>
      <p>{item.dataset_interest||"No dataset suggestion supplied."}</p>
      <div className="admin-request-actions"><button disabled={busy!==null} onClick={()=>review(item,"approve")}>{busy===item.request_id?"Reviewing…":"Approve"}</button><button className="admin-secondary" disabled={busy!==null} onClick={()=>review(item,"ignore")}>Ignore</button></div>
    </article>)}</div>:<p className="admin-empty">No pending access requests.</p>}
  </section>;
}
