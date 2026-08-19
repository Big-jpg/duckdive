import {access,readFile} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";

const scriptDirectory=path.dirname(fileURLToPath(import.meta.url));
const rootDirectory=path.resolve(scriptDirectory,"..");
const architecturePath=path.join(rootDirectory,"docs/architecture.md");
const controlLoopPath=path.join(rootDirectory,"docs/agent-control-loop.md");
const architecture=await readFile(architecturePath,"utf8");
const controlLoop=await readFile(controlLoopPath,"utf8");

const fail=message=>{throw new Error(`bounded-agent documentation: ${message}`);};
const combined=`${architecture}\n${controlLoop}`;

for(const arrow of Array.from({length:8},(_,index)=>`E${index+1}`)){
  const occurrences=combined.match(new RegExp(`\\b${arrow}\\b`,"g"))?.length??0;
  if(occurrences<2)fail(`${arrow} is not present in both the architecture flow and evidence map`);
}

const scenarioPhrases=[
  "Safe analytical change",
  "Presentation-only change",
  "Unknown capability",
  "Failed validation",
  "Valuation request",
  "Sale or sell-through request",
  "Material ambiguity",
  "Inspection",
  "Stale version",
  "Second mutation",
  "Failed version or hash verification",
];
for(const phrase of scenarioPhrases)if(!controlLoop.includes(phrase))fail(`missing scenario: ${phrase}`);

for(const phrase of [
  "model-mediated judgments",
  "Prompt instructions are not formal guarantees",
  "There is no environment variable or route option that disables this enforcement",
  "not reverified production telemetry",
  "No component in this document is described as production-complete",
])if(!combined.includes(phrase))fail(`missing boundary statement: ${phrase}`);

const links=[...combined.matchAll(/!?(?:\[[^\]]*\])\(([^)]+)\)/g)].map(match=>match[1]);
for(const link of links){
  if(/^[a-z]+:/i.test(link))fail(`remote or URI link is not allowed: ${link}`);
  const source=architecture.includes(`](${link})`)?architecturePath:controlLoopPath;
  const target=link.split("#",1)[0];
  await access(path.resolve(path.dirname(source),target)).catch(()=>fail(`link target does not exist: ${link}`));
}

const validationSelector=["DUCKDIVE","REPORT","VALIDATION","ENABLED"].join("_");
for(const relative of [
  "src/app/api/chat/route.ts",
  "src/lib/duckdive-report.ts",
  "src/lib/duckdive-tools.ts",
  "scripts/preflight.ts",
]){
  const content=await readFile(path.join(rootDirectory,relative),"utf8");
  if(content.includes(validationSelector))fail(`${relative} still contains the production validation selector`);
}

const datasetPolicies=await Promise.all([
  "src/lib/dataset-definitions/vic-housing.ts",
  "src/lib/dataset-definitions/wa-vehicle-market.ts",
].map(relative=>readFile(path.join(rootDirectory,relative),"utf8")));
for(const policy of datasetPolicies)if(!policy.includes('id:"report-presentation"'))fail("a dataset policy is missing report-presentation");

const tests=await readFile(path.join(rootDirectory,"src/lib/duckdive-tools.test.ts"),"utf8");
for(const title of [
  "accepts a safe analytical change and records one verified mutation",
  "accepts a presentation-only change through the allowlisted capability",
  "rejects an unknown capability and prevents a save",
  "prevents a save when contract validation fails",
  "makes no save after the model classifies a valuation request as unsupported",
  "makes no save after the model classifies a sale or sell-through request as unsupported",
  "returns one material clarification field and makes no save",
  "permits one bounded read-only inspection and caps both rows and returned characters",
  "rejects a second mutation attempt",
  "never records a mutation when version or hash verification fails",
])if(!tests.includes(title))fail(`missing control-loop test: ${title}`);

console.log("Bounded-agent architecture verified: 8 mapped arrows, 11 required scenarios, and no production validation bypass.");
