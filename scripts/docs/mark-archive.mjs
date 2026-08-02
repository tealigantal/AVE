import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
async function walk(dir){for(const e of await readdir(dir,{withFileTypes:true})){const f=resolve(dir,e.name);if(e.isDirectory())await walk(f);else if(e.name.endsWith(".md")){const s=await readFile(f,"utf8");if(!s.startsWith("<!-- HISTORICAL ARCHIVE"))await writeFile(f,"<!-- HISTORICAL ARCHIVE: retained evidence; not current authority. -->\n\n"+s)}}}
await walk(resolve(process.cwd(),"docs/archive"));
