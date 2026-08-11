import {createHash} from "node:crypto";
import {z} from "zod";

export const VEHICLE_MARKET_SOURCE="autotrader" as const;
export const VEHICLE_MARKET_SCOPE_VERSION="wa-used-listings/v1" as const;
export const VEHICLE_MARKET_ADAPTER_VERSION="autotrader/v1" as const;
export const VEHICLE_MARKET_PARSER_VERSION="vehicle-market-parser/v1" as const;
export const VEHICLE_MARKET_SCHEMA_VERSION="vehicle-market/v1" as const;
export const VEHICLE_MARKET_MODEL_VERSION="wa-vehicle-market/v1" as const;
export const VEHICLE_MARKET_PAGE_SIZE=50 as const;

const boundedText=z.string().trim().min(1).max(300);
const optionalFilter=z.string().trim().min(1).max(100).optional();

export const vehicleMarketScopeV1Schema=z.object({
  scopeVersion:z.literal(VEHICLE_MARKET_SCOPE_VERSION).default(VEHICLE_MARKET_SCOPE_VERSION),
  state:z.literal("wa").default("wa"),
  condition:z.literal("Used").default("Used"),
  sortBy:z.literal("listing_created").default("listing_created"),
  orderBy:z.literal("asc").default("asc"),
  pageSize:z.literal(VEHICLE_MARKET_PAGE_SIZE).default(VEHICLE_MARKET_PAGE_SIZE),
  make:optionalFilter,
  model:optionalFilter,
  yearFrom:z.number().int().min(1886).max(2200).optional(),
  yearTo:z.number().int().min(1886).max(2200).optional(),
  priceFrom:z.number().int().min(0).optional(),
  priceTo:z.number().int().min(0).optional(),
  fuelType:optionalFilter,
  transmissionType:optionalFilter,
  driveType:optionalFilter,
  bodyTypeGroup:optionalFilter,
}).strict().superRefine((scope,ctx)=>{
  if(scope.yearFrom&&scope.yearTo&&scope.yearFrom>scope.yearTo)ctx.addIssue({code:"custom",path:["yearTo"],message:"yearTo must be on or after yearFrom"});
  if(scope.priceFrom!=null&&scope.priceTo!=null&&scope.priceFrom>scope.priceTo)ctx.addIssue({code:"custom",path:["priceTo"],message:"priceTo must be at least priceFrom"});
});

export type VehicleMarketScopeV1=z.infer<typeof vehicleMarketScopeV1Schema>;

export const canonicalVehicleMarketScope=():VehicleMarketScopeV1=>vehicleMarketScopeV1Schema.parse({});

export type VehicleMarketRequestRole="capture"|"consistency_probe";

export type VehicleMarketRawPageManifestV1={
  schemaVersion:"vehicle-market-raw-page/v1";
  runId:string;
  source:typeof VEHICLE_MARKET_SOURCE;
  scopeVersion:typeof VEHICLE_MARKET_SCOPE_VERSION;
  requestRole:VehicleMarketRequestRole;
  pageNumber:number;
  attemptNumber:number;
  requestUrl:string;
  requestedAt:string;
  responseReceivedAt:string;
  durationMs:number;
  httpStatus:number;
  payloadSha256:string;
  responseBytes:number;
  objectPath:string;
  adapterVersion:typeof VEHICLE_MARKET_ADAPTER_VERSION;
  parserVersion:typeof VEHICLE_MARKET_PARSER_VERSION;
  sourceCurrentPage:number|null;
  sourceLastPage:number|null;
  sourceTotal:number|null;
  sourceReturned:number|null;
};

export type VehicleMarketReplayPageV1={
  requestRole:VehicleMarketRequestRole;
  pageNumber:number;
  attemptNumber?:number;
  requestUrl:string;
  requestedAt:string;
  responseReceivedAt:string;
  httpStatus:number;
  file?:string;
  objectPath?:string;
};

export const vehicleMarketReplayManifestV1Schema=z.object({
  schemaVersion:z.literal("vehicle-market-replay/v1"),
  runId:z.uuid(),
  observationDate:z.iso.date(),
  scope:vehicleMarketScopeV1Schema,
  pages:z.array(z.object({
    requestRole:z.enum(["capture","consistency_probe"]),
    pageNumber:z.number().int().positive(),
    attemptNumber:z.number().int().positive().optional(),
    requestUrl:z.url(),
    requestedAt:z.iso.datetime({offset:true}),
    responseReceivedAt:z.iso.datetime({offset:true}),
    httpStatus:z.number().int().min(100).max(599),
    file:boundedText.optional(),
    objectPath:boundedText.optional(),
  }).strict().superRefine((page,ctx)=>{
    if(Boolean(page.file)===Boolean(page.objectPath))ctx.addIssue({code:"custom",message:"Replay page requires exactly one of file or objectPath"});
  })).min(1),
}).strict();

