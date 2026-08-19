import {analyticsPolicy} from "../analytics-contract";
import {duckDiveContract,duckDivePublicContract} from "../duckdive-contract";
import type {DatasetDefinition} from "../dataset-types";

export const VIC_HOUSING_DATASET={
  key:"vic-housing",
  default:false,
  title:"VIC Housing",
  description:"Completed Victorian detached-house sales with governed price, land and volume semantics.",
  kind:"historical",
  contractVersion:"vic-housing/v1",
  contract:duckDiveContract,
  publicContract:duckDivePublicContract,
  presentation:{
    badge:"Included dataset",
    summary:"Explore completed house sales across Victoria, then ask DuckDive to reshape a live report around the comparison or signal you need.",
    boundary:"Descriptive sales history with governed price, land and volume rules. It is not a valuation, forecast or recommendation.",
  },
  starters:[
    {key:"market-pulse",title:"VIC Market Pulse",label:"Statewide pulse",description:"Sale volume, price and land signals with suburb controls.",outcome:"See how the statewide market is moving and where activity is changing.",entryPrompt:"Start with the statewide picture",questions:["How is the Victorian housing market changing?","Which suburbs are gaining sales momentum?"],file:"market-pulse.tsx",accent:"blue"},
    {key:"suburb-story",title:"Suburb Story",label:"One location",description:"Eight-year suburb history and transparent bedroom samples.",outcome:"Follow one suburb through time and inspect the sample behind each signal.",entryPrompt:"Explore one suburb in depth",questions:["What has changed in Yarraville?","How have three-bedroom house prices moved in Footscray?"],file:"suburb-story.tsx",accent:"orange"},
    {key:"market-matchup",title:"Market Matchup",label:"Compare places",description:"A side-by-side evidence lab for two Victorian locations.",outcome:"Compare two suburbs on price, sales activity and recent momentum.",entryPrompt:"Compare two locations",questions:["How do Yarraville and Footscray compare?","Which of two suburbs has stronger sales momentum?"],file:"market-matchup.tsx",accent:"teal"},
  ],
  reportPolicy:{
    capabilities:[
      {id:"sales-volume",label:"Compare sales activity",examples:["Which suburb had more sales?","Show sales volume over time"]},
      {id:"median-price",label:"Compare median sale prices",examples:["Which suburb is more expensive?","Show median price trends"]},
      {id:"price-trends",label:"Compare price and volume trends",examples:["How have price and sales volume changed?"]},
      {id:"suburb-comparison",label:"Compare locations",examples:["Compare Yarraville with Seddon","Which suburb is growing faster?"]},
      {id:"bedroom-segments",label:"Compare bedroom segments",examples:["Compare four-bedroom homes","Show the most common bedroom count"]},
      {id:"land-statistics",label:"Compare land size and land signals",examples:["Compare median land size"]},
      {id:"sales-velocity",label:"Compare recent sales momentum",examples:["Which suburb has stronger sales momentum?"]},
      {id:"report-presentation",label:"Change report presentation without changing governed semantics",examples:["Restyle charts and layout","Improve labels, contrast or accessibility"]},
    ],
    limitations:[
      {id:"no-valuations",label:"Current property valuations",reason:"The active contract contains completed sales history, not current valuations."},
      {id:"no-rental-data",label:"Rental prices",reason:"The active contract contains completed sales only."},
      {id:"no-forecasts",label:"Forecast prices",reason:"The active contract is descriptive historical data, not a forecasting model."},
      {id:"no-external-context",label:"School quality, crime rates, and population growth",reason:"These external context fields are not present in the active contract."},
    ],
    assumptions:[
      {id:"price-validity",label:"Reported prices use the governed validity rules",explanation:duckDivePublicContract.caveats.find(item=>item.toLowerCase().includes("price")),source:"data-contract",material:true},
      {id:"volume-includes-unpriced",label:"Unpriced sales remain in sales volume",source:"data-contract",material:true},
    ],
    scopeItems:[{id:"property-type",label:"Property type",values:["Detached houses"]}],
  },
  motherduck:{
    databaseEnv:"MOTHERDUCK_DATABASE",
    databaseDefault:"vic_house_data",
    shareUrlEnv:"MOTHERDUCK_SHARE_URL",
    serviceAccountEnv:"MOTHERDUCK_SHARED_SERVICE_ACCOUNT_USERNAME",
    serviceAccountDefault:"vic_house_lab",
  },
  sourceTemplateValues:runtime=>({
    "__MOTHERDUCK_SHARE_URL__":runtime.motherduckShareUrl,
    "__PRICE_MIN__":String(analyticsPolicy.priceAud.minimum),
    "__PRICE_MAX__":String(analyticsPolicy.priceAud.maximum),
    "__LAND_MIN__":String(analyticsPolicy.landSizeSqm.minimum),
    "__LAND_MAX__":String(analyticsPolicy.landSizeSqm.maximum),
  }),
  capabilities:{agentQuery:true,editing:true,publicShare:true},
} as const satisfies DatasetDefinition;
