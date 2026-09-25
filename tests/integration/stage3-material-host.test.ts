import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import fs, { chmod, mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import { syncBuiltinESMExports } from "node:module";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";
import { assetIdFromFingerprint } from "../../packages/core/media-identity/src/public.js";
import { listAssetLocationsForAssets, readCreationMaterial, readObjectSync, setAssetLocationPermission } from "../../packages/platform/project-storage/src/public.js";

// Real encoded bytes, Worker fingerprint/probe, filesystem protection and SQLite.
// Fault injection targets phase boundaries; this test has no model provider.
const root = await mkdtemp(resolve(tmpdir(), "ave-stage3-material-")), sourcePath = resolve(root, "source.mp4");
const credential = {}, secondActor = {}, tick = () => new Promise<void>(done => setImmediate(done));
const now = () => Date.parse("2026-09-24T01:00:00Z");
const { actor_id: _actor, project_id: _project, deployment: _deployment, ...authorization } = JSON.parse(readFileSync("contracts/examples/valid/editorial/creation-session.v1.json", "utf8")).authorization;
const gate = () => { let release!: () => void; const pending = new Promise<void>(done => { release = done; }); return { pending, release }; };
const errorContains = (error: any, code: string): boolean => error?.code === code || error?.message?.includes(code) || errorContainsChild(error, code);
const errorContainsChild = (error: any, code: string): boolean => Boolean(error?.cause && errorContains(error.cause, code) || error?.errors?.some((item: any) => errorContains(item, code)));
const expectedError = (code: string) => (error: unknown) => errorContains(error, code);
const bounded = async <T>(pending: Promise<T>): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { return await Promise.race([pending, new Promise<never>((_done, reject) => { timer = setTimeout(() => reject(new Error("MATERIAL_OPERATION_DID_NOT_SETTLE")), 5000); })]); }
  finally { clearTimeout(timer); }
};
async function fixture(name: string) {
  const projectRoot = resolve(root, name), host = new ProjectHostSession({ now, creationRequestChannels: [{ credential, actor_id: "user-1" }, { credential: secondActor, actor_id: "user-2" }] });
  await host.create(projectRoot); host.initializeTimeline([], { sequence_id: "main", timebase: { value: 1n, timescale: 30n }, tracks: [] });
  const source = (await host.importMedia([sourcePath]))[0] as any;
  const begin = (id: string, assets = [source.asset_id]) => host.beginCreationRequest(credential, { ...authorization, request_id: id, asset_ids: assets });
  const input = (id: string, operation = id) => ({ request_id: id, operation_id: operation, asset_id: source.asset_id, asset_location_id: source.asset_location_id });
  return { host, projectRoot, source, begin, input, get session(): any { return (host as any).session; } };
}
type Fixture = Awaited<ReturnType<typeof fixture>>;
const locations = (f: Fixture): any[] => listAssetLocationsForAssets(f.session, f.session.manifest.project_id, [f.source.asset_id]);
const snapshot = (f: Fixture) => ({
  locations: locations(f),
  receipts: f.session.db.prepare("SELECT object_ref_id,object_hash FROM object_refs WHERE object_type='creation_material' ORDER BY object_ref_id").all(),
  materialEvents: f.session.db.prepare("SELECT event_type,payload_json FROM project_events WHERE event_type IN ('creation.material.prepared','asset.location.registered','asset.permission.recorded') ORDER BY event_id").all(),
});
const immutablePath = (f: Fixture) => { const digest = f.source.asset_id.slice("asset:sha256:".length); return resolve(f.projectRoot, "originals", "sha256", digest.slice(0, 2), digest); };
const exists = async (path: string) => stat(path).then(() => true, error => { if (error.code === "ENOENT") return false; throw error; });
const noTemporary = async (f: Fixture) => assert.deepEqual((await readdir(resolve(f.projectRoot, "temp"))).filter(name => name.startsWith("immutable-original-")), []);
const noModel = (f: Fixture) => {
  assert.equal(f.session.db.prepare("SELECT count(*) n FROM model_runs").get().n, 0);
  assert.equal(f.session.db.prepare("SELECT count(*) n FROM object_refs WHERE object_type='creation_draft_execution'").get().n, 0);
};
let current: Fixture | undefined;
try {
  await promisify(execFile)("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "testsrc2=s=64x64:r=30:d=1", "-c:v", "libx264", "-pix_fmt", "yuv420p", sourcePath]);
  const originalBytes = await readFile(sourcePath);

  current = await fixture("scopes");
  const f = current; f.begin("first");
  const initial = snapshot(f);
  await assert.rejects(f.host.prepareCreationMaterial({}, f.input("first")), expectedError("REQUEST_CHANNEL_DENIED"));
  await assert.rejects(f.host.prepareCreationMaterial(secondActor, f.input("first")), expectedError("REQUEST_ACTOR_DENIED"));
  assert.throws(() => f.begin("outside", ["asset:sha256:" + "f".repeat(64)]), expectedError("REQUEST_ASSET_UNKNOWN"));
  await assert.rejects(f.host.prepareCreationMaterial(credential, { ...f.input("first"), asset_id: assetIdFromFingerprint({ algorithm: "sha256", digest: "f".repeat(64), byte_length: 1n }) }), expectedError("CREATION_SOURCE_DENIED"));
  assert.deepEqual(snapshot(f), initial); assert.equal(await exists(immutablePath(f)), false);
  const first = await f.host.prepareCreationMaterial(credential, f.input("first"));
  const original = locations(f).find(item => item.location_type === "original"), immutable = locations(f).find(item => item.location_type === "immutable_original");
  assert.equal(first.value.scope, "project_creation"); assert.equal(first.value.original_location_id, f.source.asset_location_id);
  const authRef = f.session.db.prepare("SELECT object_type,relation_key,version,object_hash FROM object_refs WHERE object_ref_id=?").get(first.value.authorization_ref.object_id);
  assert.equal(authRef.object_type, "creation_session"); assert.equal(authRef.relation_key, "first"); assert.equal(authRef.version, 1); assert.equal(authRef.object_hash, first.value.authorization_ref.digest);
  assert.equal(JSON.parse(readObjectSync(f.session.projectDirectory, authRef.object_hash).toString()).authorization.actor_id, "user-1");
  assert.deepEqual(await readFile(immutable.location_ref), originalBytes); assert.equal((await stat(immutable.location_ref)).mode & 0o222, 0);
  const beforeRetry = snapshot(f); assert.deepEqual(await f.host.prepareCreationMaterial(credential, f.input("first")), first); assert.deepEqual(snapshot(f), beforeRetry);
  f.begin("second"); const second = await f.host.prepareCreationMaterial(credential, f.input("second"));
  assert.notEqual(second.value.authorization_ref.object_id, first.value.authorization_ref.object_id);
  assert.deepEqual(locations(f).find(item => item.asset_location_id === original.asset_location_id).metadata.permission_decision, original.metadata.permission_decision);
  assert.deepEqual(await f.host.prepareCreationMaterial(credential, f.input("first")), first, "another request must not invalidate an existing material receipt");
  await assert.rejects(f.host.prepareCreationMaterial(credential, f.input("second", "first")), expectedError("CREATION_MATERIAL_IDEMPOTENCY_CONFLICT"));
  await f.host.close(); await f.host.open(f.projectRoot);
  assert.deepEqual(readCreationMaterial(f.session, f.session.manifest.project_id, "first"), first);
  assert.deepEqual(await f.host.prepareCreationMaterial(credential, f.input("first")), first);
  const denied = { ...original.metadata.permission_decision, permission_state: "denied" };
  setAssetLocationPermission(f.session, f.session.manifest.project_id, f.source.asset_id, f.source.asset_location_id, denied);
  const beforeDenied = snapshot(f);
  await assert.rejects(f.host.prepareCreationMaterial(credential, f.input("first")), expectedError("CREATION_MATERIAL_DENIED"));
  assert.deepEqual(snapshot(f), beforeDenied); noModel(f); await f.host.close(); current = undefined;

  for (const [name, code] of [["cancel", "REQUEST_CANCELLED"], ["revoke", "REQUEST_REVOKED"], ["revise", "REQUEST_REVISION_STALE"], ["denial", "CREATION_MATERIAL_LOCATION_STALE"]] as const) {
    current = await fixture(name); const f = current; f.begin(name); const before = snapshot(f), prepare = (f.host as any).prepareImmutableOriginal.bind(f.host);
    let afterDenial: ReturnType<typeof snapshot> | undefined;
    (f.host as any).prepareImmutableOriginal = async (...args: any[]) => {
      const prepared = await prepare(...args);
      if (name === "denial") {
        const ref = f.session.db.prepare("SELECT object_ref_id,object_hash FROM object_refs WHERE object_type='creation_session' AND relation_key=? AND version=1").get(name);
        setAssetLocationPermission(f.session, f.session.manifest.project_id, f.source.asset_id, f.source.asset_location_id, { permission_state: "denied", actor_id: "user-1", decided_at: new Date(now()).toISOString(), policy_ref: { object_id: ref.object_ref_id, object_version: 1, digest: ref.object_hash } });
        afterDenial = snapshot(f);
      } else if (name === "revise") f.host.reviseCreationRequest(credential, name, 1, { raw_text: "Keep only the visible action", viewed_timeline_version: null, preserve_refs: [] });
      else f.host.cancelCreationRequest(credential, name, name === "revoke");
      return prepared;
    };
    await assert.rejects(f.host.prepareCreationMaterial(credential, f.input(name)), expectedError(code));
    assert.deepEqual(snapshot(f), afterDenial ?? before); assert.equal(await exists(immutablePath(f)), false); await noTemporary(f);
    assert.deepEqual(await readFile(sourcePath), originalBytes); assert.equal((f.host as any).creationModelOperations.size, 0); noModel(f); await f.host.close(); current = undefined;
  }

  current = await fixture("atomic"); {
    const f = current; f.begin("atomic"); const before = snapshot(f);
    f.session.db.exec("CREATE TEMP TRIGGER fail_material_event BEFORE INSERT ON project_events WHEN NEW.event_type='creation.material.prepared' BEGIN SELECT RAISE(ABORT, 'INJECTED_MATERIAL_EVENT_FAILURE'); END");
    await assert.rejects(f.host.prepareCreationMaterial(credential, f.input("atomic")), expectedError("INJECTED_MATERIAL_EVENT_FAILURE"));
    assert.deepEqual(snapshot(f), before); assert.equal(f.session.db.isTransaction, false); assert.equal(await exists(immutablePath(f)), false); await noTemporary(f);
    f.session.db.exec("DROP TRIGGER fail_material_event");
    // Same logical operation may proceed only because its failed transaction never committed.
    const result = await f.host.prepareCreationMaterial(credential, f.input("atomic")); assert.equal(result.value.operation_id, "atomic");
    noModel(f); await f.host.close(); current = undefined;
  }

  current = await fixture("write-close"); {
    const f = current; f.begin("copy"); const before = snapshot(f), writing = gate(), resume = gate();
    const copy = (f.host as any).copyIntoStage2ImmutableHandle.bind(f.host), inspect = (f.host as any).inspectMediaCandidate.bind(f.host);
    let writeCalls = 0, inspectionsAfterCopy = 0, copying = false;
    (f.host as any).copyIntoStage2ImmutableHandle = async (path: string, destination: any, control: any) => {
      copying = true; const write = destination.write.bind(destination);
      destination.write = async (...args: any[]) => { writeCalls++; writing.release(); await resume.pending; return write(...args); };
      return copy(path, destination, control);
    };
    (f.host as any).inspectMediaCandidate = (...args: any[]) => { if (copying) inspectionsAfterCopy++; return inspect(...args); };
    const preparing = f.host.prepareCreationMaterial(credential, f.input("copy")), rejected = assert.rejects(preparing, expectedError("REQUEST_PROJECT_CLOSED"));
    await bounded(writing.pending); let closed = false; const closing = f.host.close().then(() => { closed = true; });
    await tick(); assert.equal(closed, false, "close must drain the actual pending write, not abandon its producer");
    resume.release(); await bounded(Promise.all([rejected, closing])); assert.equal(writeCalls, 1); assert.equal(inspectionsAfterCopy, 0);
    await f.host.open(f.projectRoot); assert.deepEqual(snapshot(f), before); assert.equal(await exists(immutablePath(f)), false); await noTemporary(f);
    assert.deepEqual(await readFile(sourcePath), originalBytes); noModel(f); await f.host.close(); current = undefined;
  }

  current = await fixture("queued"); {
    const f = current; f.begin("leader"); f.begin("queued"); const copying = gate(), resume = gate(), copy = (f.host as any).copyIntoStage2ImmutableHandle.bind(f.host);
    let copies = 0;
    (f.host as any).copyIntoStage2ImmutableHandle = async (...args: any[]) => { copies++; copying.release(); await resume.pending; return copy(...args); };
    const leader = f.host.prepareCreationMaterial(credential, f.input("leader")); await bounded(copying.pending);
    const queued = f.host.prepareCreationMaterial(credential, f.input("queued")), rejected = assert.rejects(queued, expectedError("REQUEST_CANCELLED"));
    f.host.cancelCreationRequest(credential, "queued"); resume.release(); await bounded(Promise.all([leader, rejected]));
    assert.equal(copies, 1); assert.equal(readCreationMaterial(f.session, f.session.manifest.project_id, "queued"), null);
    f.begin("after-queue"); await bounded(f.host.prepareCreationMaterial(credential, f.input("after-queue"))); assert.equal(copies, 1);
    noModel(f); await f.host.close(); current = undefined;
  }

  current = await fixture("after-commit"); {
    const f = current; f.begin("committed"); const db = f.session.db, exec = db.exec.bind(db); let cancelled = false;
    db.exec = (sql: string) => {
      const result = exec(sql);
      if (sql === "COMMIT" && !cancelled && readCreationMaterial(f.session, f.session.manifest.project_id, "committed")) { cancelled = true; f.host.cancelCreationRequest(credential, "committed"); }
      return result;
    };
    const result = await f.host.prepareCreationMaterial(credential, f.input("committed")); db.exec = exec;
    assert.equal(cancelled, true); assert.equal(f.host.readCreationRequest("committed").status, "cancelled");
    assert.deepEqual(readCreationMaterial(f.session, f.session.manifest.project_id, "committed"), result); assert.equal(await exists(immutablePath(f)), true);
    assert.deepEqual(await readFile(immutablePath(f)), originalBytes); await noTemporary(f); noModel(f); await f.host.close(); current = undefined;
  }

  if (process.platform === "win32") {
    current = await fixture("cleanup-mode"); const f = current; f.begin("cleanup");
    const prepare = (f.host as any).prepareImmutableOriginal.bind(f.host), realOpen = fs.open;
    let injected = false;
    (f.host as any).prepareImmutableOriginal = async (...args: any[]) => { const result = await prepare(...args); f.host.cancelCreationRequest(credential, "cleanup"); return result; };
    fs.open = (async (...args: Parameters<typeof fs.open>) => {
      const handle = await realOpen(...args);
      if (String(args[0]) === immutablePath(f) && f.host.readCreationRequest("cleanup").status === "cancelled") {
        const originalChmod = handle.chmod.bind(handle), originalStat = handle.stat.bind(handle); let madeWritable = false;
        handle.chmod = async mode => { await originalChmod(mode); if ((Number(mode) & 0o222) !== 0) madeWritable = true; };
        handle.stat = (async (...statArgs: any[]) => { if (madeWritable && !injected) { injected = true; throw Object.assign(new Error("INJECTED_POST_CHMOD_STAT_EIO"), { code: "EIO" }); } return (originalStat as any)(...statArgs); }) as typeof handle.stat;
      }
      return handle;
    }) as typeof fs.open;
    syncBuiltinESMExports();
    try {
      await assert.rejects(f.host.prepareCreationMaterial(credential, f.input("cleanup")), error => expectedError("REQUEST_CANCELLED")(error) && expectedError("INJECTED_POST_CHMOD_STAT_EIO")(error));
    } finally { fs.open = realOpen; syncBuiltinESMExports(); }
    assert.equal(injected, true); assert.equal((await stat(immutablePath(f))).mode & 0o222, 0, "cleanup failure must restore readonly protection through the held inode");
    assert.equal(readCreationMaterial(f.session, f.session.manifest.project_id, "cleanup"), null); assert.equal(locations(f).filter(item => item.location_type === "immutable_original").length, 0);
    assert.deepEqual(await readFile(sourcePath), originalBytes); assert.equal((f.host as any).creationModelOperations.size, 0);
    await chmod(immutablePath(f), 0o600); await rm(immutablePath(f)); noModel(f); await f.host.close(); current = undefined;
  }
  console.log("Stage3 material: trusted request receipts, atomic permissions, idempotency/reopen, denial/revision/revoke, copy/close drain, queued cancellation, post-commit success and Windows cleanup protection passed (encoded synthetic media; no model calls)");
} finally {
  await current?.host.close(); if (typeof global.gc === "function") global.gc();
  await rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}
