function required(name:"RESEND_API_KEY"|"AUTH_EMAIL_FROM"){
  const value=process.env[name]?.trim();if(!value)throw new Error(`${name} is required`);return value;
}
function escapeHtml(value:string){return value.replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]!));}

export async function sendMagicLink(email:string,link:string){
  const safeLink=escapeHtml(link);
  const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${required("RESEND_API_KEY")}`,"Content-Type":"application/json"},body:JSON.stringify({
    from:required("AUTH_EMAIL_FROM"),to:[email],subject:"Your DuckDive sign-in link",
    html:`<div style="font-family:Arial,sans-serif;color:#111"><h1>Enter DuckDive</h1><p>Use this single-use link to sign in. It expires shortly.</p><p><a href="${safeLink}">Sign in to DuckDive</a></p><p>If you did not request this link, ignore this email.</p></div>`
  }),signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw new Error(`Resend delivery failed (${response.status})`);
}
