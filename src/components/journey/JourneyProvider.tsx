"use client";

import {createContext,useCallback,useContext,useEffect,useMemo,useState,type ReactNode} from "react";
import {advanceJourneyState,emptyJourneyState,intakeJourneyFiles,JOURNEY_STORAGE_KEY,journeyActivity,restoreJourneyState,type IntakeRejection,type JourneyState} from "@/lib/journey-state";

type JourneyContextValue={state:JourneyState;hydrated:boolean;notice:string;activity:ReturnType<typeof journeyActivity>;addFiles:(files:FileList|File[])=>void;reset:()=>void;clearForExit:()=>void};
const JourneyContext=createContext<JourneyContextValue|null>(null);

function rejectionMessage(rejections:readonly IntakeRejection[]){
  const counts=new Map<IntakeRejection["reason"],number>();for(const item of rejections)counts.set(item.reason,(counts.get(item.reason)||0)+1);
  return [...counts].map(([reason,count])=>`${count} ${reason==="duplicate"?"duplicate":reason==="file_too_large"?"over 50 MiB":reason==="file_limit"?"over the 10-file limit":"over the 250 MiB lake limit"}`).join(" · ");
}

export function JourneyProvider({children}:{children:ReactNode}){
  const [state,setState]=useState(()=>emptyJourneyState()),[hydrated,setHydrated]=useState(false),[notice,setNotice]=useState("");
  useEffect(()=>{const timer=window.setTimeout(()=>{setState(restoreJourneyState(sessionStorage.getItem(JOURNEY_STORAGE_KEY)));setHydrated(true);},0);return ()=>window.clearTimeout(timer);},[]);
  useEffect(()=>{if(hydrated)sessionStorage.setItem(JOURNEY_STORAGE_KEY,JSON.stringify(state));},[hydrated,state]);
  useEffect(()=>{
    const tick=()=>{if(!document.hidden)setState(current=>advanceJourneyState(current,Date.now()));};
    const timer=window.setInterval(tick,250);document.addEventListener("visibilitychange",tick);tick();
    return ()=>{window.clearInterval(timer);document.removeEventListener("visibilitychange",tick);};
  },[]);
  const addFiles=useCallback((value:FileList|File[])=>{
    const files=Array.from(value),now=Date.now();
    setState(current=>{const result=intakeJourneyFiles(files,current.files,now,(_file,index)=>crypto.randomUUID?.()||`${now}-${index}`);setNotice(result.rejected.length?rejectionMessage(result.rejected):result.accepted.length?`${result.accepted.length} ${result.accepted.length===1?"file":"files"} landed in the lake.`:"");return result.accepted.length?{...current,files:[...current.files,...result.accepted],visualSeed:current.visualSeed+result.accepted.length}:current;});
  },[]);
  const reset=useCallback(()=>{sessionStorage.removeItem(JOURNEY_STORAGE_KEY);setState(emptyJourneyState(Date.now()%10_000));setNotice("The lake is clear.");},[]);
  const clearForExit=useCallback(()=>{sessionStorage.removeItem(JOURNEY_STORAGE_KEY);setState(emptyJourneyState());setNotice("");},[]);
  const activity=useMemo(()=>journeyActivity(state.files),[state.files]);
  const context=useMemo(()=>({state,hydrated,notice,activity,addFiles,reset,clearForExit}),[state,hydrated,notice,activity,addFiles,reset,clearForExit]);
  return <JourneyContext.Provider value={context}>{children}</JourneyContext.Provider>;
}

export function useJourney(){const value=useContext(JourneyContext);if(!value)throw new Error("JourneyProvider is required");return value;}
