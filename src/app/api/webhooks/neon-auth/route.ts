import {claimAuthWebhook,findActiveAllowlistedUserByEmail,finishAuthWebhook} from "@/lib/app-db";
import {normalizeEmail} from "@/lib/auth-policy";
import {verifyNeonWebhook} from "@/lib/neon-webhook";
import {sendMagicLink} from "@/lib/resend";

export const dynamic="force-dynamic";

export async function POST(request:Request){
  const rawBody=await request.text();
  let event;
  try{event=await verifyNeonWebhook(rawBody,request.headers);}catch(error){console.warn("Rejected Neon Auth webhook",{reason:error instanceof Error?error.message:"invalid"});return Response.json({error:"Invalid webhook"},{status:401});}
  const claim=await claimAuthWebhook(event.event_id,event.event_type);
  if(claim.state==="succeeded")return Response.json(claim.response||{ok:true});
  if(claim.state==="busy")return Response.json({error:"Delivery already in progress"},{status:503});
  try{
    const email=event.user.email?normalizeEmail(event.user.email):"";
    const allowed=email?await findActiveAllowlistedUserByEmail(email):null;
    if(event.event_type==="user.before_create"){
      const decision=allowed?{allowed:true}:{allowed:false,error_message:"This account is not authorized.",error_code:"ACCESS_NOT_ALLOWLISTED"};
      await finishAuthWebhook(event.event_id,"succeeded",null,decision);
      return Response.json(decision);
    }
    const link=event.event_data.link_url;
    if(!allowed||typeof link!=="string"||!link){await finishAuthWebhook(event.event_id,"failed","ACCESS_DENIED");return Response.json({error:"Delivery denied"},{status:403});}
    await sendMagicLink(email,link);
    await finishAuthWebhook(event.event_id,"succeeded",null,{ok:true});
    return Response.json({ok:true});
  }catch(error){
    const code=error instanceof Error&&error.message.startsWith("Resend delivery failed")?"RESEND_FAILED":"DELIVERY_FAILED";
    await finishAuthWebhook(event.event_id,"failed",code);
    console.error("Neon Auth webhook delivery failed",{eventId:event.event_id,eventType:event.event_type,code});
    return Response.json({error:"Delivery failed"},{status:502});
  }
}
