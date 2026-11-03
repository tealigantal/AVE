import { randomUUID } from "node:crypto";
import { readFile, mkdir, open, rename, unlink, realpath } from "node:fs/promises";
import { basename, dirname, isAbsolute, resolve } from "node:path";
import type { RecentProjectSummary } from "../../../../packages/platform/project-api/src/public.js";
import { DesktopLifecycleError } from "./project-session-manager.js";

type RecentProject = RecentProjectSummary & Readonly<{ path: string; project_id: string; delete_pending?: true; recycled_at?: string }>;
type RecentIndex = Readonly<{ version: 2; entries: readonly RecentProject[] }>;
type RecycledProjectSummary = RecentProjectSummary & Readonly<{ recycled_at: string; delete_pending?: true }>;
const exact = (value: unknown, keys: readonly string[]): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).sort().join(",") === [...keys].sort().join(","));
const text = (value: unknown): value is string => typeof value === "string" && value.length > 0;
const entryShape = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).every(key=>["id","display_name","last_opened_at","path","project_id","delete_pending","recycled_at"].includes(key)) && ["id","display_name","last_opened_at","path","project_id"].every(key=>key in value));
function invalid(): never { throw new DesktopLifecycleError("DESKTOP_RECENT_INDEX_INVALID", "recent project index is corrupt; it has not been replaced"); }
const pathKey = (value: string) => process.platform === "win32" ? value.toLowerCase() : value;
const isRecycled = (item: RecentProject) => item.recycled_at !== undefined || item.delete_pending === true;

