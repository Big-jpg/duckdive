function positiveInteger(value:string|undefined,fallback:number){
  const parsed=Number(value);
  return Number.isInteger(parsed)&&parsed>0&&parsed<=100_000?parsed:fallback;
}

export function publicShareLimits(){
  return {
    perVisitorHourly:positiveInteger(process.env.PUBLIC_SHARE_REQUESTS_PER_HOUR,30),
    globalHourly:positiveInteger(process.env.PUBLIC_SHARE_GLOBAL_REQUESTS_PER_HOUR,300),
  };
}
