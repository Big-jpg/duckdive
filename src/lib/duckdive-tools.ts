import {tool,type ToolSet} from "ai";
import {z} from "zod";
import type {MCPClient} from "@ai-sdk/mcp";
import {duckDiveRunIsActive} from "./duckdive-db";
import {verifyDiveRevision,type DiveSnapshot} from "./duckdive-runtime";
import type {DatasetRuntime} from "./datasets";
import {duckDivePublicContract} from "./duckdive-contract";
import {validateReportUpdatePlan,type ReportUpdatePlan} from "./duckdive-report";

export type VerifiedMutation={before:DiveSnapshot;after:DiveSnapshot;summary:string};

export function boundedDuckDiveResult(value:unknown){
  const serialized=JSON.stringify(value);
  if(serialized.length<=12_000)return value;
  return {truncated:true,json:serialized.slice(0,12_000),note:"Result truncated to the first 12,000 characters."};
}

export function governedReadOnlyQuery(sql:string){
  const statement=sql.trim().replace(/;\s*$/,""),forbidden=/\b(attach|copy|install|load|create|insert|update|delete|drop|alter|call|export|import|pragma|set|secret|httpfs)\b/i;
  if(!/^(select|with)\b/i.test(statement)||forbidden.test(statement)||statement.includes(";"))throw new Error("inspect_data accepts one read-only SELECT query");
  return `SELECT * FROM (${statement}) AS duckdive_inspection LIMIT 200`;
}

export async function createDuckDiveTools(input:{client:MCPClient;runId:string;diveId:string;username:string;before:DiveSnapshot;dataset:DatasetRuntime;publicContract?:Parameters<typeof validateReportUpdatePlan>[1]}){
  const mcp=await input.client.tools(),query=mcp.query,edit=mcp.edit_dive_content;
  if(!query?.execute||!edit?.execute)throw new Error("MotherDuck editing tools are unavailable");
  let mutation:VerifiedMutation|null=null,mutationAttempted=false,plan:ReportUpdatePlan|null=null;
  const tools:ToolSet={
    prepare_report_update:tool({
      description:"Before editing, convert the request into the required structured intent and change manifest fields. Use only capability IDs from the supplied contract. If the request is unsupported or materially ambiguous, set unsupportedRequests or materialClarification and do not attempt a save.",
      inputSchema:z.any(),
      execute:async(value)=>{
        if(!await duckDiveRunIsActive(input.runId))throw new Error("DuckDive run is no longer active");
        const checked=validateReportUpdatePlan(value,input.publicContract||duckDivePublicContract);if(!checked.ok){plan=null;return {accepted:false,error:checked.error};}
        plan=checked.plan;return {accepted:!plan.unsupportedRequests.length&&!plan.materialClarification,unsupportedRequests:plan.unsupportedRequests,materialClarification:plan.materialClarification,capabilityIds:plan.capabilityIds};
      },
    }),
    inspect_data:tool({
      description:`Run one bounded read-only query against the governed ${input.dataset.title} dataset when the supplied semantic contract and current Dive source are insufficient. Do not use this for schema discovery.`,
      inputSchema:z.object({purpose:z.string().trim().min(1).max(240),sql:z.string().trim().min(1).max(4_000)}),
      execute:async({purpose,sql},options)=>{
        if(!await duckDiveRunIsActive(input.runId))throw new Error("DuckDive run is no longer active");
        const result=await query.execute!({database:input.dataset.motherduckDatabase,sql:governedReadOnlyQuery(sql)},options);
        return {purpose,result:boundedDuckDiveResult(result)};
      },
    }),
    save_dive_revision:tool({
      description:"Apply one validated revision to the active Dive. Use exact, minimal text replacements against the supplied current source. Call only when the request is clear and the complete revision is ready.",
      inputSchema:z.object({summary:z.string().trim().min(1).max(500),edits:z.array(z.object({old_string:z.string().min(1).max(60_000),new_string:z.string().max(60_000),replace_all:z.boolean().optional()})).min(1).max(12)}),
      execute:async({summary,edits},options)=>{
        if(mutationAttempted)throw new Error("A Dive revision has already been attempted in this run");
        if(!await duckDiveRunIsActive(input.runId))throw new Error("DuckDive run is no longer active");
        if(!plan)throw new Error("Prepare the structured report update before saving");
        if(plan.unsupportedRequests.length||plan.materialClarification)throw new Error("The structured report plan does not authorize a save");
        mutationAttempted=true;
        await edit.execute!({id:input.diveId,edits},options);
        const after=await verifyDiveRevision(input.diveId,input.username,input.before);
        mutation={before:input.before,after,summary};
        return {saved:true,beforeVersion:input.before.version,afterVersion:after.version,summary};
      },
    }),
  };
  return {tools,getMutation:()=>mutation,getPlan:()=>plan};
}
