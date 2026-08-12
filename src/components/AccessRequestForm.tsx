"use client";
import Link from "next/link";
import {FormEvent,useState} from "react";
import AppBrand from "@/components/AppBrand";

export default function AccessRequestForm(){
  const [error,setError]=useState(""),[message,setMessage]=useState(""),[loading,setLoading]=useState(false);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setLoading(true);setError("");
    const form=new FormData(event.currentTarget);
    const response=await fetch("/api/access-requests",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
      name:form.get("name"),email:form.get("email"),title:form.get("title"),datasetInterest:form.get("datasetInterest"),website:form.get("website")
    })});
    const body=await response.json().catch(()=>({}));setLoading(false);
    if(!response.ok){setError(body.error||"Your request could not be submitted.");return;}
    setMessage(body.message||"Thanks — your request has been received for review.");
  }
  return <main id="main-content" className="access-page">
    <header className="access-header"><AppBrand/><Link href="/login">Sign in</Link></header>
    <section className="access-layout">
      <div className="access-copy">
        <p className="lab-kicker">Governed analytics, open to curious people</p>
        <h1>I want to explore DuckDive</h1>
        <p>DuckDive is a small, guided testing program for exploring governed datasets and reshaping live analytical reports. Tell us who you are and, if you like, what data you would value.</p>
        <p className="access-note">Already approved? <Link href="/login">Sign in with GitHub or an email link.</Link></p>
      </div>
      <form onSubmit={submit} aria-busy={loading}>
        <div className="access-fields">
          <label>Name <span>Required</span><input name="name" required maxLength={100} autoComplete="name"/></label>
          <label>Email address <span>Required</span><input name="email" type="email" required maxLength={254} autoComplete="email" spellCheck={false}/></label>
          <label>Title <span>Optional</span><input name="title" maxLength={120} autoComplete="organization-title" placeholder="e.g. Analyst, founder, researcher"/></label>
          <label>What datasets would you like to explore? <span>Optional</span><textarea name="datasetInterest" maxLength={1000} rows={5} placeholder="A topic, public dataset, business question, or industry is enough."/></label>
          <label className="access-honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off"/></label>
        </div>
        {error?<p className="lab-error" role="alert">{error}</p>:null}
        {message?<p className="lab-success" role="status" aria-live="polite">{message}</p>:null}
        <button disabled={loading||Boolean(message)}>{loading?"Submitting…":message?"Request received":"Request access"}</button>
        <small>Your details are used to assess testing access and dataset demand. Submitting does not create an account or grant access.</small>
      </form>
    </section>
  </main>;
}
