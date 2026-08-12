export const vehicleMarketContract={
  version:"wa-vehicle-market/v1",
  source:{name:"Autotrader Australia listings search",scopeVersion:"wa-used-listings/v1",population:"Configured WA Used listing population",ordering:"listing_created ASC",pageSize:50},
  grains:{current:"One row per source listing ID in the latest publishable current observation run",history:"One row per publishable observation run and stable listing key",runQuality:"One row per attempted observation run"},
  identity:{listingKey:"autotrader:<source_listing_id>",observation:["run_key","listing_key"],mutableAttributesExcludedFromListingIdentity:true},
  measures:{listingCount:"Count of observable source listing IDs",askingPrice:"Advertised asking price, not transaction price",odometerKm:"Source-reported odometer",listingAgeDays:"Days from source listing-created timestamp to observation date",cohort:"Same make and model within plus or minus two manufacturer years; percentiles require at least 10 current listings"},
  events:{eligibleRuns:"Adjacent COMPLETE runs with identical scope and population definition",absenceLabel:"No longer observed",saleInference:false,sourcePricingHistory:"Supplementary source-prefixed evidence only"},
  physicalTables:["dim_observation_run","dim_listing","dim_vehicle_spec","dim_seller_version","dim_location","dim_listing_content","fact_listing_observation"],
  governedViews:["contract.vehicle_market_current","contract.vehicle_market_history","contract.listing_lifecycle","contract.listing_events","contract.market_timeseries","contract.vehicle_screen","contract.observation_run_quality"],
  deferred:["Physical observation-to-feature bridge","Market Movement report until a second comparable COMPLETE observation","Sale inference","Photo ingestion"],
} as const;

export const vehicleMarketPublicContract={
  scope:"WA Used Vehicle Listings observed from the configured source population. Every claim is qualified by capture time, scope, and run quality.",
  grains:[
    {name:"Current listings",grain:"One row per source listing ID in the latest publishable current observation"},
    {name:"Observation history",grain:"One row per source listing ID per publishable observation"},
    {name:"Run quality",grain:"One row per observation run, including non-complete runs"},
  ],
  measures:{inventory:"Count of observable source listing IDs",askingPrice:"Advertised asking price, not a transaction price",odometer:"Source-reported kilometres",listingAge:"Elapsed days since the source listing-created timestamp",cohortPosition:"Same make and model within two manufacturer years, shown only for cohorts of at least ten"},
  dimensions:["make","model","manufacturer year","vehicle class","body group","fuel","transmission","drive type","seller type","suburb","location state","observation date"],
  caveats:[
    "The dataset is the observable configured source population, not the whole WA vehicle market.",
    "A listing is not necessarily a unique physical vehicle.",
    "Asking price is not transaction price.",
    "Source absence does not prove sale; eligible absence events are labelled no longer observed.",
    "Source pricing history is supplementary evidence and is not our periodic event history.",
    "Movement and lifecycle events require adjacent comparable COMPLETE observations; the first snapshot contains none.",
  ],
} as const;
