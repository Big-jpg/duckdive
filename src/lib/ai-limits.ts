function positiveInteger(value:string|undefined,fallback:number){
  const parsed=Number(value);
  return Number.isInteger(parsed)&&parsed>0&&parsed<=10_000?parsed:fallback;
}

export function aiLimits(){
  return {
    perUserHourly:positiveInteger(process.env.AI_REMIX_REQUESTS_PER_HOUR,20),
    globalHourly:positiveInteger(process.env.AI_REMIX_GLOBAL_REQUESTS_PER_HOUR,100),
  };
}