export type VehicleMarketReplayManifestV1=z.infer<typeof vehicleMarketReplayManifestV1Schema>;

export type VehicleMarketPageMetadata={
  currentPage:number;
  lastPage:number;
  perPage:number;
  total:number;
  returned:number;
};

export type CanonicalListingObservationV1={
  schemaVersion:typeof VEHICLE_MARKET_SCHEMA_VERSION;
  source:typeof VEHICLE_MARKET_SOURCE;
  sourceListingId:string|null;
  listingKey:string|null;
  sourceRefId:string|null;
  canonicalUrl:string|null;
  sourceCreatedAt:string|null;
  sourceUpdatedAt:string|null;
  sourceStatus:string|null;
  condition:string|null;
  vehicleClass:string|null;
  isAuction:boolean|null;
  manufacturerYear:number|null;
  make:string|null;
  model:string|null;
  series:string|null;
  variant:string|null;
  bodyType:string|null;
  bodyTypeGroup:string|null;
  segment:string|null;
  transmission:string|null;
  driveType:string|null;
  fuelType:string|null;
  engineSizeL:number|null;
  cylinders:number|null;
  powerKw:number|null;
  seats:number|null;
  doors:number|null;
  safetyRating:number|null;
  odometerKm:number|null;
  regoExpiry:string|null;
  colour:string|null;
  advertisedPrice:number|null;
  driveawayPrice:number|null;
  sourcePriorAdvertisedPrice:number|null;
  sourcePriorPriceEndedAt:string|null;
  isDealer:boolean|null;
  isPrivate:boolean|null;
  isRegistered:boolean|null;
  isTopAd:boolean|null;
  sourceDealerId:string|null;
  sellerType:string|null;
  sellerName:string|null;
  sellerCity:string|null;
  sellerState:string|null;
  sellerSubscription:string|null;
  suburb:string|null;
  locationState:string|null;
  latitude:number|null;
  longitude:number|null;
  photoCount:number|null;
  hasVideo:boolean|null;
  description:string|null;
  featureTerms:string[];
  featureSetHash:string;
  vehicleSpecHash:string;
  sellerVersionHash:string;
  locationHash:string;
  contentHash:string;
  sourceRecordHash:string;
};

export type VehicleMarketRunStatus="COMPLETE"|"CHANGED_DURING_CAPTURE"|"PARTIAL"|"INVALID";

export type VehicleMarketRequestAttemptV1={
  requestRole:VehicleMarketRequestRole;
  pageNumber:number;
  attemptNumber:number;
  requestUrl:string;
  requestedAt:string;
  completedAt:string;
  durationMs:number;
  httpStatus:number|null;
  objectPath:string|null;
  payloadSha256:string|null;
  networkErrorCode:string|null;
};

export type VehicleMarketRunQualityV1={
  schemaVersion:"vehicle-market-run-quality/v1";
  runId:string;
  sourceTotal:number;
  sourceTotalStart:number;
  sourceTotalEnd:number;
  rawHits:number;
  uniqueListingIds:number;
  duplicateHits:number;
  scopeViolations:number;
  pagesExpected:number;
  pagesFetched:number;
  runStatus:VehicleMarketRunStatus;
  collectionDurationMs:number;
  vehicleClassProfile:Record<string,number>;
  missingVehicleClass:number;
  warnings:string[];
  errors:string[];
};

export type ProcessedVehicleMarketRun={
  runId:string;
  observationDate:string;
  scope:VehicleMarketScopeV1;
  requestAttempts:VehicleMarketRequestAttemptV1[];
  rawPages:VehicleMarketRawPageManifestV1[];
  observations:CanonicalListingObservationV1[];
  quality:VehicleMarketRunQualityV1;
};

export function canonicalJson(value:unknown):string{
  if(Array.isArray(value))return `[${value.map(canonicalJson).join(",")}]`;
  if(value&&typeof value==="object")return `{${Object.entries(value as Record<string,unknown>).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>`${JSON.stringify(key)}:${canonicalJson(item)}`).join(",")}}`;
  return JSON.stringify(value);
}

export function sha256Hex(value:string|Buffer){return createHash("sha256").update(value).digest("hex");}
export function valueHash(value:unknown){return sha256Hex(canonicalJson(value));}
