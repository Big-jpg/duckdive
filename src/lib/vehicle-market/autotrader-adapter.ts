import {z} from "zod";
import {
  VEHICLE_MARKET_ADAPTER_VERSION,
  VEHICLE_MARKET_PAGE_SIZE,
  VEHICLE_MARKET_PARSER_VERSION,
  VEHICLE_MARKET_SCHEMA_VERSION,
  VEHICLE_MARKET_SOURCE,
  canonicalJson,
  valueHash,
  type CanonicalListingObservationV1,
  type VehicleMarketPageMetadata,
  type VehicleMarketScopeV1,
} from "./contracts";

export const AUTOTRADER_SEARCH_URL="https://listings.platform.autotrader.com.au/api/v3/search";

const responseSchema=z.object({
  current_page:z.number().int().positive(),
  last_page:z.number().int().positive(),
  per_page:z.number().int().positive(),
  total:z.number().int().nonnegative(),
  data:z.array(z.unknown()),
}).passthrough();

type SourceRecord=Record<string,unknown>;

export type ParsedVehicleMarketPage={metadata:VehicleMarketPageMetadata;observations:CanonicalListingObservationV1[]};
export type ListingValidation={valid:boolean;issues:string[]};

function record(value:unknown):SourceRecord|undefined{return value&&typeof value==="object"&&!Array.isArray(value)?value as SourceRecord:undefined;}
function text(value:unknown):string|null{return typeof value==="string"&&value.trim()?value.trim():typeof value==="number"?String(value):null;}
function numberValue(value:unknown):number|null{
  if(typeof value==="number"&&Number.isFinite(value))return value;
  if(typeof value==="string"&&value.trim()&&Number.isFinite(Number(value)))return Number(value);
  return null;
}
function booleanValue(value:unknown):boolean|null{return typeof value==="boolean"?value:value===0?false:value===1?true:null;}
function nested(source:SourceRecord,key:string){return record(source[key]);}
function firstText(...values:unknown[]){for(const value of values){const candidate=text(value);if(candidate!=null)return candidate;}return null;}
function firstNumber(...values:unknown[]){for(const value of values){const candidate=numberValue(value);if(candidate!=null)return candidate;}return null;}

function normalizeFeatureTerms(value:unknown):string[]{
  const values=Array.isArray(value)?value:typeof value==="string"?value.split(","):[];
  return [...new Set(values.map(item=>text(item)?.replace(/\s+/g," ").trim()).filter((item):item is string=>Boolean(item)))].sort((a,b)=>a.localeCompare(b));
}

