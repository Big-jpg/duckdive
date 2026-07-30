"use client";
import {FormEvent,useState} from "react";
import {useSearchParams} from "next/navigation";
import {safeNextPath} from "@/lib/auth-policy";
import AppBrand from "@/components/AppBrand";

const errors:Record<string,string>={access_denied:"This verified email does not have active access.",link_failed:"That sign-in link is invalid or expired. Request a fresh link.",github_failed:"GitHub sign-in could not be completed."};
export default function LoginForm(){
  const params=useSearchParams(),[email,setEmail]=useState(""),[error,setError]=useState(errors[params.get("error")||""]||""),[message,setMessage]=useState(""),[loading,setLoading]=useState(false),[githubLoading,setGithubLoading]=useState(false);
  async function submit(event:FormEvent){
    event.preventDefault();setLoading(true);setError("");setMessage("");
    const response=await fetch("/api/auth/request-link",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,next:safeNextPath(params.get("next"))})});
    const body=await response.json().catch(()=>({}));setLoading(false);
    if(!response.ok){setError(body.error||"Could not request a sign-in link.");return;}
    setMessage(body.message||"If this address has active access, a sign-in link is on its way.");
  }
  async function github(){
    setGithubLoading(true);setError("");
    const response=await fetch("/api/auth/github",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({next:safeNextPath(params.get("next"))})});
    const body=await response.json().catch(()=>({}));
    if(!response.ok||typeof body.url!=="string"){setError(body.error||"Could not start GitHub sign-in.");setGithubLoading(false);return;}
    location.assign(body.url);
  }
  return <main id="main-content" className="login-page"><AppBrand/><form onSubmit={submit}><h1>Sign In</h1><button type="button" className="github-login" disabled={githubLoading||loading} onClick={github}>{githubLoading?"Opening GitHub…":"GitHub"}</button><div className="login-divider"><span>or</span></div><label>Email<input name="email" type="email" value={email} onChange={event=>setEmail(event.target.value)} required autoComplete="email" maxLength={254} spellCheck={false}/></label>{error?<div className="lab-error" role="alert">{error}</div>:null}{message?<div className="lab-success" role="status" aria-live="polite">{message}</div>:null}<button disabled={loading||githubLoading||Boolean(message)}>{loading?"Sending…":message?"Link Sent":"Email a Sign-In Link"}</button></form></main>;
}
