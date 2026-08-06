import {z} from "zod";
import {motherduckControlMcp} from "./motherduck-access";

const runStatusSchema=z.enum(["PENDING","RUNNING","SUCCEEDED","FAILED","CANCELLED"]);
const timestampSchema=z.string().max(64);
const flightOutputSchema=z.looseObject({success:z.boolean(),flight:z.looseObject({flight_name:z.string().max(120),status:z.string().max(40),schedule_cron:z.string().max(120).nullable(),current_version:z.number().int().positive(),version_info:z.looseObject({max_runtime_sec:z.number().int().nonnegative()})})});
const runsOutputSchema=z.looseObject({success:z.boolean(),runs:z.array(z.looseObject({run_number:z.number().int().positive(),flight_version:z.number().int().positive(),status:runStatusSchema,created_at:timestampSchema,started_at:timestampSchema.nullable(),ended_at:timestampSchema.nullable(),exit_code:z.number().int().nullable()})).max(1)});
const flightIdSchema=z.uuid();

export type SafeFlightRun={number:number;version:number;status:z.infer<typeof runStatusSchema>;createdAt:string;startedAt:string|null;endedAt:string|null;exitCode:number|null;queueMs:number|null;durationMs:number|null};
export type SafeFlightStatus={availability:"live"|"unconfigured"|"unavailable";checkedAt:string;name:string;definition:null|{status:string;version:number;schedule:"on_demand"|"scheduled";maxRuntimeSec:number};latestRun:SafeFlightRun|null};
type FlightStatusEnv={MOTHERDUCK_DEMO_FLIGHT_ID?:string;MOTHERDUCK_TOKEN?:string};

const elapsed=(start:string|null,end:string|null)=>{if(!start||!end)return null;const value=Date.parse(end)-Date.parse(start);return Number.isFinite(value)&&value>=0?value:null;};

export function safeFlightStatus(flightResult:unknown,runsResult:unknown,checkedAt=new Date().toISOString()):SafeFlightStatus{
  const flight=flightOutputSchema.parse(flightResult),runs=runsOutputSchema.parse(runsResult);
  if(!flight.success||!runs.success)throw new Error("MotherDuck Flight status request failed");
  const latest=runs.runs[0]||null;
  return {
    availability:"live",
    checkedAt,
    name:flight.flight.flight_name,
    definition:{status:flight.flight.status,version:flight.flight.current_version,schedule:flight.flight.schedule_cron?"scheduled":"on_demand",maxRuntimeSec:flight.flight.version_info.max_runtime_sec},
    latestRun:latest?{number:latest.run_number,version:latest.flight_version,status:latest.status,createdAt:latest.created_at,startedAt:latest.started_at,endedAt:latest.ended_at,exitCode:latest.exit_code,queueMs:elapsed(latest.created_at,latest.started_at),durationMs:elapsed(latest.started_at,latest.ended_at)}:null,
  };
}

const fallback=(availability:"unconfigured"|"unavailable"):SafeFlightStatus=>({availability,checkedAt:new Date().toISOString(),name:"duckdive-flight-01",definition:null,latestRun:null});

export async function getDemoFlightStatus(env:FlightStatusEnv=process.env as FlightStatusEnv):Promise<SafeFlightStatus>{
  const parsedId=flightIdSchema.safeParse(env.MOTHERDUCK_DEMO_FLIGHT_ID?.trim());
  const token=env.MOTHERDUCK_TOKEN?.trim();
  if(!parsedId.success||!token||token==="[SENSITIVE]")return fallback("unconfigured");
  try{
    const client=await motherduckControlMcp(),tools=await client.tools({schemas:{
      get_flight:{inputSchema:z.object({id:z.string()}),outputSchema:flightOutputSchema},
      list_flight_runs:{inputSchema:z.object({id:z.string(),limit:z.number().int().positive().optional()}),outputSchema:runsOutputSchema},
    }}),options={toolCallId:"duckdive-flight-status",messages:[],abortSignal:AbortSignal.timeout(8_000)};
    const [flight,runs]=await Promise.all([tools.get_flight.execute({id:parsedId.data},options),tools.list_flight_runs.execute({id:parsedId.data,limit:1},options)]);
    return safeFlightStatus(flight,runs);
  }catch(error){
    console.error("MotherDuck Flight status unavailable",{kind:error instanceof Error?error.name:"UnknownError"});
    return fallback("unavailable");
  }
}
