import {afterEach,describe,expect,it} from "vitest";
import {aiLimits} from "./ai-limits";

const originalUser=process.env.AI_REMIX_REQUESTS_PER_HOUR;
const originalGlobal=process.env.AI_REMIX_GLOBAL_REQUESTS_PER_HOUR;

afterEach(()=>{
  if(originalUser===undefined)delete process.env.AI_REMIX_REQUESTS_PER_HOUR;else process.env.AI_REMIX_REQUESTS_PER_HOUR=originalUser;
  if(originalGlobal===undefined)delete process.env.AI_REMIX_GLOBAL_REQUESTS_PER_HOUR;else process.env.AI_REMIX_GLOBAL_REQUESTS_PER_HOUR=originalGlobal;
});

describe("aiLimits",()=>{
  it("uses conservative defaults",()=>{
    delete process.env.AI_REMIX_REQUESTS_PER_HOUR;delete process.env.AI_REMIX_GLOBAL_REQUESTS_PER_HOUR;
    expect(aiLimits()).toEqual({perUserHourly:20,globalHourly:100});
  });

  it("accepts bounded positive integers and rejects unsafe values",()=>{
    process.env.AI_REMIX_REQUESTS_PER_HOUR="12";process.env.AI_REMIX_GLOBAL_REQUESTS_PER_HOUR="not-a-number";
    expect(aiLimits()).toEqual({perUserHourly:12,globalHourly:100});
  });
});
