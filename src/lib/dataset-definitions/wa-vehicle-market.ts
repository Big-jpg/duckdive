import type {DatasetDefinition} from "../dataset-types";
import {vehicleMarketContract,vehicleMarketPublicContract} from "../vehicle-market-contract";

export const WA_VEHICLE_MARKET_DATASET={
  key:"wa-vehicle-market",
  default:true,
  title:"WA Used Vehicle Listings",
  description:"A governed observational snapshot of used-vehicle listings in Western Australia, with immutable source evidence and explicit run quality.",
  kind:"near-real-time",
  contractVersion:"wa-vehicle-market/v1",
  contract:vehicleMarketContract,
  publicContract:vehicleMarketPublicContract,
  presentation:{
    badge:"Included dataset",
    summary:"Explore a complete WA Used listing snapshot, inspect transparent peer cohorts, and trace every analytical row to a capture run and raw page.",
    boundary:"Observable source listings and asking prices, not the whole WA market, transactions, valuations, forecasts, or evidence of sale.",
  },
  starters:[
    {key:"vehicle-market-atlas",title:"Market Atlas",label:"Current market",description:"Inventory, asking-price and odometer distributions across vehicle and seller slices.",outcome:"Map the composition and asking-price shape of the latest complete WA Used observation.",entryPrompt:"Start with the current WA Used market",questions:["Which makes and models dominate the current listings?","How do asking-price and odometer distributions differ by body group?"],file:"vehicle-market-atlas.tsx",accent:"blue"},
    {key:"vehicle-lens",title:"Vehicle Lens",label:"Transparent cohorts",description:"Vehicle age, kilometres per year, cohort medians, percentiles, and sample sufficiency.",outcome:"Place a listing in a clearly defined same-make/model and nearby-year cohort.",entryPrompt:"Inspect a vehicle cohort",questions:["How does this Outback compare with nearby model years?","Which listings have insufficient cohort evidence?"],file:"vehicle-lens.tsx",accent:"orange"},
    {key:"data-observatory",title:"Data Observatory",label:"Quality and lineage",description:"Capture scope, pagination reconciliation, row quality, versions, hashes, and limitations.",outcome:"Verify exactly what was observed and whether the snapshot is fit for analysis.",entryPrompt:"Inspect capture quality",questions:["Did the latest run reconcile exactly?","What analytical claims are unavailable from one observation?"],file:"data-observatory.tsx",accent:"teal"},
  ],
  reportPolicy:{
    capabilities:[
      {id:"current-inventory",label:"Explore current observed inventory",examples:["Count listings by make and body group","Compare seller types"]},
      {id:"asking-price",label:"Compare advertised asking prices",examples:["Show price distributions by model","Compare median asking prices"]},
      {id:"listing-age",label:"Explore source listing age",examples:["Which listings have been present longest?"]},
      {id:"cohort-comparison",label:"Compare transparent vehicle cohorts",examples:["Compare an Outback with the same model within two years"]},
      {id:"capture-quality",label:"Inspect reconciliation and lineage",examples:["Show the latest run status and source totals"]},
    ],
    limitations:[
      {id:"no-sale-inference",label:"Sales or sell-through claims",reason:"A source listing disappearing does not establish a sale."},
      {id:"no-market-total",label:"Whole WA market claims",reason:"The data describes the configured observable source population only."},
      {id:"no-valuation",label:"Vehicle valuations",reason:"Advertised asking prices are not transactions or valuations."},
      {id:"no-first-run-movement",label:"Periodic movement from one observation",reason:"Our own movement requires a second adjacent comparable COMPLETE observation."},
      {id:"no-physical-vehicle-identity",label:"Unique physical vehicle counts",reason:"The source listing ID identifies a listing, not necessarily a unique physical vehicle."},
    ],
    assumptions:[
      {id:"complete-run-only",label:"Product snapshots use only COMPLETE runs",source:"data-contract",material:true},
      {id:"cohort-definition",label:"Cohorts use the same make and model within two manufacturer years and require ten listings for percentiles",source:"data-contract",material:true},
      {id:"asking-price",label:"Price fields are advertised asking prices",source:"data-contract",material:true},
    ],
    scopeItems:[{id:"source-scope",label:"Source scope",values:["Western Australia","Used listings","listing_created ascending"]}],
  },
  motherduck:{
    databaseEnv:"WA_VEHICLE_MARKET_MOTHERDUCK_DATABASE",
    databaseDefault:"wa_vehicle_market",
    shareUrlEnv:"WA_VEHICLE_MARKET_SHARE_URL",
    serviceAccountEnv:"WA_VEHICLE_MARKET_SERVICE_ACCOUNT_USERNAME",
    serviceAccountDefault:"duckdive_wa_vehicle_lab",
  },
  sourceTemplateValues:runtime=>({"__MOTHERDUCK_SHARE_URL__":runtime.motherduckShareUrl}),
  capabilities:{agentQuery:true,editing:true,publicShare:false},
} as const satisfies DatasetDefinition;
