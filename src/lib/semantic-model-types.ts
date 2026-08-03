import {z} from "zod";

export const SEMANTIC_CONTRACT_SCHEMA_VERSION="semantic-contract/v1" as const;
export type EvidenceProvenance="declared"|"inferred"|"user-confirmed";
export type SourceSummary="Import"|"DirectQuery"|"Direct Lake"|"Composite/Mixed Mode"|"Unknown";

export type SemanticDiagnostic={
  code:string;
  severity:"warning"|"error";
  message:string;
  file?:string;
  line?:number;
};

export type ParsedSemanticColumn={
  name:string;
  description:string;
  dataType:string;
  isHidden:boolean;
  isKey:boolean;
  formatString:string;
  summarizeBy:string;
};

export type ParsedSemanticMeasure={
  name:string;
  description:string;
  expression:string;
  formatString:string;
  file:string;
  line:number;
};

export type ParsedSemanticPartition={name:string;type:string;mode:string};
export type ParsedSemanticTable={
  name:string;
  description:string;
  columns:ParsedSemanticColumn[];
  measures:ParsedSemanticMeasure[];
  partitions:ParsedSemanticPartition[];
  hasHierarchy:boolean;
  hasCalculationGroup:boolean;
};

export type ParsedSemanticRelationship={
  id:string;
  fromTable:string;
  fromColumn:string;
  toTable:string;
  toColumn:string;
  fromCardinality:string;
  toCardinality:string;
  isActive:boolean;
  crossFilteringBehavior:string;
  securityFilteringBehavior:string;
  file:string;
  line:number;
};

export type ParsedSemanticRole={name:string;affectedTables:string[]};

export type LocalSemanticEvidence={
  displayName:string;
  archiveFingerprint:string;
  sourceSummary:SourceSummary;
  tables:ParsedSemanticTable[];
  relationships:ParsedSemanticRelationship[];
  roles:ParsedSemanticRole[];
  diagnostics:SemanticDiagnostic[];
};

const provenanceSchema=z.enum(["declared","inferred","user-confirmed"]);
const safeText=z.string().trim().max(10_000);
const nameText=z.string().trim().min(1).max(300);

export const reviewedSemanticContractV1Schema=z.object({
  schemaVersion:z.literal(SEMANTIC_CONTRACT_SCHEMA_VERSION),
  identity:z.object({
    displayName:nameText,
    sourceFormat:z.literal("fabric-tmdl"),
    archiveFingerprint:z.string().regex(/^[a-f0-9]{64}$/),
    contractFingerprint:z.string().regex(/^[a-f0-9]{64}$/),
  }),
  entities:z.array(z.object({
    name:nameText,
    description:safeText,
    purpose:safeText.min(1),
    grain:safeText.min(1),
    provenance:z.object({purpose:z.literal("user-confirmed"),grain:z.literal("user-confirmed")}),
    columns:z.array(z.object({
      name:nameText,
      description:safeText,
      dataType:z.string().trim().max(100),
      isHidden:z.boolean(),
      isKey:z.boolean(),
      provenance:provenanceSchema,
    })).min(1).max(2_000),
  })).min(1).max(500),
  measures:z.array(z.object({
    table:nameText,
    name:nameText,
    description:safeText,
    dax:z.string().trim().min(1).max(100_000),
    formatString:z.string().max(2_000),
    provenance:z.literal("user-confirmed"),
  })).max(5_000),
  relationships:z.array(z.object({
    fromEntity:nameText,
    fromColumn:nameText,
    toEntity:nameText,
    toColumn:nameText,
    fromCardinality:z.string().trim().max(100),
    toCardinality:z.string().trim().max(100),
    active:z.boolean(),
    crossFilteringBehavior:z.string().trim().max(100),
    securityFilteringBehavior:z.string().trim().max(100),
    provenance:z.literal("user-confirmed"),
  })).max(5_000),
  sourceSummary:z.enum(["Import","DirectQuery","Direct Lake","Composite/Mixed Mode","Unknown"]),
  securitySummary:z.object({roleCount:z.number().int().min(0).max(10_000),affectedTables:z.array(nameText).max(500)}).optional(),
  diagnostics:z.array(z.object({code:nameText,message:safeText,acknowledged:z.literal(true)})).max(2_000),
}).strict();

export type ReviewedSemanticContractV1=z.infer<typeof reviewedSemanticContractV1Schema>;

const forbiddenKey=/(^|_)(raw|zip|tmdl|connection|string|server|host|workspace|lakehouse|warehouse|endpoint|m_expression|source_expression)($|_)/i;
const forbiddenNormalizedKeys=["rawtmdl","zipbytes","archivebytes","connectionstring","serverurl","hostname","workspaceid","lakehouseid","warehouseid","endpoint","mexpression","sourceexpression"];
const forbiddenValue=/(?:https?:\/\/|onelake\.dfs\.fabric\.microsoft\.com|(?:server|database)\s*=)/i;

export function semanticContractPrivacyIssues(value:unknown,path="contract"):string[]{
  if(typeof value==="string")return forbiddenValue.test(value)?[`${path} contains connectivity detail`]:[];
  if(Array.isArray(value))return value.flatMap((item,index)=>semanticContractPrivacyIssues(item,`${path}[${index}]`));
  if(!value||typeof value!=="object")return [];
  return Object.entries(value as Record<string,unknown>).flatMap(([key,item])=>[
    ...((forbiddenKey.test(key)||forbiddenNormalizedKeys.some(value=>key.replace(/[^a-z0-9]/gi,"").toLowerCase().includes(value)))?[`${path}.${key} is not an allowed persisted field`]:[]),
    ...semanticContractPrivacyIssues(item,`${path}.${key}`),
  ]);
}

export function canonicalJson(value:unknown):string{
  if(Array.isArray(value))return `[${value.map(canonicalJson).join(",")}]`;
  if(value&&typeof value==="object")return `{${Object.entries(value as Record<string,unknown>).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>`${JSON.stringify(key)}:${canonicalJson(item)}`).join(",")}}`;
  return JSON.stringify(value);
}

export function semanticContractFingerprintInput(contract:ReviewedSemanticContractV1){
  const clone=structuredClone(contract) as ReviewedSemanticContractV1;
  clone.identity.contractFingerprint="0".repeat(64);
  return canonicalJson(clone);
}

export async function sha256Hex(value:ArrayBuffer|string):Promise<string>{
  const bytes=typeof value==="string"?new TextEncoder().encode(value):value;
  const digest=await crypto.subtle.digest("SHA-256",bytes);
  return [...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,"0")).join("");
}
