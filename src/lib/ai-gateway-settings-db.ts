import {database} from "./db";
import {configuredAiGatewayModel,isAiGatewayModelId,type AiGatewayModelId} from "./ai-gateway-models";

export type AiGatewayModelSetting={model:AiGatewayModelId;source:"admin"|"environment";updatedAt:string|null};

export async function getAiGatewayModelSetting():Promise<AiGatewayModelSetting>{
  const sql=database();try{
    const [row]=await sql<{model:string;updated_at:string}[]>`SELECT model,updated_at FROM app.ai_gateway_setting WHERE singleton=true`;
    if(!row)return {model:configuredAiGatewayModel(),source:"environment",updatedAt:null};
    if(!isAiGatewayModelId(row.model))throw new Error("The stored AI Gateway model is not approved");
    return {model:row.model,source:"admin",updatedAt:row.updated_at};
  }finally{await sql.end();}
}

export async function setAiGatewayModel(actorId:string,model:AiGatewayModelId):Promise<AiGatewayModelSetting>{
  const sql=database();try{return await sql.begin(async tx=>{
    await tx`SELECT pg_advisory_xact_lock(hashtext('duckdive:admin:ai-gateway-model'))`;
    const [previous]=await tx<{model:string}[]>`SELECT model FROM app.ai_gateway_setting WHERE singleton=true FOR UPDATE`;
    const [setting]=await tx<{model:string;updated_at:string}[]>`
      INSERT INTO app.ai_gateway_setting(singleton,model,updated_by,updated_at)
      VALUES(true,${model},${actorId}::uuid,now())
      ON CONFLICT(singleton) DO UPDATE SET model=excluded.model,updated_by=excluded.updated_by,updated_at=excluded.updated_at
      RETURNING model,updated_at`;
    await tx`INSERT INTO app.audit_event(user_id,event_type,target_id,details)
      VALUES(${actorId}::uuid,'admin.ai_gateway_model.updated','ai-gateway',${tx.json({previousModel:previous?.model??configuredAiGatewayModel(),model} as never)})`;
    return {model:setting.model as AiGatewayModelId,source:"admin" as const,updatedAt:setting.updated_at};
  });}finally{await sql.end();}
}

