"use client";

import Link from "next/link";
import {useEffect,useRef,useState} from "react";
import {buildCsvDive,CsvDiveError,CSV_DIVE_LIMITS,csvDiveStorageKey,restoreCsvDive,type CsvDive} from "@/lib/csv-dive";
import styles from "./CsvDiveExperience.module.css";

const integer=new Intl.NumberFormat("en-AU");
const decimal=new Intl.NumberFormat("en-AU",{maximumFractionDigits:1});
const percent=new Intl.NumberFormat("en-AU",{style:"percent",maximumFractionDigits:1});
const bytes=new Intl.NumberFormat("en-AU",{style:"unit",unit:"kilobyte",maximumFractionDigits:0});

async function sha256(source:string){const hash=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(source));return [...new Uint8Array(hash)].map(value=>value.toString(16).padStart(2,"0")).join("");}

export default function CsvDiveExperience({ownerScope}:{ownerScope:string}){
  const inputRef=useRef<HTMLInputElement>(null),storageKey=csvDiveStorageKey(ownerScope);
  const [dive,setDive]=useState<CsvDive|null>(null),[hydrated,setHydrated]=useState(false),[processing,setProcessing]=useState(false),[error,setError]=useState("");
  useEffect(()=>{const timer=window.setTimeout(()=>{setDive(restoreCsvDive(sessionStorage.getItem(storageKey),ownerScope));setHydrated(true);},0);return ()=>window.clearTimeout(timer);},[ownerScope,storageKey]);
  useEffect(()=>{if(!hydrated)return;if(dive)sessionStorage.setItem(storageKey,JSON.stringify(dive));else sessionStorage.removeItem(storageKey);},[dive,hydrated,storageKey]);
  async function open(file:File){
    setProcessing(true);setError("");
    try{
      if(file.size>CSV_DIVE_LIMITS.fileBytes)throw new CsvDiveError("Choose a CSV no larger than 1 MiB for this first slice.");
      if(!file.name.toLowerCase().endsWith(".csv"))throw new CsvDiveError("Choose a file with a .csv extension.");
      const source=await file.text(),fingerprint=await sha256(source);
      setDive(buildCsvDive({ownerScope,fileName:file.name,fileSize:file.size,lastModified:file.lastModified,sha256:fingerprint,source}));
    }catch(reason){setError(reason instanceof Error?reason.message:"The CSV could not be inspected.");}
    finally{setProcessing(false);if(inputRef.current)inputRef.current.value="";}
  }
  function remove(){if(!confirm("Delete this local CSV Dive? The derived profile and preview will be removed from this tab."))return;sessionStorage.removeItem(storageKey);setDive(null);setError("");}
  if(!hydrated)return <main id="main-content" className={styles.page}><div className={styles.shell}><p role="status">Restoring your private workspace…</p></div></main>;
  if(!dive)return <main id="main-content" className={styles.page}><div className={styles.shell}>
    <header className={styles.topbar}><Link className={styles.back} href="/workspace">← Back to Workspace</Link><span>Private local import</span></header>
    <section className={styles.intro}><p className={styles.kicker}>CSV → Inspectable Dive</p><h1>Turn 1 small file into something you can inspect.</h1><p>Choose a CSV deliberately. DuckDive reads it in this browser tab, derives a profile and a visual answer, and does not upload the file.</p></section>
    <section className={styles.importCard} aria-labelledby="csv-open-heading"><div><h2 id="csv-open-heading">Choose 1 CSV</h2><p>Header row required · up to {integer.format(CSV_DIVE_LIMITS.rows)} rows · {CSV_DIVE_LIMITS.columns} columns</p><small>The derived Dive stays in this authenticated owner session until you delete it, sign out, or close the tab.</small></div><div><input ref={inputRef} hidden type="file" name="csv-file" accept=".csv,text/csv" onChange={event=>{const file=event.target.files?.[0];if(file)void open(file);}}/><button className={styles.button} disabled={processing} onClick={()=>inputRef.current?.click()}>{processing?"Inspecting CSV…":"Choose CSV"}</button></div></section>
    {error?<p className={styles.error} role="alert">{error}</p>:null}
    <section className={styles.privacy} aria-label="Import boundaries"><article><strong>Explicit</strong><span>Nothing is read until you choose the file.</span></article><article><strong>Local</strong><span>No raw rows or credentials cross a server boundary.</span></article><article><strong>Disposable</strong><span>Delete the result with 1 confirmed action.</span></article></section>
  </div></main>;
  const maximum=Math.max(...dive.chart.values.map(value=>Math.abs(value)),1);
  return <main id="main-content" className={styles.page}><div className={styles.shell}>
    <header className={styles.topbar}><Link className={styles.back} href="/workspace">← Back to Workspace</Link><span>Owner-isolated · Browser local</span></header>
    <section className={styles.diveHeader}><div><p className={styles.kicker}>Your CSV Dive</p><h1>{dive.file.name}</h1><p>A deterministic first read of the file: shape, completeness, leading values, and a bounded row preview.</p></div><div className={styles.actions}><button className={styles.secondary} onClick={()=>inputRef.current?.click()}>Replace CSV</button><button className={styles.danger} onClick={remove}>Delete Dive</button><input ref={inputRef} hidden type="file" name="replacement-csv-file" accept=".csv,text/csv" onChange={event=>{const file=event.target.files?.[0];if(file)void open(file);}}/></div></section>
    {error?<p className={styles.error} role="alert">{error}</p>:null}
    <ul className={styles.provenance} aria-label="Dive provenance"><li>{bytes.format(dive.file.size/1024)}</li><li>Imported <time dateTime={dive.importedAt}>{new Intl.DateTimeFormat("en-AU",{dateStyle:"medium",timeStyle:"short"}).format(new Date(dive.importedAt))}</time></li><li><code translate="no">SHA-256 {dive.file.sha256.slice(0,12)}…</code></li><li>Raw file not uploaded</li></ul>
    <section className={styles.kpis} aria-label="CSV summary"><article><span>Rows</span><strong>{integer.format(dive.rowCount)}</strong></article><article><span>Columns</span><strong>{integer.format(dive.columns.length)}</strong></article><article><span>Complete cells</span><strong>{percent.format(dive.completeness)}</strong></article><article><span>Numeric measures</span><strong>{integer.format(dive.columns.filter(column=>column.kind==="number").length)}</strong></article></section>
    <section className={styles.chartCard} aria-labelledby="csv-chart-heading"><header className={styles.sectionHeader}><div><h2 id="csv-chart-heading">{dive.chart.title}</h2><p>{dive.chart.description}</p></div><span>{dive.chart.valueLabel}</span></header><p className={styles.insight}>{dive.insight}</p><div className={styles.bars}>{dive.chart.labels.map((label,index)=><div className={styles.bar} key={`${label}-${index}`}><span title={label}>{label}</span><div className={styles.track}><i style={{width:`${Math.max(2,Math.abs(dive.chart.values[index])/maximum*100)}%`}}/></div><strong>{decimal.format(dive.chart.values[index])}</strong></div>)}</div></section>
    <section className={styles.profile} aria-labelledby="csv-profile-heading"><header className={styles.sectionHeader}><div><h2 id="csv-profile-heading">Column Profile</h2><p>Inferred types are descriptive evidence, not a persisted semantic contract.</p></div></header><div className={styles.profileGrid}>{dive.columns.map(column=><article className={styles.column} key={column.name}><header><strong title={column.name}>{column.name}</strong><span>{column.kind}</span></header><dl><dt>Filled</dt><dd>{integer.format(column.nonEmpty)}</dd><dt>Missing</dt><dd>{integer.format(column.missing)}</dd><dt>Unique</dt><dd>{integer.format(column.unique)}</dd>{column.kind==="number"?<><dt>Range</dt><dd>{decimal.format(column.minimum??0)}–{decimal.format(column.maximum??0)}</dd><dt>Mean</dt><dd>{decimal.format(column.mean??0)}</dd></>:null}</dl>{column.examples.length?<p className={styles.examples}>Examples: {column.examples.join(" · ")}</p>:null}</article>)}</div></section>
    <section className={styles.preview} aria-labelledby="csv-preview-heading"><header className={styles.sectionHeader}><div><h2 id="csv-preview-heading">Row Preview</h2><p>First {integer.format(dive.preview.length)} rows only. The full file is not retained.</p></div></header><div className={styles.tableWrap}><table><thead><tr>{dive.columns.map(column=><th key={column.name} scope="col">{column.name}</th>)}</tr></thead><tbody>{dive.preview.map((row,rowIndex)=><tr key={rowIndex}>{row.map((value,columnIndex)=><td key={`${rowIndex}-${columnIndex}`} title={value}>{value||"—"}</td>)}</tr>)}</tbody></table></div></section>
  </div></main>;
}
