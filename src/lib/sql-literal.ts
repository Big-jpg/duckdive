import {createHash} from "node:crypto";
export function mdString(value:string){for(let i=0;i<16;i++){const tag=`mdq_${createHash("sha256").update(String(i)).update(value).digest("hex").slice(0,16)}`,delimiter=`$${tag}$`;if(!value.includes(delimiter))return `${delimiter}${value}${delimiter}`;}throw new Error("Unable to quote MotherDuck string");}
export function positiveInteger(value:unknown){const number=Number(value);if(!Number.isSafeInteger(number)||number<1)throw new Error("version must be a positive integer");return String(number);}
