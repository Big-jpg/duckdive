"use client";

import dynamic from "next/dynamic";
import {useRef,useState,type DragEvent} from "react";
import {JOURNEY_LIMITS} from "@/lib/journey-state";
import {useJourney} from "./JourneyProvider";

const LakeScene=dynamic(()=>import("./LakeScene"),{ssr:false,loading:()=> <div className="lake-canvas lake-loading"/>});
const examples=["CSV","XLSX","JSON","PDF","TXT","…"];
const mib=(bytes:number)=>(bytes/1024/1024).toFixed(bytes>=10*1024*1024?0:1);

export default function LakeExperience(){
  const inputRef=useRef<HTMLInputElement>(null),[dragging,setDragging]=useState(false),{state,activity,notice,addFiles,reset}=useJourney();
  function drop(event:DragEvent){event.preventDefault();setDragging(false);const files=[...event.dataTransfer.items].filter(item=>item.kind==="file").map(item=>item.getAsFile()).filter((file):file is File=>Boolean(file));if(files.length)addFiles(files);}
  return <main id="main-content" className="lake-page">
    <section className="lake-heading"><p>Duckling Compute Node 01</p><h1>Throw it in the lake.</h1><span>A data lake tolerates the mess first. Structure can come later.</span></section>
    <section className={`lake-stage ${dragging?"dragging":""}`} onDragEnter={event=>{event.preventDefault();setDragging(true);}} onDragOver={event=>event.preventDefault()} onDragLeave={event=>{if(event.currentTarget===event.target)setDragging(false);}} onDrop={drop}>
      <LakeScene files={state.files} seed={state.visualSeed}/>
      <input ref={inputRef} className="sr-only" id="lake-files" type="file" multiple onChange={event=>{if(event.target.files)addFiles(event.target.files);event.target.value="";}}/>
      <label htmlFor="lake-files" className="lake-hit-area"><span className="sr-only">Choose files for the Duck Lake</span></label>
      <div className="lake-caption" aria-live="polite"><strong>{activity.label}</strong><span>{activity.ready} Lake-ready · {activity.queued} waiting</span></div>
    </section>
    <div className="file-examples" aria-label="Example accepted file types">{examples.map(item=><span key={item}>{item}</span>)}</div>
    <section className="lake-drop-card">
      <button onClick={()=>inputRef.current?.click()}><span aria-hidden="true">↥</span><strong>Drop files anywhere in the lake</strong><small>or click to browse</small></button>
      <p>All file types · 50 MiB each · {JOURNEY_LIMITS.fileCount} files</p>
      <em>Demo simulation — files stay in this browser.</em>
    </section>
    {state.files.length?<section className="lake-queue" aria-label="Files in the lake"><header><span>{state.files.length} objects · {mib(state.files.reduce((sum,file)=>sum+file.size,0))} MiB</span><button onClick={()=>{if(confirm("Clear every file from this simulated lake?"))reset();}}>Reset Lake</button></header><div>{state.files.map(file=><article key={file.id}><span>{file.extension}</span><p><strong>{file.name}</strong><small>{mib(file.size)} MiB · {file.status.replace("_"," ")}</small></p></article>)}</div></section>:null}
    {notice?<p className="lake-notice" role="status">{notice}</p>:null}
  </main>;
}