/** Main-only navigation references. Never reads project content or writes a project DB. */
export class RecentProjects {
  private tail: Promise<void> = Promise.resolve();
  constructor(private readonly filePath: string, private readonly now: () => Date = () => new Date()) {
    if (!isAbsolute(filePath)) throw new DesktopLifecycleError("DESKTOP_RECENT_INDEX_INVALID", "recent index location must be absolute");
  }
  private async load(): Promise<RecentIndex> {
    let bytes: Buffer;
    try { bytes = await readFile(this.filePath); }
    catch (cause) { if ((cause as NodeJS.ErrnoException).code === "ENOENT") return { version: 2, entries: [] }; throw cause; }
    let value: unknown;
    try { value = JSON.parse(bytes.toString("utf8")); } catch (cause) { const error = new DesktopLifecycleError("DESKTOP_RECENT_INDEX_INVALID", "recent index JSON is invalid"); error.cause = cause; throw error; }
    if (!exact(value,["version","entries"]) || ![1,2].includes(value.version as number) || !Array.isArray(value.entries)) invalid();
    const version = value.version as number;
    const ids = new Set<string>(), paths = new Set<string>();
    for (const item of (value as { entries: unknown[] }).entries) {
      if (!entryShape(item) || !text(item.id) || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(item.id) || !text(item.display_name) || !text(item.path) || !isAbsolute(item.path) || !text(item.project_id) || !text(item.last_opened_at) || !Number.isFinite(Date.parse(item.last_opened_at)) || new Date(item.last_opened_at).toISOString() !== item.last_opened_at || ids.has(item.id) || paths.has(pathKey(item.path))) invalid();
      if ("delete_pending" in item && item.delete_pending !== true) invalid();
      if ("recycled_at" in item && (version !== 2 || !text(item.recycled_at) || !Number.isFinite(Date.parse(item.recycled_at)) || new Date(item.recycled_at).toISOString() !== item.recycled_at)) invalid();
      ids.add(item.id); paths.add(pathKey(item.path));
    }
    return { version: 2, entries: value.entries as unknown as RecentProject[] };
  }
  async list(): Promise<Readonly<{ items: readonly RecentProjectSummary[] }>> {
    await this.tail;
    return {items:[...(await this.load()).entries].filter(item=>!isRecycled(item)).sort((a,b)=>b.last_opened_at.localeCompare(a.last_opened_at)).map(({id,project_id,display_name,last_opened_at})=>({id,project_id,display_name,last_opened_at}))};
  }
  async listRecycleBin(): Promise<Readonly<{ items: readonly RecycledProjectSummary[] }>> {
    await this.tail;
    return {items:[...(await this.load()).entries].filter(isRecycled).sort((a,b)=>(b.recycled_at??b.last_opened_at).localeCompare(a.recycled_at??a.last_opened_at)).map(({id,project_id,display_name,last_opened_at,recycled_at,delete_pending})=>({id,project_id,display_name,last_opened_at,recycled_at:recycled_at??last_opened_at,...(delete_pending?{delete_pending:true as const}:{})}))};
  }
  async lookup(id: string): Promise<RecentProject> {
    await this.tail; const item=(await this.load()).entries.find(entry=>entry.id===id);
    if (!item) throw new DesktopLifecycleError("DESKTOP_RECENT_NOT_FOUND", "project reference was not found in this userData");
    return {...item};
  }
  async lookupActive(id: string): Promise<RecentProject> {
    const item=await this.lookup(id);
    if(item.delete_pending)throw new DesktopLifecycleError("DESKTOP_PROJECT_DELETE_PENDING","permanent cleanup must be retried from the recycle bin");
    if(isRecycled(item))throw new DesktopLifecycleError("DESKTOP_PROJECT_IN_RECYCLE_BIN","restore this project before opening it from recent projects");
    return item;
  }
  async lookupRecycleBin(id: string): Promise<RecentProject> {
    const item=await this.lookup(id);
    if(!isRecycled(item))throw new DesktopLifecycleError("DESKTOP_RECYCLE_NOT_FOUND","project is not in the recycle bin");
    return item;
  }
  async assertOpenPathAllowed(projectDirectory: string): Promise<void> {
    if(!isAbsolute(projectDirectory))throw new DesktopLifecycleError("DESKTOP_RECENT_INDEX_INVALID","project location must be absolute");
    await this.tail;
    let index:RecentIndex;try{index=await this.load();}catch(error){if(error instanceof DesktopLifecycleError&&error.code==="DESKTOP_RECENT_INDEX_INVALID")return;throw error;}
    const path=resolve(projectDirectory);
    let canonical:string|null=null;try{canonical=await realpath(path);}catch(cause){if((cause as NodeJS.ErrnoException).code!=="ENOENT")throw cause;}
    const reference=index.entries.find(item=>pathKey(item.path)===pathKey(path)||(canonical!==null&&pathKey(item.path)===pathKey(canonical)));
    if(reference?.delete_pending)throw new DesktopLifecycleError("DESKTOP_PROJECT_DELETE_PENDING","permanent cleanup is pending and must be retried from the recycle bin");
  }
  async moveToRecycleBin(id: string, expectedPath?: string, expectedProjectId?: string): Promise<void> {
    const task=this.tail.then(async()=>{const index=await this.load(),entry=index.entries.find(item=>item.id===id);if(!entry)throw new DesktopLifecycleError("DESKTOP_RECENT_NOT_FOUND","project reference missing");if(expectedPath!==undefined&&(entry.path!==expectedPath||entry.project_id!==expectedProjectId))throw new DesktopLifecycleError("DESKTOP_RECENT_PROJECT_CHANGED","project identity changed before recycle");if(entry.delete_pending)throw new DesktopLifecycleError("DESKTOP_PROJECT_DELETE_PENDING","project is already pending permanent cleanup");if(entry.recycled_at)return;await this.save({version:2,entries:index.entries.map(item=>item.id===id?{...item,recycled_at:this.now().toISOString()}:item)});});
    this.tail=task.then(()=>undefined,()=>undefined);return task;
  }
  async restoreFromRecycleBin(id: string): Promise<void> {
    const task=this.tail.then(async()=>{const index=await this.load(),entry=index.entries.find(item=>item.id===id);if(!entry||!isRecycled(entry))throw new DesktopLifecycleError("DESKTOP_RECYCLE_NOT_FOUND","project is not in the recycle bin");if(entry.delete_pending)throw new DesktopLifecycleError("DESKTOP_PROJECT_DELETE_PENDING","project cleanup is pending and cannot be restored");await this.save({version:2,entries:index.entries.map(item=>{if(item.id!==id)return item;const {recycled_at:_recycledAt,...active}=item;return active;})});});
    this.tail=task.then(()=>undefined,()=>undefined);return task;
  }
  async restoreAllFromRecycleBin(): Promise<Readonly<{ restored_ids: readonly string[] }>> {
    const task=this.tail.then(async()=>{const index=await this.load(),items=index.entries.filter(isRecycled);if(items.some(item=>item.delete_pending))throw new DesktopLifecycleError("DESKTOP_PROJECT_DELETE_PENDING","permanent cleanup is pending; retry or resolve it before restoring all projects");if(!items.length)return {restored_ids:[]};const ids=items.map(item=>item.id);await this.save({version:2,entries:index.entries.map(item=>{if(!ids.includes(item.id))return item;const {recycled_at:_recycledAt,...active}=item;return active;})});return {restored_ids:ids};});
    this.tail=task.then(()=>undefined,()=>undefined);return task;
  }
  async beginDeletion(id: string): Promise<void> {
    const task=this.tail.then(async()=>{const index=await this.load(),entry=index.entries.find(item=>item.id===id);if(!entry||!isRecycled(entry))throw new DesktopLifecycleError("DESKTOP_RECYCLE_NOT_FOUND","permanent deletion requires a project in the recycle bin");await this.save({version:2,entries:index.entries.map(item=>item.id===id?{...item,delete_pending:true}:item)});});
    this.tail=task.then(()=>undefined,()=>undefined);return task;
  }
  async completeDeletion(id: string): Promise<void> {
    const task=this.tail.then(async()=>{const index=await this.load(),entry=index.entries.find(item=>item.id===id);if(!entry?.delete_pending)throw new DesktopLifecycleError("DESKTOP_PROJECT_DELETE_PENDING","permanent deletion has no durable pending intent");await this.save({version:2,entries:index.entries.filter(item=>item.id!==id)});});
    this.tail=task.then(()=>undefined,()=>undefined);return task;
  }
  async remember(projectDirectory: string, projectId: string): Promise<void> {
    if (!isAbsolute(projectDirectory) || !text(projectId) || projectId === "not-open") throw new DesktopLifecycleError("DESKTOP_RECENT_INDEX_INVALID", "only a successfully opened project can be recorded");
    const task = this.tail.then(async()=>{
      // Keep the spelling successfully opened by Host: immutable object references
      // are bound to that project directory. realpath may expand a Windows package
      // alias and must never become a replacement project-open location.
      const index = await this.load(), path = resolve(projectDirectory), canonical = await realpath(path);
      const matches = (item: RecentProject) => pathKey(item.path) === pathKey(path) || pathKey(item.path) === pathKey(canonical);
      if(index.entries.some(item=>matches(item)&&item.delete_pending))throw new DesktopLifecycleError("DESKTOP_PROJECT_DELETE_PENDING","project cleanup is pending and cannot be reopened");
      const existing = index.entries.find(item=>matches(item) && item.project_id === projectId);
      const entry: RecentProject = { id: existing?.project_id === projectId ? existing.id : randomUUID(), path, project_id: projectId, display_name: basename(path) || path, last_opened_at: this.now().toISOString() };
      // Root directories must not leak their absolute location as a display label.
      if (!basename(path)) throw new DesktopLifecycleError("DESKTOP_RECENT_INDEX_INVALID", "a filesystem root cannot be a recent project label");
      await this.save({version:2,entries:[...index.entries.filter(item=>!matches(item)),entry]});
    });
    this.tail = task.then(()=>undefined,()=>undefined); // Caller retains failure; later operations remain usable.
    return task;
  }
  private async save(index: RecentIndex): Promise<void> {
    await mkdir(dirname(this.filePath),{recursive:true});
    const temporary = resolve(dirname(this.filePath),`.recent-projects-${randomUUID()}.tmp`);
    try {
      const handle = await open(temporary,"wx",0o600);
      try { await handle.writeFile(JSON.stringify(index)); await handle.sync(); } finally { await handle.close(); }
      await rename(temporary,this.filePath);
    } catch (cause) {
      try { await unlink(temporary); } catch (cleanup) { if ((cleanup as NodeJS.ErrnoException).code !== "ENOENT") throw new AggregateError([cause,cleanup],"Recent index save and temporary cleanup failed",{cause}); }
      throw cause;
    }
  }
}
