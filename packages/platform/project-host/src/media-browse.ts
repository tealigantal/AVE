import { createHash, randomUUID } from "node:crypto";
import { lstat, mkdir, open, readFile, realpath, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { Readable } from "node:stream";
import type { WorkerJobPort } from "../../worker-client/src/public.js";
import { mediaBrowseRequestV1Validator, mediaBrowseResultV1Validator } from "../../contract-runtime/src/public.js";
import type { MediaBrowseResultV1 } from "../../../../contracts/generated/typescript/worker/media-browse-result.v1.js";

export type BrowseControl = { signal: AbortSignal; assertCurrent(): void };
type Source = { path: string; digest: string; binding: string };
type Options = { root: string; worker: WorkerJobPort; source(asset: string, control: BrowseControl): Promise<Source>; checkSource(asset: string, source: Source): Promise<void>; audit(value: unknown, operation: string): Promise<void>; assertCurrent(): void; terminationUnconfirmed(): boolean };
type Entry = { owner: number; operation: string; asset: string; controller: AbortController; done: Promise<void>; token?: string; output?: MediaBrowseResultV1; source?: Source; folder?: string; folderIdentity?: string; streams: Set<Readable>; releases: Set<() => Promise<void>>; waveform?: Promise<{ bytes: Uint8Array | null; error: string | null }>; releaseTask?: Promise<void> };
// Windows handle/path stats expose different volume dev IDs; inode is authoritative there.
const identity = (s: { dev: bigint; ino: bigint; size: bigint; mtimeNs: bigint; ctimeNs: bigint }) => `${process.platform === "win32" ? "windows" : s.dev}:${s.ino}:${s.size}:${s.mtimeNs}:${s.ctimeNs}`;
const fail = (code: string): never => { throw new Error(code); };

type RenderPreviewBinding = Readonly<{ path: string; digest: string; timeline_version: number }>;
type PreviewEntry = { owner: number; token: string; binding: RenderPreviewBinding; validate(): RenderPreviewBinding; controller: AbortController; streams: Set<Readable>; releases: Set<() => Promise<void>>; touched: number };

/** Project-owned immutable render streaming, scoped to the owning window. */
export class RenderPreviewSession {
  private readonly entries = new Map<string, PreviewEntry>();
  async prepare(owner: number, validate: () => RenderPreviewBinding, parent: BrowseControl) {
    if (!Number.isSafeInteger(owner) || owner < 1) fail("PREVIEW_OWNER_INVALID");
    parent.assertCurrent(); const binding = validate();
    if (this.entries.size >= 64) {
      const idle = [...this.entries.values()].filter(entry => entry.streams.size === 0 && entry.releases.size === 0).sort((a,b) => a.touched-b.touched)[0] ?? fail("PREVIEW_RESOURCE_LIMIT");
      this.entries.delete(idle.token); idle.controller.abort();
    }
    const entry: PreviewEntry = { owner, token: randomUUID(), binding, validate, controller: new AbortController(), streams: new Set(), releases: new Set(), touched: Date.now() };
    this.entries.set(entry.token, entry);
    return { reference: entry.token, output_hash: binding.digest, timeline_version: binding.timeline_version, mime_type: "video/mp4" };
  }
  async response(owner: number, token: string, method: string, range: string | undefined, parent: BrowseControl) {
    const entry = this.entries.get(token) ?? fail("PREVIEW_REFERENCE_EXPIRED");
    if (entry.owner !== owner || entry.controller.signal.aborted) fail("PREVIEW_REFERENCE_EXPIRED");
    if (method !== "GET" && method !== "HEAD") return { status: 405, headers: { Allow: "GET, HEAD" }, body: null };
    const check = () => { parent.assertCurrent(); if (parent.signal.aborted) throw parent.signal.reason; if (entry.controller.signal.aborted || this.entries.get(token) !== entry) fail("PREVIEW_REFERENCE_EXPIRED"); const current = entry.validate(); if (current.path !== entry.binding.path || current.digest !== entry.binding.digest || current.timeline_version !== entry.binding.timeline_version) fail("PREVIEW_BINDING_CHANGED"); };
    check();
    if ((await lstat(entry.binding.path)).isSymbolicLink()) fail("PREVIEW_OUTPUT_CHANGED");
    const handle = await open(entry.binding.path, "r");
    try {
      const before = await handle.stat({ bigint: true });
      if (!before.isFile() || before.nlink !== 1n || before.size <= 0n || before.size > BigInt(Number.MAX_SAFE_INTEGER)) fail("PREVIEW_OUTPUT_CHANGED");
      const hash = createHash("sha256"), bytes = Buffer.alloc(1024 * 1024); let position = 0;
      while (true) { check(); const { bytesRead } = await handle.read(bytes, 0, bytes.length, position); if (!bytesRead) break; hash.update(bytes.subarray(0, bytesRead)); position += bytesRead; }
      if (hash.digest("hex") !== entry.binding.digest || identity(before) !== identity(await handle.stat({ bigint: true })) || identity(before) !== identity(await lstat(entry.binding.path, { bigint: true }))) fail("PREVIEW_OUTPUT_CHANGED");
      check(); entry.touched = Date.now();
      const size = Number(before.size), headers: Record<string,string> = { "Content-Type": "video/mp4", "Accept-Ranges": "bytes", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
      let start = 0, end = size - 1, status = 200;
      if (range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(range);
        if (!match || (!match[1] && !match[2]) || match.slice(1).some(value => value && !Number.isSafeInteger(Number(value)))) { await handle.close(); return { status: 416, headers: { ...headers, "Content-Range": `bytes */${size}` }, body: null }; }
        start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2])); end = match[1] && match[2] ? Math.min(size - 1, Number(match[2])) : size - 1;
        if (start > end || start >= size || (!match[1] && Number(match[2]) === 0)) { await handle.close(); return { status: 416, headers: { ...headers, "Content-Range": `bytes */${size}` }, body: null }; }
        status = 206; headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
      }
      headers["Content-Length"] = String(end - start + 1);
      if (method === "HEAD") { await handle.close(); return { status, headers, body: null }; }
      let closeTask: Promise<void> | undefined;
      const close = () => closeTask ??= handle.close();
      const body = Readable.from((async function* () {
        try { for (let position = start; position <= end;) { check(); if (identity(await handle.stat({ bigint: true })) !== identity(before) || identity(await lstat(entry.binding.path, { bigint: true })) !== identity(before)) fail("PREVIEW_OUTPUT_CHANGED"); check(); const buffer = Buffer.alloc(Math.min(256 * 1024, end-position+1)); const { bytesRead } = await handle.read(buffer, 0, buffer.length, position); if (identity(await handle.stat({ bigint: true })) !== identity(before) || identity(await lstat(entry.binding.path, { bigint: true })) !== identity(before)) fail("PREVIEW_OUTPUT_CHANGED"); check(); if (!bytesRead) fail("PREVIEW_OUTPUT_TRUNCATED"); position += bytesRead; yield buffer.subarray(0,bytesRead); } }
        finally { await close(); }
      })());
      entry.streams.add(body); body.once("close", () => entry.streams.delete(body));
      entry.releases.add(close); body.once("close", () => { void close().then(() => entry.releases.delete(close), () => {}); });
      const abort = () => body.destroy(new Error("PREVIEW_CANCELLED")); parent.signal.addEventListener("abort", abort, { once: true }); body.once("close", () => parent.signal.removeEventListener("abort", abort));
      return { status, headers, body };
    } catch (error) { await handle.close(); throw error; }
  }
  async releaseOwner(owner: number) { for (const [token,entry] of this.entries) if (entry.owner === owner) { this.entries.delete(token); entry.controller.abort(); for (const stream of entry.streams) stream.destroy(new Error("PREVIEW_CANCELLED")); await Promise.all([...entry.releases].map(close => close())); } }
  async close() { for (const owner of new Set([...this.entries.values()].map(entry => entry.owner))) await this.releaseOwner(owner); }
}

