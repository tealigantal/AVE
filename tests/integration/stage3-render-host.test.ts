import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { fstatSync, readFileSync } from "node:fs";
import syncFs from "node:fs";
import fs from "node:fs/promises";
import { syncBuiltinESMExports } from "node:module";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";
import { readCreationState, registerCreationState, readCreationRender, readObjectSync } from "../../packages/platform/project-storage/src/public.js";
import { createQwenProvider } from "../../packages/platform/model-gateway/src/public.js";

// Actual encoded motion/audio -> actual dual render/QC. Model responses are local fixtures.
const root = await mkdtemp(resolve(tmpdir(), "ave-stage3-render-")), projectRoot = resolve(root, "project"), credential = {}, now = () => Date.parse("2026-09-24T01:00:00Z");
const time = (value: number) => ({ schema_version: 1, value, timescale: 30 });
let decisions = 0;
const provider = createQwenProvider({ api_key: "fixture-only", models: [{ model: "fixture", media_types: ["image/png", "audio/wav"] }], fetch_impl: async (_url, init) => {
  const content = JSON.parse(init!.body as string).messages[0].content;
  if (Array.isArray(content)) {
    const observation = JSON.parse(content[0].text);
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ samples: observation.samples.map((sample: any) => ({ sample_id: sample.sample_id, description: "Controlled synthetic sample", uncertain: false, transcript: [] })) }) }, finish_reason: "stop" }], usage: { prompt_tokens: 100, completion_tokens: 100, total_tokens: 200 } }));
  }
  const body = JSON.parse(content), observations = body.source_spans;
  const firstLength = [45, 60, 36][decisions++]!;
  const decision = { thesis: "Two moving test patterns", shots: observations.map((item: any, index: number) => ({ shot_id: `shot-${index}`, source: { span_id: item.span_id, asset_id: item.asset_id, start: time(0), end: time(index ? 30 : firstLength) }, purpose: "Observed moving pattern", embedded_gain_db: -6, reframe: null, color: null })), audio: [], captions: [], preserve_refs: [], applied_principle_ids: [], feedback_interpretation: body.request.original_text, change_summary: "Unequal observed pattern cuts" };
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(decision) }, finish_reason: "stop" }], usage: { prompt_tokens: 100, completion_tokens: 100, total_tokens: 200 } }));
} });
const host = new ProjectHostSession({ now, creationRequestChannels: [{ credential, actor_id: "user-1" }], provider: "qwen", model: "fixture", modelProvider: provider, creationObservationPolicy: { scene_threshold: 100, max_frame_edge: 64, max_samples: 32, timeout_seconds: 30 }, creationModelPolicy: {   max_attempts: 1, timeout_ms: 30000 } });
const contains = (error: any, code: string): boolean => Boolean(error?.code === code || error?.message?.includes(code) || error?.cause && contains(error.cause, code) || error?.errors?.some((item: unknown) => contains(item, code)));
const rejects = (code: string) => (error: unknown) => contains(error, code);
try {
  const files = [resolve(root, "moving-a.mp4"), resolve(root, "moving-b.mp4")];
  for (const [index, path] of files.entries()) await promisify(execFile)("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", `testsrc2=s=96x64:r=30:d=3`, "-f", "lavfi", "-i", `sine=frequency=${440 + index * 220}:sample_rate=48000:duration=3`, "-vf", `hue=h=${index * 50}`, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-t", "3", path]);
  await host.create(projectRoot); host.initializeTimeline([], { sequence_id: "main", timebase: { value: 1n, timescale: 30n }, tracks: [] });
  const imported = await host.importMedia(files) as any[];
  let session = (host as any).session;
  const { actor_id: _actor, project_id: _project, deployment: _deployment, ...authorization } = JSON.parse(readFileSync("contracts/examples/valid/editorial/creation-session.v1.json", "utf8")).authorization;
  Object.assign(authorization, { asset_ids: imported.map(item => item.asset_id), provider: "qwen", model: "fixture", allowed_data: ["request", "timeline", "evidence", "frames", "audio"] });
  const generate = async (id: string) => {
    host.beginCreationRequest(credential, { ...authorization, request_id: id });
    for (const source of imported) await host.prepareCreationMaterial(credential, { operation_id: `${id}:${source.asset_id}`, request_id: id, asset_id: source.asset_id, asset_location_id: source.asset_location_id });
    const observation = await host.observeCreationMaterial(credential, { request_id: id, expected_revision: 1, material_operation_ids: imported.map(source => `${id}:${source.asset_id}`), include_audio: true });
    return host.generateCreationDraft(credential, { request_id: id, expected_revision: 1, observation_refs: [observation.ref], profile_query: null });
  };
  const counts = () => ({ bundles: session.db.prepare("SELECT count(*) n FROM render_bundles WHERE state='completed'").get().n, receipts: session.db.prepare("SELECT count(*) n FROM object_refs WHERE object_type='creation_render'").get().n, results: session.db.prepare("SELECT count(*) n FROM render_results").get().n });
  const first = await generate("first"), input = { operation_id: "render-first", request_id: "first", draft_id: first.draft_id };
  const state = readCreationState(session, session.manifest.project_id, "first");
  assert.throws(() => registerCreationState(session, session.manifest.project_id, { ...state.value, sequence: state.value.sequence + 1, status: "watchable" }, state.object_hash), rejects("DRAFT_RENDER_PROOF_REQUIRED"));
  await host.close(); await host.open(projectRoot); session = (host as any).session;
  assert.equal(host.readCreationRequest("first").status, "paused");
  const rendered = await host.renderCreationDraft(credential, input);
  assert.equal(rendered.state.status, "watchable"); assert.equal(rendered.state.adopted_draft_id, null); assert.equal(rendered.state.viewed_draft_id, null);
  assert.equal((rendered.receipt.preview.qc_report as any).status, "passed"); assert.equal((rendered.receipt.master.qc_report as any).status, "passed");
  assert.notEqual((rendered.receipt.preview.qc_report as any).render_id, (rendered.receipt.master.qc_report as any).render_id);
  const qcJobs = host.listJobs().filter((job: any) => job.task_type === "qc.master.v1") as any[];
  assert.equal(qcJobs.length, 2); assert.notEqual(qcJobs[0].input.master_path, qcJobs[1].input.master_path);
  const playback = { request_id: "first", draft_id: first.draft_id, render_id: rendered.receipt.bundle.render_id };
  const viewed = await host.readCreationDraftPreview(credential, playback); assert.ok(viewed.bytes.byteLength > 1000); assert.equal(viewed.output_hash, rendered.receipt.preview.output_hash);
  const beforeReuse = counts(), jobCount = host.listJobs().length, requestSequence = host.readCreationRequest("first").sequence;
  const reused = await host.renderCreationDraft(credential, input); assert.deepEqual(reused.receipt, rendered.receipt); assert.deepEqual(counts(), beforeReuse); assert.equal(host.listJobs().length, jobCount); assert.equal(host.readCreationRequest("first").sequence, requestSequence);
  const remove = fs.rm, retained: string[] = [];
  for (const code of ["INJECTED_CLEANUP_EIO_FIRST", "INJECTED_CLEANUP_EIO_SECOND"]) {
    fs.rm = (async (...args: Parameters<typeof fs.rm>) => {
      const path = String(args[0]);
      if (dirname(path) === resolve(projectRoot, "temp") && path.includes("creation-render-")) {
        assert.ok(readCreationRender(session, session.manifest.project_id, input.operation_id));
        retained.push(path); throw Object.assign(new Error(code), { code: "EIO" });
      }
      return remove(...args);
    }) as typeof fs.rm;
    syncBuiltinESMExports();
    try { await assert.rejects(host.renderCreationDraft(credential, input), rejects(code)); }
    finally { fs.rm = remove; syncBuiltinESMExports(); }
    assert.deepEqual(counts(), beforeReuse); assert.equal(host.readCreationRequest("first").status, "watchable");
  }
  const failures = session.db.prepare("SELECT object_hash FROM object_refs WHERE object_type='creation_render_failure' AND relation_key=?").all(input.operation_id).map((row: any) => JSON.parse(readObjectSync(projectRoot, row.object_hash).toString("utf8")));
  assert.equal(failures.length, 2); assert.ok(failures.every((value: any) => value.committed === true));
  for (const code of ["INJECTED_CLEANUP_EIO_FIRST", "INJECTED_CLEANUP_EIO_SECOND"]) assert.ok(failures.some((value: any) => JSON.stringify(value.error).includes(code)));
  assert.deepEqual((await host.renderCreationDraft(credential, input)).receipt, rendered.receipt); assert.equal(host.listJobs().length, jobCount);
  for (const path of retained) { assert.equal(dirname(path), resolve(projectRoot, "temp")); await remove(path, { recursive: true }); }
  const openFile = fs.open, statFile = syncFs.fstatSync;
  let openedFd: number | undefined, statFailed = false;
  fs.open = (async (...args: Parameters<typeof fs.open>) => { const file = await openFile(...args); openedFd ??= file.fd; return file; }) as typeof fs.open;
  syncFs.fstatSync = ((...args: any[]) => { if (args[0] === openedFd && !statFailed) { statFailed = true; throw new Error("INJECTED_SOURCE_FSTAT_FAILURE"); } return (statFile as any)(...args); }) as typeof syncFs.fstatSync;
  syncBuiltinESMExports();
  try { await assert.rejects(host.renderCreationDraft(credential, input), rejects("INJECTED_SOURCE_FSTAT_FAILURE")); }
  finally { fs.open = openFile; syncFs.fstatSync = statFile; syncBuiltinESMExports(); }
  assert.equal(statFailed, true); assert.notEqual(openedFd, undefined);
  assert.throws(() => statFile(openedFd!), (error: any) => error.code === "EBADF", "stat failure must release the just-opened handle");
  assert.deepEqual(counts(), beforeReuse); assert.equal(host.readCreationRequest("first").status, "watchable");
  await host.close(); await host.open(projectRoot); session = (host as any).session;
  assert.deepEqual((await host.readCreationDraftPreview(credential, playback)).bytes, viewed.bytes);
  assert.equal(host.readCreationRequest("first").viewed_draft_id, null);
  const outputRef = session.db.prepare("SELECT * FROM object_refs WHERE object_ref_id = ?").get(rendered.receipt.preview.output_object_ref);
  assert.equal(outputRef.version, null, "immutable render outputs use the existing unversioned object-reference protocol");
  // Keep the media bytes and object_store row: an orphaned file alone must not
  // satisfy saved draft playback or readiness after its actual reference is lost.
  session.db.exec("SAVEPOINT missing_render_output_reference");
  try {
    session.db.prepare("DELETE FROM object_refs WHERE object_ref_id = ?").run(outputRef.object_ref_id);
    await assert.rejects(host.readCreationDraftPreview(credential, playback), rejects("CREATION_RENDER_OUTPUT_REFERENCE_MISSING"));
    assert.throws(() => host.readCreationRequest("first"), rejects("CREATION_RENDER_OUTPUT_REFERENCE_MISSING"));
  } finally { session.db.exec("ROLLBACK TO missing_render_output_reference"); session.db.exec("RELEASE missing_render_output_reference"); }
  assert.deepEqual((await host.readCreationDraftPreview(credential, playback)).bytes, viewed.bytes);

  const second = await generate("second"), beforeFault = counts();
  const faultWorker = (host as any).workerPort, faultSubmit = faultWorker.submit.bind(faultWorker);
  for (const target of ["preview", "master"]) {
    const faultyPath = resolve(root, `bad-${target}.mp4`);
    await promisify(execFile)("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", target === "preview" ? "testsrc2=s=64x48:r=15:d=1" : "testsrc2=s=96x64:r=30:d=3", "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=1", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", faultyPath]);
    const faultyBytes = await readFile(faultyPath), faultyHash = createHash("sha256").update(faultyBytes).digest("hex");
    // Inject a real, hash-consistent but incorrect producer output. The actual
    // QC Worker must detect it; no report, probe result or metric is fabricated.
    faultWorker.submit = async (task: string, value: any, control: any) => {
      const result = await faultSubmit(task, value, control);
      if (task === "render.timeline.v1" && value.execution_plan.target === target) {
        const output = result.outputs.find((item: any) => item.kind === "render");
        await writeFile(output.path, faultyBytes); output.hash = faultyHash; result.metrics.output_hash = faultyHash;
      }
      return result;
    };
    const faultInput = { operation_id: `render-qc-bad-${target}`, request_id: "second", draft_id: second.draft_id };
    try {
      await assert.rejects(host.renderCreationDraft(credential, faultInput), error => {
        assert.ok(contains(error, "CREATION_RENDER_QC_BLOCKED"));
        for (const code of target === "preview" ? ["RESOLUTION", "FRAME_RATE", "DURATION"] : ["AV_SYNC"]) assert.ok(contains(error, code), `QC must retain ${code}`);
        return true;
      });
    } finally { faultWorker.submit = faultSubmit; }
    assert.deepEqual(counts(), beforeFault); assert.equal(host.readCreationRequest("second").status, "failed");
    assert.equal(readCreationRender(session, session.manifest.project_id, faultInput.operation_id), null);
  }
  const failInput = { operation_id: "render-atomic-fault", request_id: "second", draft_id: second.draft_id };
  session.db.exec("CREATE TEMP TRIGGER fail_creation_render BEFORE INSERT ON object_refs WHEN NEW.object_type='creation_render' BEGIN SELECT RAISE(ABORT,'INJECTED_CREATION_RENDER_RECEIPT_FAILURE'); END");
  await assert.rejects(host.renderCreationDraft(credential, failInput), rejects("INJECTED_CREATION_RENDER_RECEIPT_FAILURE"));
  assert.deepEqual(counts(), beforeFault); assert.equal(host.readCreationRequest("second").status, "failed"); assert.equal(readCreationRender(session, session.manifest.project_id, failInput.operation_id), null);
  session.db.exec("DROP TRIGGER fail_creation_render");
  await assert.rejects(host.renderCreationDraft(credential, failInput), rejects("CREATION_RENDER_ATTEMPT_FAILED"));
  const fixedInput = { ...failInput, operation_id: "render-after-fault-fix" }, execute = session.db.exec.bind(session.db);
  let commitAckFault = false;
  session.db.exec = (sql: string) => {
    const result = execute(sql);
    if (sql === "COMMIT" && !commitAckFault && session.db.prepare("SELECT 1 FROM object_refs WHERE object_type='creation_render' AND relation_key=?").get(fixedInput.operation_id)) { commitAckFault = true; throw new Error("POST_COMMIT_ACK_FAILURE"); }
    return result;
  };
  try { await assert.rejects(host.renderCreationDraft(credential, fixedInput), rejects("POST_COMMIT_ACK_FAILURE")); }
  finally { session.db.exec = execute; }
  assert.equal(commitAckFault, true); assert.equal(host.readCreationRequest("second").status, "watchable");
  const committedJobs = host.listJobs().length, committedCounts = counts();
  const secondRendered = await host.renderCreationDraft(credential, fixedInput);
  assert.equal(host.listJobs().length, committedJobs); assert.deepEqual(counts(), committedCounts);
  assert.equal(secondRendered.receipt.timeline_version, second.state.drafts[0]!.timeline_version);
  assert.deepEqual((await host.readCreationDraftPreview(credential, playback)).bytes, viewed.bytes, "historical draft playback cannot follow the latest render");
  const outputPath = resolve(projectRoot, "objects", "sha256", viewed.output_hash.slice(0, 2), viewed.output_hash), bytes = await readFile(outputPath), bad = Buffer.from(bytes); bad[0] ^= 0xff;
  try { await writeFile(outputPath, bad); await assert.rejects(host.readCreationDraftPreview(credential, playback), /object hash mismatch/); }
  finally { await writeFile(outputPath, bytes); }
  assert.deepEqual((await readdir(resolve(projectRoot, "temp"))).filter(name => name.startsWith("creation-render-")), []);

  const third = await generate("closing"), beforeClose = counts(), worker = (host as any).workerPort, submit = worker.submit.bind(worker);
  let release!: () => void, entered!: () => void, masterCalls = 0, qcCalls = 0;
  const paused = new Promise<void>(done => { entered = done; }), resume = new Promise<void>(done => { release = done; });
  worker.submit = async (task: string, value: any, control: any) => {
    if (task === "qc.master.v1") qcCalls++;
    if (task === "render.timeline.v1" && value.execution_plan.target === "master") masterCalls++;
    const result = await submit(task, value, control);
    if (task === "render.timeline.v1" && value.execution_plan.target === "preview") { entered(); await resume; }
    return result;
  };
  const rendering = host.renderCreationDraft(credential, { operation_id: "render-closing", request_id: "closing", draft_id: third.draft_id }), rejection = assert.rejects(rendering, rejects("REQUEST_PROJECT_CLOSED"));
  await paused; let closed = false; const closing = host.close().then(() => { closed = true; });
  await new Promise(done => setImmediate(done)); assert.equal(closed, false); release(); await Promise.all([rejection, closing]); worker.submit = submit;
  assert.equal(masterCalls, 0); assert.equal(qcCalls, 0); await host.open(projectRoot); session = (host as any).session;
  assert.deepEqual(counts(), beforeClose); assert.notEqual(host.readCreationRequest("closing").status, "watchable");
  assert.deepEqual((await readdir(resolve(projectRoot, "temp"))).filter(name => name.startsWith("creation-render-")), []);

  const inspect = (host as any).inspectMediaCandidate.bind(host);
  let inspectionCount = 0, inspected!: () => void, releaseInspection!: () => void, settled = false;
  const inspectionEntered = new Promise<void>(done => { inspected = done; }), inspectionGate = new Promise<void>(done => { releaseInspection = done; });
  (host as any).inspectMediaCandidate = async (...args: any[]) => {
    if (inspectionCount++ === 0) throw new Error("INJECTED_SOURCE_INSPECTION_EIO");
    inspected(); await inspectionGate; return inspect(...args);
  };
  const sourceFault = host.renderCreationDraft(credential, { operation_id: "render-source-fault", request_id: "closing", draft_id: third.draft_id });
  sourceFault.then(() => { settled = true; }, () => { settled = true; });
  const sourceRejection = assert.rejects(sourceFault, rejects("INJECTED_SOURCE_INSPECTION_EIO"));
  try {
    await inspectionEntered; await new Promise(done => setImmediate(done)); assert.equal(settled, false, "failed inspection cannot abandon a second active inspection");
    releaseInspection(); await sourceRejection;
  } finally { (host as any).inspectMediaCandidate = inspect; releaseInspection(); }
  assert.deepEqual(counts(), beforeClose);

  // Inject the trusted port's explicit unconfirmed-ownership state after an
  // actual Preview completes. This tests Host retention separately from the
  // real owner-crash test in stage3-worker-drain; it is not a successful render.
  const ownership = Object.getOwnPropertyDescriptor(worker, "terminationUnconfirmed")!, workerClose = worker.close.bind(worker);
  let ownershipUnconfirmed = false;
  Object.defineProperty(worker, "terminationUnconfirmed", { configurable: true, get: () => ownershipUnconfirmed });
  worker.submit = async (task: string, value: any, control: any) => {
    const result = await submit(task, value, control);
    if (task === "render.timeline.v1" && value.execution_plan.target === "preview") { ownershipUnconfirmed = true; throw new Error("INJECTED_OWNER_TERMINATION_UNCONFIRMED"); }
    return result;
  };
  worker.close = async () => { if (ownershipUnconfirmed) throw new Error("WORKER_TERMINATION_UNCONFIRMED"); return workerClose(); };
  try {
    await assert.rejects(host.renderCreationDraft(credential, { operation_id: "render-unconfirmed", request_id: "closing", draft_id: third.draft_id }), rejects("CREATION_PRODUCER_UNCONFIRMED"));
    assert.deepEqual(counts(), beforeClose); assert.notEqual(host.readCreationRequest("closing").status, "watchable");
    const retained = [...(host as any).unconfirmedRenderProducers.values()] as any[];
    assert.equal(retained.length, 1); assert.equal(retained[0].held.length, 2);
    for (const held of retained[0].held) assert.ok(fstatSync(held.file_handle.fd).isFile());
    assert.ok((await readdir(retained[0].staging)).length > 0);
    await assert.rejects(host.close(), /WORKER_TERMINATION_UNCONFIRMED/);
    await assert.rejects(host.open(projectRoot), /WORKER_TERMINATION_UNCONFIRMED/);
    assert.equal((host as any).session, session, "failed termination retains the actual project session");
    await assert.rejects(host.renderCreationDraft(credential, input), rejects("CREATION_PRODUCER_UNCONFIRMED"));
  } finally {
    Object.defineProperty(worker, "terminationUnconfirmed", ownership); worker.submit = submit; worker.close = workerClose;
    // The injection started no lingering producer. Release test-owned retained
    // resources explicitly; production offers no unverified release shortcut.
    for (const retained of (host as any).unconfirmedRenderProducers.values()) {
      for (const held of retained.held) await held.file_handle.close();
      assert.equal(dirname(retained.staging), resolve(projectRoot, "temp")); await rm(retained.staging, { recursive: true });
    }
    (host as any).unconfirmedRenderProducers.clear();
  }
  console.log("Stage3 draft render: actual dual outputs and independent QC, atomic receipt/readiness, cached reuse, historical reopen/play, corruption denial and cancellation drain passed (encoded synthetic media; local model fixture)");
} finally { await host.close(); if (typeof global.gc === "function") global.gc(); await rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); }
