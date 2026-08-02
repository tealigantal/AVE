import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
const root=resolve(new URL("../../",import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/,x=>x.slice(1)));
const need=["docs/product/PRODUCT_VISION.md","docs/product/FUTURE_UX_VISION.md","docs/product/EDITING_CAPABILITY_SCOPE_V1.md","docs/architecture/SYSTEM_ARCHITECTURE.md","docs/architecture/EDITING_EXECUTION_ARCHITECTURE_V1.md","docs/architecture/RENDER_BACKEND_ARCHITECTURE_V1.md","docs/program/editing-execution-v1/EXECUTION_MANIFEST.yaml","docs/program/editing-execution-v1/CAPABILITY_MATRIX.yaml","docs/program/editing-execution-v1/ACCEPTANCE_MATRIX.yaml","docs/program/editing-execution-v1/STATE.yaml","scripts/docs/sync.mjs","scripts/docs/check.mjs"];
for(const f of need) await readFile(resolve(root,f),"utf8");
const caps=JSON.parse(await readFile(resolve(root,"docs/program/editing-execution-v1/CAPABILITY_MATRIX.yaml"),"utf8"));if(caps.some(x=>["implemented","tested","accepted"].includes(x.status)&&!x.evidence_ids.length))throw Error("claimed capability lacks evidence fixture"); console.log("docs structure contract passed");
