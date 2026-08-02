import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import { resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
const roots=["apps","packages","contracts","database","tools","tests","package.json","pnpm-lock.yaml",".github/workflows"];
async function files(p){const a=[];try{if((await stat(p)).isFile())return[p];for(const e of await readdir(p,{withFileTypes:true})){const q=resolve(p,e.name);if(e.isDirectory())a.push(...await files(q));else a.push(q)}}catch{}return a}
export async function fingerprint(root=process.cwd()){const list=(await Promise.all(roots.map(x=>files(resolve(root,x))))).flat().sort();const h=createHash("sha256");for(const f of list){const r=relative(root,f).split(sep).join("/");h.update(r);h.update(await readFile(f));}return h.digest("hex")}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) console.log(await fingerprint());