function canonicalUrl(value:unknown){
  const candidate=text(value);if(!candidate)return null;
  if(/^https?:\/\//i.test(candidate))return candidate;
  return `https://www.autotrader.com.au/${candidate.replace(/^\/+/,"")}`;
}

export function buildAutotraderUrl(scope:VehicleMarketScopeV1,page:number){
  if(!Number.isInteger(page)||page<1)throw new Error("Source page must be a positive integer");
  const url=new URL(AUTOTRADER_SEARCH_URL),params=url.searchParams;
  params.set("state",scope.state);params.set("condition",scope.condition);params.set("sortBy",scope.sortBy);params.set("orderBy",scope.orderBy);params.set("paginate",String(VEHICLE_MARKET_PAGE_SIZE));params.set("page",String(page));
  const optional:[string,string|number|undefined][]=[
    ["make",scope.make],["model",scope.model],["yearFrom",scope.yearFrom],["yearTo",scope.yearTo],["priceFrom",scope.priceFrom],["priceTo",scope.priceTo],
    ["fuel_type",scope.fuelType],["transmission_type",scope.transmissionType],["drive_type",scope.driveType],["body_type_group",scope.bodyTypeGroup],
  ];
  for(const [key,value] of optional)if(value!=null)params.set(key,String(value));
  return url.toString();
}

export class AutotraderVehicleMarketAdapter{
  readonly source=VEHICLE_MARKET_SOURCE;
  readonly adapterVersion=VEHICLE_MARKET_ADAPTER_VERSION;
  readonly parserVersion=VEHICLE_MARKET_PARSER_VERSION;

  parsePage(bytes:Buffer):ParsedVehicleMarketPage{
    let json:unknown;
    try{json=JSON.parse(bytes.toString("utf8"));}catch{throw new Error("Source response is not valid JSON");}
    const parsed=responseSchema.safeParse(json);
    if(!parsed.success)throw new Error("Source response pagination shape is invalid");
    if(parsed.data.per_page!==VEHICLE_MARKET_PAGE_SIZE)throw new Error(`Source per_page must equal ${VEHICLE_MARKET_PAGE_SIZE}`);
    if(parsed.data.current_page>parsed.data.last_page+1)throw new Error("Source current_page exceeds the defensive terminal page");
    const observations=parsed.data.data.map((hit,index)=>{
      const wrapper=record(hit);if(!wrapper)throw new Error(`Source hit ${index+1} is not an object`);
      const source=record(wrapper._source)??wrapper;
      return this.normalizeListing(source);
    });
    return {metadata:{currentPage:parsed.data.current_page,lastPage:parsed.data.last_page,perPage:parsed.data.per_page,total:parsed.data.total,returned:parsed.data.data.length},observations};
  }

  normalizeListing(source:SourceRecord):CanonicalListingObservationV1{
    const vehicle=nested(source,"vehicle")??{},price=nested(source,"price")??{},pricingHistory=nested(source,"pricingHistory")??{},dealer=nested(source,"dealer")??{},location=nested(source,"location")??{};
    const sourceListingId=firstText(source.id,source.listing_id),featureTerms=normalizeFeatureTerms(source.featureSearchTerms),description=text(source.description);
    const isDealer=booleanValue(source.is_dealer),isPrivate=booleanValue(source.is_private),sellerType=isDealer===true?"Dealer":isPrivate===true?"Private":null;
    const manufacturerYear=firstNumber(source.manu_year,source.manufacturer_year);
    const locationState=firstText(source.location_state,location.state,source.state);
    const sellerState=firstText(dealer.state,locationState);
    const sourceRecordHash=valueHash(source);
    const vehicleSpec={manufacturerYear,make:text(source.make),model:text(source.model),series:text(source.series),variant:text(source.variant),bodyType:firstText(vehicle.body_type,source.body_type),bodyTypeGroup:firstText(vehicle.body_type_group,source.body_type_group),segment:firstText(vehicle.segment,source.segment),transmission:firstText(vehicle.transmission_type,source.transmission_type),driveType:firstText(vehicle.drive_type,source.drive_type),fuelType:firstText(vehicle.fuel_type,source.fuel_type),engineSizeL:firstNumber(vehicle.engine_size,source.engine_size_l),cylinders:firstNumber(vehicle.cylinders,source.cylinders),powerKw:firstNumber(vehicle.power,source.power_kw),seats:firstNumber(vehicle.seats,source.seats),doors:firstNumber(vehicle.doors,source.doors),safetyRating:firstNumber(vehicle.safety_rating,source.safety_rating)};
    const seller={sourceDealerId:firstText(source.dealer_id,dealer.id),sellerType,tradingName:firstText(dealer.trading_name,source.dealer_name),city:firstText(dealer.city,source.location_city),state:sellerState,subscription:firstText(dealer.subscription,source.subscription)};
    const canonicalLocation={suburb:firstText(source.location_city,location.city,source.suburb),state:locationState,latitude:firstNumber(location.lat,source.lat),longitude:firstNumber(location.lon,source.lon)};
    const content={description,featureTerms};
    const photoCount=Array.isArray(source.photos)?source.photos.length:firstNumber(source.photo_count);
    return {
      schemaVersion:VEHICLE_MARKET_SCHEMA_VERSION,source:VEHICLE_MARKET_SOURCE,sourceListingId,listingKey:sourceListingId?`${VEHICLE_MARKET_SOURCE}:${sourceListingId}`:null,
      sourceRefId:firstText(source.ref_id,source.source_ref_id),canonicalUrl:canonicalUrl(source.url),sourceCreatedAt:firstText(source.created_at,source.listing_created),sourceUpdatedAt:text(source.updated_at),sourceStatus:text(source.status),condition:text(source.condition),vehicleClass:firstText(source.vehicle_class,vehicle.vehicle_class),isAuction:booleanValue(source.is_auction),
      manufacturerYear,make:vehicleSpec.make,model:vehicleSpec.model,series:vehicleSpec.series,variant:vehicleSpec.variant,bodyType:vehicleSpec.bodyType,bodyTypeGroup:vehicleSpec.bodyTypeGroup,segment:vehicleSpec.segment,transmission:vehicleSpec.transmission,driveType:vehicleSpec.driveType,fuelType:vehicleSpec.fuelType,engineSizeL:vehicleSpec.engineSizeL,cylinders:vehicleSpec.cylinders,powerKw:vehicleSpec.powerKw,seats:vehicleSpec.seats,doors:vehicleSpec.doors,safetyRating:vehicleSpec.safetyRating,
      odometerKm:firstNumber(source.odometer,source.odometer_km),regoExpiry:text(source.rego_expiry),colour:firstText(source.colour_base,source.colour_body,source.colour),advertisedPrice:firstNumber(price.advertised_price,source.advertised_price,typeof source.price!=="object"?source.price:undefined),driveawayPrice:firstNumber(price.driveaway_price,source.driveaway_price),sourcePriorAdvertisedPrice:firstNumber(pricingHistory.advertised_price,source.source_prior_advertised_price),sourcePriorPriceEndedAt:firstText(pricingHistory.deleted_at,source.source_prior_price_ended_at),
      isDealer,isPrivate,isRegistered:booleanValue(source.is_registered),isTopAd:booleanValue(source.is_top_ad),sourceDealerId:seller.sourceDealerId,sellerType,sellerName:seller.tradingName,sellerCity:seller.city,sellerState:seller.state,sellerSubscription:seller.subscription,
      suburb:canonicalLocation.suburb,locationState,latitude:canonicalLocation.latitude,longitude:canonicalLocation.longitude,photoCount,hasVideo:booleanValue(source.hasVideo??source.has_video),description,featureTerms,
      featureSetHash:valueHash(featureTerms),vehicleSpecHash:valueHash(vehicleSpec),sellerVersionHash:valueHash(seller),locationHash:valueHash(canonicalLocation),contentHash:valueHash(content),sourceRecordHash,
    };
  }

  validateListing(listing:CanonicalListingObservationV1,scope:VehicleMarketScopeV1):ListingValidation{
    const issues:string[]=[];
    if(!listing.sourceListingId)issues.push("missing-listing-id");
    if(listing.locationState?.toUpperCase()!=="WA")issues.push("state-out-of-scope");
    if(listing.condition?.toLowerCase()!=="used")issues.push("condition-out-of-scope");
    const optional:[string,string|null,string|undefined][]=[
      ["make",listing.make,scope.make],["model",listing.model,scope.model],["fuel-type",listing.fuelType,scope.fuelType],["transmission",listing.transmission,scope.transmissionType],["drive-type",listing.driveType,scope.driveType],["body-type-group",listing.bodyTypeGroup,scope.bodyTypeGroup],
    ];
    for(const [label,actual,expected] of optional)if(expected&&actual?.toLowerCase()!==expected.toLowerCase())issues.push(`${label}-filter-violation`);
    if(scope.yearFrom&&(!listing.manufacturerYear||listing.manufacturerYear<scope.yearFrom))issues.push("year-from-filter-violation");
    if(scope.yearTo&&(!listing.manufacturerYear||listing.manufacturerYear>scope.yearTo))issues.push("year-to-filter-violation");
    if(scope.priceFrom!=null&&(listing.advertisedPrice==null||listing.advertisedPrice<scope.priceFrom))issues.push("price-from-filter-violation");
    if(scope.priceTo!=null&&(listing.advertisedPrice==null||listing.advertisedPrice>scope.priceTo))issues.push("price-to-filter-violation");
    return {valid:issues.length===0,issues};
  }
}

export function sourceScopeFingerprint(scope:VehicleMarketScopeV1){return valueHash(JSON.parse(canonicalJson(scope)));}
