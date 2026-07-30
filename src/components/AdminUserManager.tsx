"use client";
import {useRef,useState} from "react";
import {useRouter} from "next/navigation";
import type {AdminUser} from "@/lib/admin-db";

function date(value:string|null){return value?new Intl.DateTimeFormat("en-AU",{dateStyle:"medium",timeStyle:"short"}).format(new Date(value)):"Never";}

export default function AdminUserManager({users,currentUserId}:{users:AdminUser[];currentUserId:string}){
  const router=useRouter(),formRef=useRef<HTMLFormElement>(null),[busy,setBusy]=useState<string|null>(null),[notice,setNotice]=useState<{kind:"ok"|"error";text:string}|null>(null);
  async function request(method:"POST"|"DELETE",body:Record<string,string>,key:string){
    if(method==="DELETE"&&!window.confirm("Revoke this user’s access? Their identity and history will be preserved."))return false;
    setBusy(key);setNotice(null);
    try{const response=await fetch("/api/admin/users",{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}),result=await response.json();if(!response.ok)throw new Error(result.error||"Access update failed");setNotice({kind:"ok",text:method==="DELETE"?"Access revoked. Existing history was preserved.":"Allowlist access is active."});router.refresh();return true;}
    catch(error){setNotice({kind:"error",text:error instanceof Error?error.message:"Access update failed"});return false;}finally{setBusy(null);}
  }
  async function submit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();const data=new FormData(event.currentTarget),email=String(data.get("email")||""),role=String(data.get("role")||"member");if(await request("POST",{email,role},"new"))formRef.current?.reset();}
  return <section className="admin-users">
    <header><h2>Access</h2></header>
    <form ref={formRef} onSubmit={submit} className="admin-invite">
      <label>Email<input name="email" type="email" required maxLength={254} placeholder="tester@example.com" autoComplete="off" spellCheck={false}/></label>
      <label>Role<select name="role" defaultValue="member"><option value="member">Member</option><option value="admin">Admin</option></select></label>
      <button disabled={busy!==null}>{busy==="new"?"Saving…":"Add or Reactivate"}</button>
    </form>
    {notice?<p className={`admin-notice ${notice.kind}`} role={notice.kind==="error"?"alert":"status"} aria-live="polite">{notice.text}</p>:null}
    <div className="admin-table-wrap"><table><thead><tr><th>User</th><th>Status</th><th>AI</th><th>Activity</th><th>Shares</th><th>Access</th></tr></thead><tbody>{users.map(user=><tr key={user.user_id}>
      <td><strong>{user.email}</strong><span>{user.role} · {user.auth_subject?"linked":"not signed in"}</span><small>Last login: {date(user.last_login_at)}</small></td>
      <td><span className={`admin-status ${user.status}`}>{user.status}</span></td>
      <td><strong>{user.ai_requests_hour}</strong><span>{user.ai_requests_day} / 24h</span></td>
      <td><strong>{user.audit_events_day}</strong><span>{user.chat_sessions} chats</span></td>
      <td><strong>{user.active_shares}</strong><span>{user.share_views} views</span></td>
      <td>{user.status==="active"?<button className="admin-danger" disabled={busy!==null||user.user_id===currentUserId} title={user.user_id===currentUserId?"You cannot revoke yourself":undefined} onClick={()=>request("DELETE",{userId:user.user_id},user.user_id)}>{busy===user.user_id?"Revoking…":"Revoke"}</button>:<button disabled={busy!==null} onClick={()=>request("POST",{email:user.email,role:user.role},user.user_id)}>{busy===user.user_id?"Restoring…":"Reactivate"}</button>}</td>
    </tr>)}</tbody></table></div>
  </section>;
}
