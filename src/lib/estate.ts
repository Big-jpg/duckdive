import { z } from "zod";

const stateSchema=z.string().trim().toUpperCase().regex(/^[A-Z]{2,3}$/);

export type EstateConfig={
  state:string;
  name:string;
  sourceDirectory:string;
  motherduckDatabase:string;
  propertyType:string;
};

export function estateConfig(env:Record<string,string|undefined>=process.env):EstateConfig{
  return {
    state:stateSchema.parse(env.ESTATE_STATE||"VIC"),
    name:(env.ESTATE_NAME||"VIC House Data Lab").trim(),
    sourceDirectory:(env.ESTATE_SOURCE_DIRECTORY||"../rea_sales_data_model/VIC").trim(),
    motherduckDatabase:(env.MOTHERDUCK_DATABASE||"vic_house_data").trim(),
    propertyType:(env.ESTATE_PROPERTY_TYPE||"House").trim(),
  };
}

export type SourceFileMetadata={state:string;postcode:string|null};

export function sourceFileMetadata(fileName:string,fallbackState=estateConfig().state):SourceFileMetadata{
  const match=fileName.match(/-([A-Z]{2,3})-_([0-9]{4})_\.csv$/i);
  return {state:(match?.[1]||fallbackState).toUpperCase(),postcode:match?.[2]||null};
}

export function suburbKey(state:string,suburb:string){
  const slug=suburb.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
  return `${state.toLowerCase()}-${slug}`;
}
