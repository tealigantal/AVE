import { readFileSync } from "node:fs";
import { createBudgetGuard } from "./budget.mjs";
const allowed = JSON.parse(readFileSync("/harness/image-allowlist.json", "utf8"));
const policy = { imageHashes: [...new Set(allowed.map(x => x.content_digest))], assetHashes: [...new Set(allowed.map(x => x.source_digest))] };
const guard = createBudgetGuard({ directory: "/budget-ledger", policy, fetchImpl: globalThis.fetch.bind(globalThis) });
globalThis.fetch = guard.fetch;
process.on("exit", () => guard.close());
console.log("Isolated acceptance budget guard active: CNY 33, original DashScope transport, no reservation refunds.");
