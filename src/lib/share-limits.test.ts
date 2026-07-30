import {afterEach,describe,expect,it} from "vitest";
import {publicShareLimits} from "./share-limits";

const originalVisitor=process.env.PUBLIC_SHARE_REQUESTS_PER_HOUR;
const originalGlobal=process.env.PUBLIC_SHARE_GLOBAL_REQUESTS_PER_HOUR;

afterEach(()=>{
  if(originalVisitor===undefined)delete process.env.PUBLIC_SHARE_REQUESTS_PER_HOUR;else process.env.PUBLIC_SHARE_REQUESTS_PER_HOUR=originalVisitor;
  if(originalGlobal===undefined)delete process.env.PUBLIC_SHARE_GLOBAL_REQUESTS_PER_HOUR;else process.env.PUBLIC_SHARE_GLOBAL_REQUESTS_PER_HOUR=originalGlobal;
});

describe("publicShareLimits",()=>{
  it("uses bounded defaults",()=>{
    delete process.env.PUBLIC_SHARE_REQUESTS_PER_HOUR;delete process.env.PUBLIC_SHARE_GLOBAL_REQUESTS_PER_HOUR;
    expect(publicShareLimits()).toEqual({perVisitorHourly:30,globalHourly:300});
  });

  it("accepts explicit limits",()=>{
    process.env.PUBLIC_SHARE_REQUESTS_PER_HOUR="15";process.env.PUBLIC_SHARE_GLOBAL_REQUESTS_PER_HOUR="150";
    expect(publicShareLimits()).toEqual({perVisitorHourly:15,globalHourly:150});
  });
});
