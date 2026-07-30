import assert from "node:assert/strict";
import { rationalTime, timeRange, contains } from "./public.ts";

const start = rationalTime(10, 30), duration = rationalTime(20, 30); assert.equal(contains(timeRange(start, duration), rationalTime(20, 30)), true); assert.equal(contains(timeRange(start, duration), rationalTime(30, 30)), false); assert.equal(rationalTime(1, 25).timescale, 25n); console.log("timebase check passed (rational range and half-open containment)");
