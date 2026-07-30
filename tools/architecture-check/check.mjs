import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const forbidden = ["project.sqlite", "from electron", "from react"];
const files = ["packages/core/project-kernel/src/public.ts", "packages/core/timebase/src/public.ts", "packages/platform/contract-runtime/src/public.ts"];
for (const file of files) {
  const source = await readFile(resolve(root, file), "utf8");
  for (const token of forbidden) if (source.includes(token)) throw new Error(`${file} violates boundary: ${token}`);
}
console.log("architecture check passed");
