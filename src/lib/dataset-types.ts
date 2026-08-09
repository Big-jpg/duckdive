export type DatasetPublicContract={
  scope:string;
  grains:readonly {name:string;grain:string}[];
  measures:Readonly<Record<string,string>>;
  dimensions:readonly string[];
  caveats:readonly string[];
};

export type DatasetStarterDefinition={
  key:string;
  title:string;
  label:string;
  description:string;
  outcome:string;
  entryPrompt:string;
  questions:readonly string[];
  file:string;
  accent:string;
};

export type DatasetReportCapability={id:string;label:string;examples:readonly string[]};
export type DatasetReportLimitation={id:string;label:string;reason:string};
export type DatasetReportAssumption={
  id:string;
  label:string;
  explanation?:string;
  source:"user-request"|"data-contract"|"report-default"|"model-inference";
  material:boolean;
};
export type DatasetReportScopeItem={id:string;label:string;values:readonly string[]};
export type DatasetReportDateRange={start:string;end:string;basis:"calendar-year"|"financial-year"|"rolling-period"};

export type DatasetReportPolicy={
  capabilities:readonly DatasetReportCapability[];
  limitations:readonly DatasetReportLimitation[];
  assumptions:readonly DatasetReportAssumption[];
  scopeItems:readonly DatasetReportScopeItem[];
  dateRange?:DatasetReportDateRange;
};

export type DatasetDefinition={
  key:string;
  default:boolean;
  title:string;
  description:string;
  kind:"historical"|"near-real-time";
  contractVersion:string;
  contract:unknown;
  publicContract:DatasetPublicContract;
  presentation:{badge:string;summary:string;boundary:string};
  starters:readonly DatasetStarterDefinition[];
  reportPolicy:DatasetReportPolicy;
  motherduck:{
    databaseEnv:string;
    databaseDefault:string;
    shareUrlEnv:string;
    serviceAccountEnv:string;
    serviceAccountDefault:string;
  };
  sourceTemplateValues:(runtime:DatasetRuntime)=>Readonly<Record<string,string>>;
  capabilities:{agentQuery:boolean;editing:boolean;publicShare:boolean};
};

export type DatasetRuntime={
  key:string;
  title:string;
  contractVersion:string;
  motherduckDatabase:string;
  motherduckShareUrl:string;
  serviceAccountUsername:string;
};

export type DatasetStarterManifest=Omit<DatasetStarterDefinition,"file">;

export type DatasetWorkspaceManifest={
  key:string;
  title:string;
  description:string;
  kind:DatasetDefinition["kind"];
  contractVersion:string;
  presentation:DatasetDefinition["presentation"];
  starters:readonly DatasetStarterManifest[];
};
