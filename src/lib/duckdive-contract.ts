import {analyticsDefinitions,analyticsPolicy} from "./analytics-contract";

export const duckDiveContract={
  estate:{state:"VIC",propertyType:"House",scope:"Completed detached-house sale observations supplied in the Victorian collection."},
  identity:{suburbKey:"State-qualified normalized suburb, for example vic-yarraville.",postcode:"Display and lineage metadata; not analytical identity."},
  tables:[
    {name:"suburb_dimension",grain:"One row per analytical suburb.",columns:["suburb_key","state","suburb","canonical_postcode","observed_postcodes","sale_count","postcode_confidence"]},
    {name:"suburb_monthly_sales",grain:"One row per suburb_key and sale_month.",columns:["suburb_key","state","suburb","postcode","sale_month","sale_count","reported_priced_sales","priced_sales","median_price_aud","average_price_aud","minimum_price_aud","maximum_price_aud"]},
    {name:"suburb_sale_facts",grain:"One row per curated completed sale event.",columns:["suburb_key","state","sold_date","price_aud","land_size_sqm","property_type","bedrooms","bathrooms","car_spaces"]},
  ],
  relationships:["suburb_sale_facts.suburb_key → suburb_dimension.suburb_key","suburb_monthly_sales.suburb_key → suburb_dimension.suburb_key"],
  measures:{volume:analyticsDefinitions.volume,price:analyticsDefinitions.price,land:analyticsDefinitions.land,comparison:analyticsDefinitions.comparison,salesVelocity:"Completed detached-house sales per month over the latest rolling 12 months, compared with the immediately preceding 12 months."},
  filters:{priceAud:analyticsPolicy.priceAud,landSizeSqm:analyticsPolicy.landSizeSqm,bedrooms:analyticsPolicy.bedrooms},
  dimensions:["suburb","sold date / month / year","bedrooms","bathrooms","car spaces","postcode (display only)"],
  caveats:["Unpriced sales remain in volume and are excluded only from price statistics.","Always show valid sample counts beside price and land statistics.","The dataset is descriptive sales history, not a valuation or recommendation."],
  visualLanguage:{light:"Clear-sky blue, soft white and restrained sand/ochre controls.",dark:"Near-black, deep sunset orange and hazy sodium yellow.",rules:["Clarity over decoration.","No ornamental icons or filler copy.","Use the smallest number of controls and marks needed to answer the question.","Preserve DD_THEME_CSS and its CSS variables where present."]},
} as const;

export const duckDivePublicContract={
  scope:duckDiveContract.estate.scope,
  grains:duckDiveContract.tables.map(({name,grain})=>({name,grain})),
  measures:duckDiveContract.measures,
  dimensions:duckDiveContract.dimensions,
  caveats:duckDiveContract.caveats,
} as const;

export function duckDiveContractPrompt(){return JSON.stringify(duckDiveContract,null,2);}
