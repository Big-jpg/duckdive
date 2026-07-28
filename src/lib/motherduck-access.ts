import postgres,{type Sql} from "postgres";
import {createMCPClient,type MCPClient} from "@ai-sdk/mcp";
import {StreamableHTTPClientTransport} from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {createMotherDuckToken} from "./motherduck-api";

type TokenEntry={token:string;generation:number;expires:number};
const tokens=new Map<string,TokenEntry>(),connections=new Map<string,{generation:number;sql:Sql}>(),clients=new Map<string,{generation:number;client:MCPClient}>();let generation=1;
export function sharedUsername(){return process.env.MOTHERDUCK_SHARED_SERVICE_ACCOUNT_USERNAME||"vic_house_lab";}
async function credentials(username=sharedUsername()){const cached=tokens.get(username);if(cached&&cached.expires>Date.now())return cached;const {token}=await createMotherDuckToken(username);const entry={token,generation:generation++,expires:Date.now()+55*60*1000};tokens.set(username,entry);return entry;}
export async function motherduckServiceSql(username=sharedUsername()){const credential=await credentials(username),cached=connections.get(username);if(cached?.generation===credential.generation)return cached.sql;if(cached)await cached.sql.end().catch(()=>{});const sql=postgres({host:process.env.MOTHERDUCK_PG_HOST||"pg.us-east-1-aws.motherduck.com",port:5432,database:"md:",username:"ducky",password:credential.token,ssl:"require",max:2,prepare:false});connections.set(username,{generation:credential.generation,sql});return sql;}
export async function motherduckMcp(username=sharedUsername()){const credential=await credentials(username),cached=clients.get(username);if(cached?.generation===credential.generation)return cached.client;if(cached)await cached.client.close().catch(()=>{});const transport=new StreamableHTTPClientTransport(new URL(process.env.MOTHERDUCK_MCP_URL||"https://api.motherduck.com/mcp"),{requestInit:{headers:{Authorization:`Bearer ${credential.token}`}}});const client=await createMCPClient({transport});clients.set(username,{generation:credential.generation,client});return client;}
