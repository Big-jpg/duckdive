import {z} from "zod";

export const analyticsPolicy={
  priceAud:{minimum:50_000,maximum:20_000_000},
  landSizeSqm:{minimum:50,maximum:10_000},
  bedrooms:{filterMaximum:20,displayMaximum:6},
} as const;

const suburbKey=z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120);
const isoDate=z.iso.date();

function validatePeriodAndState(value:{from?:string;to?:string;suburb_key?:string},ctx:z.RefinementCtx,state:string){
  if(value.from&&value.to&&value.from>value.to)ctx.addIssue({code:"custom",path:["to"],message:"to must be on or after from"});
  if(value.suburb_key&&!value.suburb_key.startsWith(`${state.toLowerCase()}-`))ctx.addIssue({code:"custom",path:["suburb_key"],message:`suburb_key must belong to ${state}`});
}

export function insightsQuerySchema(state:string){return z.object({
  suburb_key:suburbKey,
  from:isoDate,
  to:isoDate,
  bedrooms:z.coerce.number().int().min(1).max(analyticsPolicy.bedrooms.filterMaximum).optional(),
}).strict().superRefine((value,ctx)=>validatePeriodAndState(value,ctx,state));}

export function salesQuerySchema(state:string){return z.object({
  suburb_key:suburbKey.optional(),
  suburb:z.string().trim().min(1).max(100).optional(),
  postcode:z.string().regex(/^\d{4}$/).optional(),
  from:isoDate.optional(),
  to:isoDate.optional(),
  bedrooms:z.coerce.number().int().min(1).max(analyticsPolicy.bedrooms.filterMaximum).optional(),
  limit:z.coerce.number().int().min(1).max(5000).default(1200),
}).strict().superRefine((value,ctx)=>validatePeriodAndState(value,ctx,state));}

export const analyticsDefinitions={
  volume:"All published detached-house sale observations, including observations without a reported price.",
  price:`Reported prices from AUD ${analyticsPolicy.priceAud.minimum.toLocaleString("en-AU")} to ${analyticsPolicy.priceAud.maximum.toLocaleString("en-AU")}; null and out-of-range prices are excluded from price statistics.`,
  land:`Reported land sizes from ${analyticsPolicy.landSizeSqm.minimum.toLocaleString("en-AU")} to ${analyticsPolicy.landSizeSqm.maximum.toLocaleString("en-AU")} m².`,
  comparison:"The immediately preceding period with the same inclusive number of days.",
} as const;

export function jsonNumbers(row:Record<string,unknown>|undefined,keys:readonly string[]){
  if(!row)return null;
  const result:Record<string,unknown>={...row};
  for(const key of keys)if(result[key]!=null)result[key]=Number(result[key]);
  return result;
}

export function jsonDate(value:unknown){
  if(value instanceof Date)return value.toISOString().slice(0,10);
  return value==null?null:String(value).slice(0,10);
}
