export function readableDuckDiveError(error:Error|null){
  const raw=error?.message?.trim();if(!raw)return "The request did not start.";
  let message=raw;try{const parsed=JSON.parse(raw) as {error?:unknown};if(typeof parsed.error==="string")message=parsed.error;}catch{}
  if(message.includes("already running"))return "Another update is still being verified. Wait a moment, then try again.";
  return message;
}
