import { randomUUID } from "node:crypto";
import { stat, statfs } from "node:fs/promises";
import { basename } from "node:path";
import type { MediaImportBatchV1 } from "../../../../contracts/generated/typescript/media/import-batch.v1.js";
import { listAssetLocations, listMediaImportBatches, listMediaImportSources, readMediaImportBatch, readMediaImportSource, registerImportedMedia, saveMediaImportBatch } from "../../project-storage/src/public.js";

type Batch = MediaImportBatchV1;
type Item = Batch["items"][number];
type Issue = NonNullable<Item["error"]>;
type Session = Readonly<{ manifest: Readonly<{ project_id: string }>; db: unknown }>;
export type ImportControl = Readonly<{ signal?: AbortSignal; assertCurrent?: () => void }>;
export type ImportIdentity = Readonly<{ actor_id: string; idempotency_key: string }>;
type Original = Readonly<{ asset: Readonly<{ asset_id: string; digest: string; byte_length: number; algorithm: "sha256"; stream_facts: unknown }>; location: Readonly<{ asset_id: string; asset_location_id: string; location_type: "original"; location_ref: string; metadata: unknown }>; compatibility_notes: readonly string[] }>;

export class MediaImportFailure extends Error {
  constructor(readonly code: string, message: string, options?: ErrorOptions) { super(message, options); this.name = "MediaImportFailure"; }
}
const terminal = (item: Item) => ["imported", "duplicate", "failed", "cancelled"].includes(item.status);
const message = (cause: unknown) => cause instanceof Error ? cause.message : String(cause);
const safeMessage = (cause: unknown) => message(cause).replace(/[A-Za-z]:[\\/][^\n"']+|\/(?:workspace|tmp|home|config|opt|Users)\/[^\n"']+/g, "[Host私有来源]");
function classify(cause: unknown): { issue: Issue; fatal: boolean } {
  const diagnostics = (cause as {cause?:{diagnostics?:readonly {code:string}[]}})?.cause?.diagnostics;
  const critical = Array.isArray(diagnostics) ? diagnostics.find(item=>typeof item?.code==='string'&&(["EACCES","EPERM","ENOSPC","EDQUOT"].includes(item.code)||item.code.includes("SQLITE_")))?.code : undefined;
  const code = critical ?? (typeof (cause as { code?: unknown })?.code === "string" ? (cause as { code: string }).code : message(cause).match(/\b(?:MEDIA_[A-Z_]+|SQLITE_[A-Z_]+|DESKTOP_[A-Z_]+|REQUEST_[A-Z_]+)\b/)?.[0] ?? "MEDIA_IMPORT_FILE_FAILED");
  const storage = code.includes("SQLITE_") || ["ENOSPC", "EDQUOT"].includes(code);
  const closed = /PROJECT_CLOSED|SESSION_STALE|SESSION_CHANGING|SHUTTING_DOWN|WINDOW_CLOSED|IMPORT_CANCELLED/.test(code);
  const permission = ["EACCES", "EPERM"].includes(code) || /PERMISSION|AUTHORIZATION/.test(code);
  const recovery: Issue["recovery"] = code === "MEDIA_IMPORT_CANCELLED" ? "choose-source" : ["ENOSPC", "EDQUOT"].includes(code) ? "free-space" : storage ? "repair-storage" : permission ? "check-permission" : closed ? "reopen-project" : code === "ENOENT" || code === "MEDIA_SOURCE_REQUIRED" ? "choose-source" : "retry";
  const invariant = /^MEDIA_IMPORT_(?:STORAGE|REVISION|BATCH_(?:INVALID|REFERENCE)|ITEM_(?:TRANSITION|RESULT)|IDEMPOTENCY)/.test(code);
  return { issue: { code, message: safeMessage(cause), recovery: invariant ? "repair-storage" : recovery }, fatal: storage || closed || permission || invariant };
}

/** Host-owned coordinator. All state is read from its captured project DB, never a renderer cache. */
export class MediaImportCoordinator {
  private readonly running = new Map<string, { session: Session; controller: AbortController; promise: Promise<Batch> }>();
  constructor(private readonly ports: Readonly<{ session(): Session | undefined; directory(): string | undefined; inspect(path: string, control: Required<ImportControl>): Promise<Original>; changed?(batch: Batch): void }>) {}
  private session(): Session {
    const session = this.ports.session();
    if (!session) throw new MediaImportFailure("REQUEST_PROJECT_CLOSED", "项目已关闭，无法导入素材");
    return session;
  }
  list(): readonly Batch[] { const session = this.session(); return listMediaImportBatches(session, session.manifest.project_id); }
  cleanupCandidates(): readonly {path:string;batch_id:string;item_id:string;source_ref_id:string;project_id:string}[] {
    const session=this.session(), batches=this.list(), sources=listMediaImportSources(session,session.manifest.project_id) as Array<{path:string;batch_id:string;item_id:string;source_ref_id:string;project_id:string}>;
    const protectedPaths=new Set((listAssetLocations(session,session.manifest.project_id) as Array<{location_ref:string}>).map(location=>location.location_ref));
    for(const batch of batches)for(const item of batch.items)if(!terminal(item)){const source=sources.find(source=>source.source_ref_id===item.source_ref_id);if(source)protectedPaths.add(source.path);}
    return sources.filter(source=>{const batch=batches.find(batch=>batch.batch_id===source.batch_id),item=batch?.items.find(item=>item.item_id===source.item_id);return item&&!protectedPaths.has(source.path)&&(item.source_ref_id!==source.source_ref_id||['failed','cancelled'].includes(item.status));});
  }
  read(batchId: string): Batch { const session = this.session(); const batch = readMediaImportBatch(session, session.manifest.project_id, batchId); if (!batch) throw new MediaImportFailure("MEDIA_IMPORT_BATCH_NOT_FOUND", "找不到该导入批次"); return batch; }
  private save(session: Session, previous: Batch, next: Batch, sources: readonly unknown[] = []): Batch {
    next.revision = previous.revision + 1; next.updated_at = new Date().toISOString();
    const value = saveMediaImportBatch(session, session.manifest.project_id, next, previous.revision, sources) as Batch;
    this.ports.changed?.(value); return value;
  }
  create(names: readonly string[], identity: ImportIdentity, phase: "waiting" | "uploading" = "waiting"): Batch {
    const session = this.session();
    if (!names.length || names.length > 10000 || names.some(name => typeof name !== "string" || !name || basename(name) !== name || name.length > 1024) || !identity.actor_id || !identity.idempotency_key) throw new MediaImportFailure("MEDIA_IMPORT_SELECTION_INVALID", "选择的素材清单无效");
    const existing = this.list().find(batch => batch.idempotency_key === identity.idempotency_key);
    if (existing) { if (existing.actor_id !== identity.actor_id || JSON.stringify(existing.items.map(item => item.display_name)) !== JSON.stringify(names)) throw new MediaImportFailure("MEDIA_IMPORT_IDEMPOTENCY_CONFLICT", "该导入请求的来源清单已改变"); return existing; }
    const now = new Date().toISOString();
    const batch: Batch = { schema_version: 1, batch_id: randomUUID(), project_id: session.manifest.project_id, actor_id: identity.actor_id, idempotency_key: identity.idempotency_key, revision: 1, status: "active", created_at: now, updated_at: now, items: names.map(name => ({ item_id: randomUUID(), source_ref_id: randomUUID(), display_name: name, status: phase, attempt: 1, issues: [] })) };
    saveMediaImportBatch(session, batch.project_id, batch, 0); this.ports.changed?.(batch); return batch;
  }
  bindSource(batchId: string, itemId: string, path: string, ready = true): Batch {
    const session = this.session(), batch = this.read(batchId), item = batch.items.find(value => value.item_id === itemId);
    if (!item || !["waiting", "uploading"].includes(item.status) || basename(path) !== item.display_name || batch.status !== "active") throw new MediaImportFailure("MEDIA_IMPORT_SOURCE_STALE", "来源不属于当前等待导入项");
    const old = readMediaImportSource(session, batch.project_id, item.source_ref_id);
    if (old && old.path !== path) throw new MediaImportFailure("MEDIA_IMPORT_SOURCE_REBOUND", "导入来源发生变化");
    if (old && (!ready || item.status === "waiting")) return batch;
    const next = structuredClone(batch); next.items.find(value => value.item_id === itemId)!.status = ready ? "waiting" : item.status;
    return this.save(session, batch, next, old ? [] : [{ project_id: batch.project_id, batch_id: batchId, item_id: itemId, source_ref_id: item.source_ref_id, path, bound_at: new Date().toISOString() }]);
  }
  private failItem(session: Session, batch: Batch, itemId: string, issue: Issue): Batch {
    const next = structuredClone(batch), item = next.items.find(value => value.item_id === itemId)!;
    item.status = "failed"; item.error = issue; item.issues.push({ attempt: item.attempt, observed_at: new Date().toISOString(), error: issue });
    if (next.items.every(terminal)) next.status = next.items.some(value => value.status === "cancelled") ? "stopped" : "partial";
    if (next.status === "stopped" && !next.stop_reason) next.stop_reason = { code: "MEDIA_IMPORT_CANCELLED", message: "批次包含已取消项；成功素材与前次问题均保留", recovery: "retry" };
    return this.save(session, batch, next);
  }
  uploadFailed(batchId: string, itemId: string, cause: unknown): Batch {
    const session = this.session(), batch = this.read(batchId), item = batch.items.find(value => value.item_id === itemId);
    if (!item || item.status !== "uploading") throw new MediaImportFailure("MEDIA_IMPORT_SOURCE_STALE", "上传项已结束或不属于当前批次");
    const { issue, fatal } = classify(cause);
    return fatal ? this.stop(session, batch, issue) : this.failItem(session, batch, itemId, issue);
  }
  private stop(session: Session, batch: Batch, issue: Issue): Batch {
    const next = structuredClone(batch); next.status = "stopped"; next.stop_reason = issue;
    for (const item of next.items) if (!terminal(item)) { item.status = "cancelled"; item.error = issue; item.issues.push({ attempt: item.attempt, observed_at: new Date().toISOString(), error: issue }); }
    return this.save(session, batch, next);
  }
  cancel(batchId: string): Batch {
    const active = this.running.get(batchId);
    const cause = new MediaImportFailure("MEDIA_IMPORT_CANCELLED", "已停止批次，已导入的素材保留");
    if (active) active.controller.abort(cause);
    const batch = this.read(batchId);
    return batch.status === "active" ? this.stop(this.session(), batch, classify(cause).issue) : batch;
  }
  prepareRetry(batchId: string, names: readonly string[], phase: "waiting" | "uploading", paths?: readonly string[]): Batch {
    const session = this.session(), batch = this.read(batchId);
    if (this.running.has(batchId)) throw new MediaImportFailure("MEDIA_IMPORT_BATCH_BUSY", "该批次仍在处理，请等待终态后重试");
    if (!batch.items.some(item => item.status === "failed")) throw new MediaImportFailure("MEDIA_IMPORT_NOT_RETRYABLE", "该批次没有失败项；已取消的来源请重新选择");
    const failed = batch.items.filter(item => item.status === "failed");
    if (JSON.stringify(failed.map(item => item.display_name)) !== JSON.stringify(names) || (paths && paths.length !== failed.length)) throw new MediaImportFailure("MEDIA_IMPORT_RETRY_SELECTION_INVALID", "请只选择失败项对应的同名来源，并保持清单顺序");
    const next = structuredClone(batch); next.status = "active"; delete next.stop_reason;
    const sources: unknown[] = [];
    for (const [index, old] of failed.entries()) {
      const item = next.items.find(item => item.item_id === old.item_id)!;
      item.status = phase; item.attempt++; delete item.error;
      if (paths || phase === "uploading") item.source_ref_id = randomUUID();
      if (paths) sources.push({ project_id: batch.project_id, batch_id: batchId, item_id: item.item_id, source_ref_id: item.source_ref_id, path: paths[index], bound_at: new Date().toISOString() });
    }
    return this.save(session, batch, next, sources);
  }
  async needsSources(batchId: string): Promise<boolean> {
    const session = this.session(), batch = this.read(batchId);
    for (const item of batch.items.filter(item => item.status === "failed")) {
      const source = readMediaImportSource(session, batch.project_id, item.source_ref_id); if (!source) return true;
      try { if (!(await stat(source.path)).isFile()) return true; }
      catch (cause) { if ((cause as { code?: unknown })?.code === "ENOENT") return true; throw cause; }
    }
    return false;
  }
  sourceDiscarded(batchId: string, itemId: string): Batch {
    const session = this.session(), batch = this.read(batchId), item = batch.items.find(item => item.item_id === itemId);
    if (!item || item.status !== "failed" || item.error?.code === "MEDIA_SOURCE_REQUIRED") return batch;
    return this.failItem(session, batch, itemId, { code: "MEDIA_SOURCE_REQUIRED", message: "失败上传的临时文件已清理，请重新选择该失败项的来源；前次错误仍保留在记录中", recovery: "choose-source" });
  }
  retry(batchId: string, control: ImportControl = {}, paths?: readonly string[]): Promise<Batch> {
    control.assertCurrent?.(); if (control.signal?.aborted) throw control.signal.reason;
    if (this.running.has(batchId)) return this.running.get(batchId)!.promise;
    const batch = this.read(batchId);
    this.prepareRetry(batchId, paths?.map(path => basename(path)) ?? batch.items.filter(item => item.status === "failed").map(item => item.display_name), "waiting", paths);
    return this.run(batchId, control);
  }
  async importPaths(paths: readonly string[], identity: ImportIdentity, control: ImportControl = {}): Promise<Batch> {
    control.assertCurrent?.(); if (control.signal?.aborted) throw control.signal.reason;
    const batch = this.create(paths.map(path => basename(path)), identity);
    if (batch.status !== "active") return batch;
    for (const [index, path] of paths.entries()) this.bindSource(batch.batch_id, batch.items[index].item_id, path);
    return this.run(batch.batch_id, control);
  }
  run(batchId: string, parent: ImportControl = {}): Promise<Batch> {
    const existing = this.running.get(batchId); if (existing) return existing.promise;
    const session = this.session(), controller = new AbortController();
    const forward = () => controller.abort(parent.signal!.reason); parent.signal?.addEventListener("abort", forward, { once: true }); if (parent.signal?.aborted) forward();
    const assertCurrent = () => { if (controller.signal.aborted) throw controller.signal.reason; parent.assertCurrent?.(); if (this.ports.session() !== session) throw new MediaImportFailure("REQUEST_PROJECT_CLOSED", "导入属于已关闭项目"); };
    const promise = this.process(session, batchId, { signal: controller.signal, assertCurrent }).finally(() => { parent.signal?.removeEventListener("abort", forward); this.running.delete(batchId); });
    this.running.set(batchId, { session, controller, promise }); return promise;
  }
  private async process(session: Session, batchId: string, control: Required<ImportControl>): Promise<Batch> {
    try {
      let batch = this.read(batchId);
      if (batch.status !== "active") return batch;
      const directory = this.ports.directory(); if (!directory) throw new MediaImportFailure("REQUEST_PROJECT_CLOSED", "项目已关闭");
      const space = await statfs(directory, { bigint: true }); control.assertCurrent();
      if (space.bavail * space.bsize < 16n * 1024n * 1024n) throw new MediaImportFailure("ENOSPC", "项目磁盘空间不足，请释放空间后重试");
      for (const id of batch.items.map(item => item.item_id)) {
        control.assertCurrent(); batch = this.read(batchId);
        const item = batch.items.find(value => value.item_id === id)!;
        if (terminal(item)) continue;
        try {
          const source = readMediaImportSource(session, batch.project_id, item.source_ref_id);
          if (!source) throw new MediaImportFailure("MEDIA_SOURCE_REQUIRED", "来源尚未上传或已失效，请重新选择");
          const validating = structuredClone(batch); validating.items.find(value => value.item_id === id)!.status = "validating";
          batch = this.save(session, batch, validating);
          const original = await this.ports.inspect(source.path, control); control.assertCurrent();
          const duplicate = (listAssetLocations(session, batch.project_id) as Array<{ asset_id: string; location_type: string }>).some(location => location.location_type === "original" && location.asset_id === original.asset.asset_id);
          batch = this.read(batchId); const next = structuredClone(batch), result = next.items.find(value => value.item_id === id)!;
          Object.assign(result, { status: duplicate ? "duplicate" : "imported", asset_id: original.asset.asset_id, asset_location_id: original.location.asset_location_id, byte_length: original.asset.byte_length, compatibility_notes: [...original.compatibility_notes] });
          delete result.error; next.revision++; next.updated_at = new Date().toISOString();
          if (next.items.every(terminal)) next.status = next.items.some(value => value.status === "cancelled") ? "stopped" : next.items.some(value => value.status === "failed") ? "partial" : "completed";
          if (next.status === "stopped" && !next.stop_reason) next.stop_reason = { code: "MEDIA_IMPORT_CANCELLED", message: "批次包含已取消项，成功素材已保留", recovery: "retry" };
          try { batch = registerImportedMedia(session, batch.project_id, { asset: original.asset, location: original.location, batch: next, expected_revision: batch.revision, item_id: id }); }
          catch (cause) { throw new MediaImportFailure("MEDIA_IMPORT_STORAGE_FAILED", message(cause), { cause }); }
          this.ports.changed?.(batch);
        } catch (cause) {
          console.error(`[AVE media import ${batchId}/${id}]`, cause);
          const { issue, fatal } = classify(cause); if (fatal) throw cause;
          batch = this.read(batchId); batch = this.failItem(session, batch, id, issue);
        }
      }
      return this.read(batchId);
    } catch (cause) {
      const { issue } = classify(cause);
      try { const batch = readMediaImportBatch(session, session.manifest.project_id, batchId) as Batch; if (batch.status === "active") this.stop(session, batch, issue); }
      catch (auditFailure) { throw new AggregateError([cause, auditFailure], "导入停止且问题记录保存失败", { cause }); }
      if ((cause as { code?: unknown })?.code === "MEDIA_IMPORT_CANCELLED") return readMediaImportBatch(session, session.manifest.project_id, batchId) as Batch;
      throw cause;
    }
  }
  recoverInterrupted(): void {
    const session = this.session();
    for (const batch of this.list()) if (batch.status === "active" && !this.running.has(batch.batch_id)) this.stop(session, batch, { code: "MEDIA_IMPORT_INTERRUPTED", message: "上次导入中断；成功素材保留，剩余来源请重新选择", recovery: "choose-source" });
  }
  async drain(cause: Error): Promise<void> {
    for (const operation of this.running.values()) operation.controller.abort(cause);
    const results = await Promise.allSettled([...this.running.values()].map(operation => operation.promise));
    const auditFailures = results.filter((result): result is PromiseRejectedResult => result.status === "rejected" && result.reason instanceof AggregateError);
    if (auditFailures.length) throw new AggregateError(auditFailures.map(result => result.reason), "导入停止记录未能安全保存", { cause });
    const session = this.ports.session();
    if(session)for (const batch of this.list()) if (batch.status === "active") this.stop(session, batch, { code: "REQUEST_PROJECT_CLOSED", message: "项目关闭，成功素材保留；剩余来源请重新选择", recovery: "choose-source" });
  }
}
