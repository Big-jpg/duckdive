import {randomBytes} from "node:crypto";

export const SHARE_SLUG_PATTERN=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function shareSlug(starterKey:string){
  const prefix=starterKey.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"dive";
  return `${prefix}-${randomBytes(10).toString("hex")}`;
}

export function validShareSlug(value:string){return value.length<=100&&SHARE_SLUG_PATTERN.test(value);}
