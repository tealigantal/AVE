import { randomUUID } from "node:crypto";
import { readFile, mkdir, open, rename, unlink, realpath } from "node:fs/promises";
import { basename, dirname, isAbsolute, resolve } from "node:path";
import type { RecentProjectSummary } from "../../../../packages/platform/project-api/src/public.js";
import { DesktopLifecycleError } from "./project-session-manager.js";

type RecentProject = RecentProjectSummary & Readonly<{ path: string; project_id: string }>;
type RecentIndex = Readonly<{ version: 1; entries: readonly RecentProject[] }>;
const exact = (value: unknown, keys: readonly string[]): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).sort().join(",") === [...keys].sort().join(","));
const text = (value: unknown): value is string => typeof value === "string" && value.length > 0;
function invalid(): never { throw new DesktopLifecycleError("DESKTOP_RECENT_INDEX_INVALID", "recent project index is corrupt; it has not been replaced"); }
const pathKey = (value: string) => process.platform === "win32" ? value.toLowerCase() : value;

/** Main-only navigation references. Never reads project content or writes a project DB. */
export class RecentProjects {
  private tail: Promise<void> = Promise.resolve();
  constructor(private readonly filePath: string, private readonly now: () => Date = () => new Date()) {
    if (!isAbsolute(filePath)) throw new DesktopLifecycleError("DESKTOP_RECENT_INDEX_INVALID", "recent index location must be absolute");
  }
  private async load(): Promise<RecentIndex> {
    let bytes: Buffer;
    try { bytes = await readFile(this.filePath); }
    catch (cause) { if ((cause as NodeJS.ErrnoException).code === "ENOENT") return { version: 1, entries: [] }; throw cause; }
    let value: unknown;
    try { value = JSON.parse(bytes.toString("utf8")); } catch (cause) { const error = new DesktopLifecycleError("DESKTOP_RECENT_INDEX_INVALID", "recent index JSON is invalid"); error.cause = cause; throw error; }
    if (!exact(value,["version","entries"]) || value.version !== 1 || !Array.isArray(value.entries)) invalid();
    const ids = new Set<string>(), paths = new Set<string>();
    for (const item of (value as { entries: unknown[] }).entries) {
      if (!exact(item,["id","display_name","last_opened_at","path","project_id"]) || !text(item.id) || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(item.id) || !text(item.display_name) || !text(item.path) || !isAbsolute(item.path) || !text(item.project_id) || !text(item.last_opened_at) || !Number.isFinite(Date.parse(item.last_opened_at)) || new Date(item.last_opened_at).toISOString() !== item.last_opened_at || ids.has(item.id) || paths.has(pathKey(item.path))) invalid();
      ids.add(item.id); paths.add(pathKey(item.path));
    }
    return value as unknown as RecentIndex;
  }
  async list(): Promise<Readonly<{ items: readonly RecentProjectSummary[] }>> {
    await this.tail;
    const index = await this.load();
    return { items: [...index.entries].sort((a,b)=>b.last_opened_at.localeCompare(a.last_opened_at)||a.id.localeCompare(b.id)).map(({id,display_name,last_opened_at})=>({id,display_name,last_opened_at})) };
  }
  async lookup(id: string): Promise<RecentProject> {
    await this.tail;
    const item = (await this.load()).entries.find(entry=>entry.id===id);
    if (!item) throw new DesktopLifecycleError("DESKTOP_RECENT_NOT_FOUND", "recent project reference was not found in this userData");
    return { ...item };
  }
  async remember(projectDirectory: string, projectId: string): Promise<void> {
    if (!isAbsolute(projectDirectory) || !text(projectId) || projectId === "not-open") throw new DesktopLifecycleError("DESKTOP_RECENT_INDEX_INVALID", "only a successfully opened project can be recorded");
    const task = this.tail.then(async()=>{
      // Keep the spelling successfully opened by Host: immutable object references
      // are bound to that project directory. realpath may expand a Windows package
      // alias and must never become a replacement project-open location.
      const index = await this.load(), path = resolve(projectDirectory), canonical = await realpath(path);
      const matches = (item: RecentProject) => pathKey(item.path) === pathKey(path) || pathKey(item.path) === pathKey(canonical);
      const existing = index.entries.find(item=>matches(item) && item.project_id === projectId);
      const entry: RecentProject = { id: existing?.project_id === projectId ? existing.id : randomUUID(), path, project_id: projectId, display_name: basename(path) || path, last_opened_at: this.now().toISOString() };
      // Root directories must not leak their absolute location as a display label.
      if (!basename(path)) throw new DesktopLifecycleError("DESKTOP_RECENT_INDEX_INVALID", "a filesystem root cannot be a recent project label");
      await this.save({version:1,entries:[...index.entries.filter(item=>!matches(item)),entry]});
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
