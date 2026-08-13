"use client";
import {useState} from "react";
import {AI_GATEWAY_MODELS,type AiGatewayModelId} from "@/lib/ai-gateway-models";
import type {AiGatewayModelSetting} from "@/lib/ai-gateway-settings-db";

export default function AdminAiModelSelector({setting}:{setting:AiGatewayModelSetting}){
  const [selected,setSelected]=useState<AiGatewayModelId>(setting.model),[active,setActive]=useState(setting.model),[saving,setSaving]=useState(false),[notice,setNotice]=useState<{kind:"ok"|"error";text:string}|null>(null);
  async function save(){setSaving(true);setNotice(null);try{
    const response=await fetch("/api/admin/ai-model",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:selected})}),body=await response.json();
    if(!response.ok)throw new Error(body.error||"The AI model could not be updated");
    setActive(body.setting.model);setNotice({kind:"ok",text:`${AI_GATEWAY_MODELS.find(model=>model.id===body.setting.model)?.name||body.setting.model} is now active for new DuckDive requests.`});
  }catch(reason){setNotice({kind:"error",text:reason instanceof Error?reason.message:"The AI model could not be updated"});}finally{setSaving(false);}}
  return <section className="admin-ai-model">
    <header><div><h2>AI Gateway Model</h2><p>Choose the global model for new DuckDive requests. Requests already in progress keep the model they started with.</p></div><strong>{active===selected?"Active":"Unsaved change"}</strong></header>
    <div className="admin-model-control"><label>OpenAI GPT-5.6 model<select value={selected} onChange={event=>setSelected(event.target.value as AiGatewayModelId)} disabled={saving}>{AI_GATEWAY_MODELS.map(model=><option key={model.id} value={model.id}>{model.name} · {model.description}</option>)}</select></label><button onClick={()=>void save()} disabled={saving||selected===active}>{saving?"Updating…":"Use This Model"}</button></div>
    <p className="admin-model-source">Deployment default: <code>AI_MODEL_GATEWAY</code>{setting.source==="admin"?" · overridden here":" · currently active"}</p>
    {notice?<p className={`admin-notice ${notice.kind==="error"?"error":""}`} role={notice.kind==="error"?"alert":"status"} aria-live="polite">{notice.text}</p>:null}
  </section>;
}
