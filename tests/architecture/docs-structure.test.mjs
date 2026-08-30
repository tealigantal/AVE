import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadProgramModel } from "../../scripts/docs/program-model.mjs";

const root = resolve(new URL("../../", import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, (value) => value.slice(1)));
const required = [
  "docs/product/PRODUCT_VISION.md",
  "docs/product/FUTURE_UX_VISION.md",
  "docs/product/EDITING_CAPABILITY_SCOPE_V1.md",
  "docs/architecture/SYSTEM_ARCHITECTURE.md",
  "docs/architecture/EDITING_EXECUTION_ARCHITECTURE_V1.md",
  "docs/architecture/RENDER_BACKEND_ARCHITECTURE_V1.md",
  "docs/program/PROGRAM_REGISTRY.yaml",
  "scripts/docs/program-model.mjs",
  "scripts/docs/sync.mjs",
  "scripts/docs/check.mjs",
];
for (const file of required) await access(resolve(root, file));
const value = await loadProgramModel(root);
if (value.programs.length < 2) throw new Error("multi-programme fixture is missing");
for (const program of value.programs) {
  for (const file of Object.values(program.files)) await readFile(resolve(root, file), "utf8");
  if (program.capabilities.some((capability) => ["implemented", "tested", "accepted"].includes(capability.status) && !capability.evidence_ids.length)) throw new Error(`claimed capability lacks evidence fixture: ${program.manifest.program_id}`);
}
console.log("multi-programme docs structure contract passed");