/** One project-session owner. Ephemeral files never replace registered Originals. */
export class MediaBrowseSession {
  private readonly entries = new Map<string, Entry>();
  private readonly tokens = new Map<string, Entry>();
  private readonly cancelled = new Set<string>();
  constructor(private readonly options: Options) {}
  private key(owner: number, operation: string) {
    if (!Number.isSafeInteger(owner) || owner < 1 || !/^[a-zA-Z0-9-]{1,80}$/.test(operation)) fail("MEDIA_BROWSE_OPERATION_INVALID");
    return `${owner}:${operation}`;
  }
  async prepare(owner: number, operation: string, asset: string, parent: BrowseControl) {
    const key = this.key(owner, operation);
    if (this.cancelled.has(key)) fail("MEDIA_BROWSE_CANCELLED");
    if (this.cancelled.size >= 4096) fail("MEDIA_BROWSE_OPERATION_LIMIT");
    if (this.entries.has(key)) fail("MEDIA_BROWSE_OPERATION_REUSED");
    if (this.entries.size >= 16) fail("MEDIA_BROWSE_RESOURCE_LIMIT");
    let finish!: () => void;
    const entry: Entry = { owner, operation, asset, controller: new AbortController(), done: new Promise<void>(accept => { finish = accept; }), streams: new Set(), releases: new Set() };
    this.entries.set(key, entry);
    const abort = () => entry.controller.abort(parent.signal.reason);
    parent.signal.addEventListener("abort", abort, { once: true }); if (parent.signal.aborted) abort();
    const control: BrowseControl = { signal: entry.controller.signal, assertCurrent: () => { parent.assertCurrent(); this.options.assertCurrent(); if (entry.controller.signal.aborted) throw entry.controller.signal.reason; } };
    let success = false, cause: unknown;
    try {
      control.assertCurrent();
      await this.options.audit({ status: "preparing", asset_id: asset }, operation);
      entry.source = await this.options.source(asset, control); control.assertCurrent();
      entry.folder = resolve(this.options.root, `browse-${randomUUID()}`);
      await mkdir(entry.folder); entry.folderIdentity = (await lstat(entry.folder, { bigint: true })).ino.toString();
      const payload = { schema_version: 1, task_type: "media.browse.v1", input_path: entry.source.path, source_digest: entry.source.digest, output_dir: entry.folder, policy: "full-browse-h264-aac-png-v1", timeout_seconds: 300 };
      if (!mediaBrowseRequestV1Validator(payload)) fail("MEDIA_BROWSE_REQUEST_INVALID");
      const result = await this.options.worker.submit<typeof payload, { status: string; outputs: unknown[]; diagnostics: unknown[] }>("media.browse.v1", payload, { signal: control.signal, timeoutMs: 305000 });
      control.assertCurrent();
      if (result.status !== "succeeded" || result.outputs.length !== 1) {
        await this.options.audit({ status: "conversion_failed", asset_id: asset, diagnostics: result.diagnostics }, operation);
        throw new Error(`MEDIA_BROWSE_FAILED: ${(result.diagnostics ?? []).map((item: any) => item.code).join(",") || result.status}`);
      }
      const output = result.outputs[0];
      if (!mediaBrowseResultV1Validator(output)) fail("MEDIA_BROWSE_RECEIPT_INVALID");
      const receipt = output as MediaBrowseResultV1;
      if (receipt.source_digest !== entry.source.digest || receipt.mime_type !== ({ image: "image/png", video: "video/mp4", audio: "audio/mp4" })[receipt.kind]) fail("MEDIA_BROWSE_RECEIPT_REBOUND");
      if (await realpath(dirname(receipt.path)) !== await realpath(entry.folder) || (await lstat(receipt.path)).isSymbolicLink()) fail("MEDIA_BROWSE_PATH_REBOUND");
      entry.output = receipt;
      await this.verify(entry, control); control.assertCurrent();
      entry.token = randomUUID(); this.tokens.set(entry.token, entry);
      await this.options.audit({ status: "ready", ...this.publicReceipt(entry) }, operation);
      control.assertCurrent(); success = true;
      return this.publicReceipt(entry);
    } catch (error) {
      cause = error;
      try { await this.options.audit({ status: entry.controller.signal.aborted ? "cancelled" : "failed", asset_id: asset, error: String(error) }, operation); }
      catch (audit) { throw new AggregateError([error, audit], "Browse preparation and failure audit failed", { cause: error }); }
      throw error;
    } finally {
      parent.signal.removeEventListener("abort", abort);
      try { if (!success) await this.cleanup(entry); }
      catch (cleanup) { throw new AggregateError([cause, cleanup], "Browse preparation and cleanup failed", { cause }); }
      finally { finish(); }
    }
  }
  private publicReceipt(entry: Entry) {
    const output = entry.output!;
    return { asset_id: entry.asset, reference: entry.token!, kind: output.kind, mime_type: output.mime_type, audio_status: output.audio_status, content_digest: output.content_digest, byte_length: output.byte_length, policy: output.policy, tool_identity: output.tool_identity, time_mapping: output.time_mapping };
  }
  private async verify(entry: Entry, control: BrowseControl, keepHandle = false) {
    const source = entry.source ?? fail("MEDIA_BROWSE_SOURCE_CHANGED");
    // The initial fingerprint and Worker receipt bind the source digest. Recheck
    // its identity and permission here without scheduling another full probe.
    await this.options.checkSource(entry.asset, source); control.assertCurrent();
    const output = entry.output!;
    if ((await lstat(output.path)).isSymbolicLink() || await realpath(dirname(output.path)) !== await realpath(entry.folder!)) fail("MEDIA_BROWSE_PATH_REBOUND");
    const handle = await open(output.path, "r");
    try {
      const before = await handle.stat({ bigint: true });
      if (!before.isFile() || before.nlink !== 1n || before.size !== BigInt(output.byte_length)) fail("MEDIA_BROWSE_OUTPUT_CHANGED");
      const hash = createHash("sha256"), bytes = Buffer.alloc(1024 * 1024); let position = 0;
      for (;;) { control.assertCurrent(); const read = await handle.read(bytes, 0, bytes.length, position); if (!read.bytesRead) break; hash.update(bytes.subarray(0, read.bytesRead)); position += read.bytesRead; }
      if (hash.digest("hex") !== output.content_digest || identity(before) !== identity(await handle.stat({ bigint: true })) || identity(before) !== identity(await lstat(output.path, { bigint: true }))) fail("MEDIA_BROWSE_OUTPUT_CHANGED");
      control.assertCurrent(); return { handle, identity: identity(before) };
    } catch (error) { if (keepHandle) await handle.close(); throw error; }
    finally { if (!keepHandle) await handle.close(); }
  }
  async response(owner: number, token: string, method: string, range: string | undefined, parent: BrowseControl) {
    const found = this.tokens.get(token);
    if (!found || found.owner !== owner || found.controller.signal.aborted) throw new Error("MEDIA_BROWSE_REFERENCE_EXPIRED");
    const entry = found;
    if (method !== "GET" && method !== "HEAD") return { status: 405, headers: { Allow: "GET, HEAD" }, body: null };
    const control: BrowseControl = { signal: entry.controller.signal, assertCurrent: () => { parent.assertCurrent(); this.options.assertCurrent(); if (parent.signal.aborted) throw parent.signal.reason; if (entry.controller.signal.aborted || this.tokens.get(token) !== entry) fail("MEDIA_BROWSE_REFERENCE_EXPIRED"); } };
    const verified = await this.verify(entry, control, true), size = entry.output!.byte_length;
    const headers: Record<string, string> = { "Content-Type": entry.output!.mime_type, "Accept-Ranges": "bytes", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
    let start = 0, end = size - 1, status = 200;
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match || (!match[1] && !match[2]) || match.slice(1).some(value => value && !Number.isSafeInteger(Number(value)))) { await verified.handle.close(); return { status: 416, headers: { ...headers, "Content-Range": `bytes */${size}` }, body: null }; }
      start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2])); end = match[1] && match[2] ? Math.min(size - 1, Number(match[2])) : size - 1;
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= size || (!match[1] && Number(match[2]) === 0)) { await verified.handle.close(); return { status: 416, headers: { ...headers, "Content-Range": `bytes */${size}` }, body: null }; }
      status = 206; headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
    }
    headers["Content-Length"] = String(end - start + 1);
    if (method === "HEAD") { await verified.handle.close(); return { status, headers, body: null }; }
    let closeTask: Promise<void> | undefined;
    const close = () => closeTask ??= verified.handle.close();
    const checkSource = this.options.checkSource;
    const body = Readable.from((async function* () {
      try {
        for (let position = start; position <= end;) {
          control.assertCurrent();
          await checkSource(entry.asset, entry.source!); control.assertCurrent();
          if (identity(await verified.handle.stat({ bigint: true })) !== verified.identity) fail("MEDIA_BROWSE_OUTPUT_CHANGED");
          const bytes = Buffer.alloc(Math.min(256 * 1024, end - position + 1)); const read = await verified.handle.read(bytes, 0, bytes.length, position);
          if (!read.bytesRead) fail("MEDIA_BROWSE_OUTPUT_TRUNCATED"); position += read.bytesRead; yield bytes.subarray(0, read.bytesRead);
        }
      } finally { await close(); }
    })());
    entry.streams.add(body); body.once("close", () => entry.streams.delete(body));
    entry.releases.add(close);
    body.once("close", () => { void close().then(() => entry.releases.delete(close), () => { /* Retain the failed close for release/close to report. */ }); });
    const abort = () => body.destroy(new Error("MEDIA_BROWSE_CANCELLED")); parent.signal.addEventListener("abort", abort, { once: true }); body.once("close", () => parent.signal.removeEventListener("abort", abort));
    return { status, headers, body };
  }
  async waveform(owner: number, token: string, parent: BrowseControl) {
    const entry = this.tokens.get(token);
    if (!entry || entry.owner !== owner || entry.controller.signal.aborted) throw new Error("MEDIA_BROWSE_REFERENCE_EXPIRED");
    if (entry.output!.audio_status === "absent") return { bytes: null, error: null };
    if (!entry.waveform) entry.waveform = (async () => {
      const control: BrowseControl = { signal: entry.controller.signal, assertCurrent: () => { parent.assertCurrent(); this.options.assertCurrent(); if (entry.controller.signal.aborted || this.tokens.get(token) !== entry) throw new Error("MEDIA_BROWSE_REFERENCE_EXPIRED"); } };
      try {
        control.assertCurrent(); await this.options.checkSource(entry.asset, entry.source!);
        const result = await this.options.worker.submit<unknown, { status: string; outputs: Array<{ path: string }>; diagnostics: unknown[] }>("media.waveform.v1", { input_path: entry.source!.path, output_dir: entry.folder, timeout_seconds: 30 }, { signal: control.signal, timeoutMs: 35000 });
        control.assertCurrent();
        if (result.status !== "succeeded" || result.outputs.length !== 1) throw new Error(JSON.stringify(result.diagnostics));
        const path = result.outputs[0].path;
        if (await realpath(dirname(path)) !== await realpath(entry.folder!) || (await lstat(path)).isSymbolicLink() || (await lstat(path)).size > 1024 * 1024) throw new Error("MEDIA_BROWSE_WAVEFORM_REBOUND");
        const encoded = await readFile(path); await this.options.checkSource(entry.asset, entry.source!); control.assertCurrent();
        return { bytes: Uint8Array.from(encoded), error: null };
      } catch (error) {
        await this.options.audit({ status: "waveform_failed", asset_id: entry.asset, error: String(error) }, entry.operation);
        if (entry.controller.signal.aborted) throw error;
        return { bytes: null, error: "MEDIA_BROWSE_WAVEFORM_FAILED" };
      }
    })();
    return entry.waveform;
  }
  async reportPlaybackFailure(owner: number, token: string, code: number) {
    this.options.assertCurrent();
    const entry = this.tokens.get(token);
    if (!entry || entry.owner !== owner || entry.controller.signal.aborted) throw new Error("MEDIA_BROWSE_REFERENCE_EXPIRED");
    if (!Number.isInteger(code) || code < 0 || code > 4) throw new Error("MEDIA_BROWSE_PLAYBACK_CODE_INVALID");
    await this.options.audit({ status: "playback_failed", asset_id: entry.asset, content_digest: entry.output!.content_digest, playback_error_code: code }, entry.operation);
  }
  async release(owner: number, operation: string) {
    const key = this.key(owner, operation);
    if (!this.entries.has(key) && !this.cancelled.has(key) && this.cancelled.size >= 4096) fail("MEDIA_BROWSE_OPERATION_LIMIT");
    this.cancelled.add(key);
    const entry = this.entries.get(key); if (!entry) return;
    if (entry.releaseTask) return entry.releaseTask;
    entry.releaseTask = this.releaseEntry(entry);
    return entry.releaseTask;
  }
  private async releaseEntry(entry: Entry) {
    entry.controller.abort(new Error("MEDIA_BROWSE_CANCELLED")); if (entry.token) this.tokens.delete(entry.token);
    for (const stream of entry.streams) stream.destroy(new Error("MEDIA_BROWSE_CANCELLED"));
    await entry.done; if (entry.waveform) await entry.waveform.catch(() => undefined); await this.cleanup(entry);
  }
  private async cleanup(entry: Entry) {
    if (entry.token) this.tokens.delete(entry.token);
    await Promise.all([...entry.releases].map(close => close())); entry.releases.clear();
    if (entry.folder) {
      if (this.options.terminationUnconfirmed()) fail("MEDIA_BROWSE_PRODUCER_UNCONFIRMED");
      const stat = await lstat(entry.folder, { bigint: true });
      if (stat.isSymbolicLink() || !stat.isDirectory() || stat.ino.toString() !== entry.folderIdentity || await realpath(dirname(entry.folder)) !== await realpath(this.options.root)) fail("MEDIA_BROWSE_STAGING_CHANGED");
      await rm(entry.folder, { recursive: true }); entry.folder = undefined;
    }
    this.entries.delete(this.key(entry.owner, entry.operation));
  }
  async close() { await Promise.all([...this.entries.values()].map(entry => this.release(entry.owner, entry.operation))); }
  async releaseOwner(owner: number) { await Promise.all([...this.entries.values()].filter(entry => entry.owner === owner).map(entry => this.release(owner, entry.operation))); }
}
