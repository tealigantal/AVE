import assert from "node:assert/strict";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";
import { listAssetLocationsForAssets, setAssetLocationPermission } from "../../packages/platform/project-storage/src/public.js";
import { sourceRange } from "../../packages/core/media-identity/src/public.js";
import { buildTimelineRenderGraph, canonicalSerialize, renderGraphPayload, resolveExecutionPlan } from "../../packages/core/render-graph/src/public.js";
import { qcMaster } from "../../packages/platform/render-service/src/public.js";

// Synthetic local media and isolated project; no user files or model calls.
const root = await mkdtemp(resolve(tmpdir(), "ave-preview-binding-")), credential = {};
const host = new ProjectHostSession({ now: () => Date.parse("2026-11-11T00:00:00Z"), creationRequestChannels: [{ credential, actor_id: "fixture" }] });
const exec = promisify(execFile);
try {
  const image = resolve(root, "source.png"), video = resolve(root, "source.mp4");
  await exec("python", ["-c", "from PIL import Image; import sys; Image.new('RGB', (1200, 1800), (60, 120, 180)).save(sys.argv[1])", image]);
  await exec("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "testsrc2=s=1200x800:r=30:d=1", "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=1", "-c:v", "libx264", "-threads:v", "1", "-pix_fmt", "yuv420p", "-c:a", "aac", "-t", "1", video]);
  await host.create(resolve(root, "project"));
  host.initializeTimeline([], { sequence_id: "main", timebase: { value: 1n, timescale: 30n }, tracks: [] });
  const imported = await host.importMedia([image, video]) as any[];
  const { actor_id: _actor, project_id: _project, deployment: _deployment, original_locations: _locations, ...fixture } = JSON.parse(await readFile("contracts/examples/valid/editorial/creation-session.v1.json", "utf8")).authorization;
  host.beginCreationRequest(credential, { ...fixture, request_id: "proxy-test", asset_ids: imported.map(item => item.asset_id), original_locations: imported.map(item => ({ asset_id: item.asset_id, asset_location_id: item.asset_location_id })), expires_at: "2027-01-01T00:00:00Z" });
  const session = (host as any).session, project = session.manifest.project_id;
  const sources: Array<{ original_ref: string; original_object_ref: string; asset_ref: Parameters<typeof sourceRange>[0]; source_timescale: bigint; has_audio: boolean; grant: string }> = [];
  for (const [index, item] of imported.entries()) {
    const grant = await host.prepareCreationMaterial(credential, { request_id: "proxy-test", operation_id: `prepare-${index}`, asset_id: item.asset_id, asset_location_id: item.asset_location_id });
    const immutable = (listAssetLocationsForAssets(session, project, [item.asset_id]) as any[]).find(location => location.asset_location_id === grant.value.immutable_location_id);
    assert.ok(immutable);
    sources.push({ original_ref: immutable.location_ref, original_object_ref: immutable.asset_location_id, asset_ref: item.asset_id, source_timescale: 30n, has_audio: index === 1, grant: grant.object_hash });
  }
  const timeline = { version: 1, tracks: [{ track_id: "video", kind: "video", clips: sources.map((source, index) => ({ clip_id: `clip-${index}`, kind: index ? "media" : "image", source: sourceRange(source.asset_ref, 0n, 30n, 30n), timeline_start: BigInt(index * 30), timeline_duration: 30n })) }] };
  const run = async (index: number, label: string, check: () => void = () => {}) => {
    const staging = resolve(root, "project", "temp", label); await mkdir(staging);
    const { grant, ...source } = sources[index];
    return (host as any).prepareCreationPreviewProxy(source, index ? "video" : "image", timeline, grant, staging, new AbortController().signal, check);
  };
  const realSubmit = (host as any).workerPort.submit.bind((host as any).workerPort);
  try {
    (host as any).workerPort.submit = async () => ({ status: "failed", outputs: [], diagnostics: [{ code: "STILL_PROXY_RESOURCE_EXHAUSTED", message: `private path ${root}` }] });
    await assert.rejects(run(0, "still-resource"), (error: any) => error.code === "STILL_PROXY_RESOURCE_EXHAUSTED" && !error.message.includes(root) && error.cause?.diagnostics?.[0]?.code === error.code);
    (host as any).workerPort.submit = async () => ({ status: "failed", outputs: [], diagnostics: [{ code: "OTHER", message: "STILL_PROXY_RESOURCE_EXHAUSTED: untrusted text" }] });
    await assert.rejects(run(0, "still-unrelated"), (error: any) => error.code === "CREATION_PROXY_RESULT_INVALID" && error.cause?.diagnostics?.[0]?.code === "OTHER");
    (host as any).workerPort.submit = async () => ({ status: "failed", outputs: [], diagnostics: [{ code: "STILL_PROXY_RESOURCE_EXHAUSTED", message: "budget" }, { code: "ENOSPC", message: "disk" }] });
    await assert.rejects(run(0, "still-multiple"), (error: any) => error.code === "CREATION_PROXY_RESULT_INVALID" && error.cause?.diagnostics?.length === 2);
  } finally { (host as any).workerPort.submit = realSubmit; }
  const still = await run(0, "still");
  assert.equal(still.record.kind, "image"); assert.equal(still.source.proxy_width, 640); assert.equal(still.source.proxy_height, 960);
  assert.equal(still.source.proxy_map.segments[0].original_end.value, 30n);
  try {
    (host as any).workerPort.submit = async (...args: any[]) => { const result = await realSubmit(...args); result.outputs[0].source_digest = "0".repeat(64); return result; };
    await assert.rejects(run(1, "tampered"), /CREATION_PROXY_RESULT_INVALID|invalid identity/);
  } finally { (host as any).workerPort.submit = realSubmit; }
  const first = await run(1, "video-first");
  assert.equal(first.record.kind, "video"); assert.equal(first.source.original_ref, sources[1].original_ref);
  assert.notEqual(first.source.proxy_ref, first.source.original_ref);
  assert.equal(first.record.original_digest, sources[1].asset_ref.slice("asset:sha256:".length));
  (host as any).workerPort.submit = async () => { throw new Error("unexpected proxy regeneration"); };
  const again = await run(1, "video-again");
  (host as any).workerPort.submit = realSubmit;
  assert.equal(again.source.proxy_object_ref, first.source.proxy_object_ref, "equivalent worker output reuses the content-bound cache object");
  // Actual one-second A/V Preview and Master under the normal strategy. This
  // proves a narrow proxy + QC path, not the bounded renderer or v2 Host entry.
  const heldRender = await (host as any).holdCreationPreviewProxy(first);
  try {
    const asset = first.source.asset_ref;
    const renderTimeline = { version: 1, tracks: [{ track_id: "render-track", kind: "video" as const, clips: [{ clip_id: "render-clip", kind: "media" as const, source: sourceRange(asset, 0n, 30n, 30n), timeline_start: 0n, timeline_duration: 30n }] }] };
    const profiles = { preview: { name: "preview", width: 960, height: 640, fps: 30 }, master: { name: "master", width: 1200, height: 800, fps: 30 } };
    const graphs = Object.fromEntries((["preview", "master"] as const).map(target => [target, buildTimelineRenderGraph(renderTimeline, new Map([[asset, first.source]]), target, profiles[target])])) as Record<"preview" | "master", any>;
    const plans = Object.fromEntries((["preview", "master"] as const).map(target => [target, resolveExecutionPlan(graphs[target], target, { schema_version: 1, mode: "standard-v1" })])) as Record<"preview" | "master", any>;
    assert.equal(plans.preview.semantic_graph_hash, plans.master.semantic_graph_hash);
    assert.equal(graphs.preview.nodes.find((node: any) => node.kind === "source").parameters.source_kind, "proxy");
    assert.equal(graphs.master.nodes.find((node: any) => node.kind === "source").parameters.source_kind, "original");
    const renderedPaths: Partial<Record<"preview" | "master", string>> = {};
    for (const target of ["preview", "master"] as const) {
      heldRender.assertCurrent();
      const outputDir = resolve(root, "project", "temp", `actual-${target}`); await mkdir(outputDir);
      const result = await (host as any).workerPort.submit("render.timeline.v1", { graph: JSON.parse(renderGraphPayload(graphs[target])), execution_plan: JSON.parse(canonicalSerialize(plans[target])), output_dir: outputDir }, {});
      assert.equal(result.status, "succeeded");
      const output = result.outputs.find((item: any) => item.kind === "render"); assert.ok(output);
      renderedPaths[target] = output.path;
      assert.equal(output.source_kind, target === "preview" ? "proxy" : "original");
      const probe = JSON.parse((await exec("ffprobe", ["-v", "error", "-count_frames", "-show_entries", "stream=codec_type,width,height,nb_read_frames", "-of", "json", output.path])).stdout);
      const videoStream = probe.streams.find((stream: any) => stream.codec_type === "video");
      assert.equal(videoStream.width, profiles[target].width); assert.equal(videoStream.height, profiles[target].height); assert.equal(Number(videoStream.nb_read_frames), 30);
      assert.ok(probe.streams.some((stream: any) => stream.codec_type === "audio"), "embedded audio remains present in both targets");
      const report = await qcMaster(output.path, (host as any).workerPort, "original", { render_id: `proxy-real-${target}`, require_audio: true, export_profile: { width: profiles[target].width, height: profiles[target].height, frame_rate: "30/1", duration: 1, duration_tolerance: 0.05 }, av_sync_tolerance: 0.05, source_identity: { source_kind: "original", asset_id: asset, object_ref: first.source.original_object_ref, render_graph_source_kind: target === "preview" ? "proxy" : "original" }, render_graph_sources: [{ asset_id: asset, source_kind: "original", object_ref: first.source.original_object_ref }], source_audio_evidence: [{ asset_id: asset, path: first.source.original_ref }], qc_audio_context: { schema_version: 1, graph: JSON.parse(renderGraphPayload(graphs[target])), execution_plan: JSON.parse(canonicalSerialize(plans[target])) } });
      assert.equal(report.status, "passed", JSON.stringify(report));
      heldRender.assertCurrent();
    }
    const similarity = await exec("ffmpeg", ["-hide_banner", "-i", renderedPaths.preview!, "-i", renderedPaths.master!, "-filter_complex", "[1:v]scale=960:640[base];[0:v][base]ssim", "-an", "-f", "null", "-"]);
    const measured = /All:([0-9.]+)/.exec(similarity.stderr);
    assert.ok(measured && Number(measured[1]) > 0.9, "Preview and downscaled Master retain the same moving picture across the timeline");
    const samples = [];
    for (const target of ["preview", "master"] as const) {
      const audio = await exec("ffmpeg", ["-v", "error", "-i", renderedPaths[target]!, "-vn", "-ac", "1", "-ar", "48000", "-f", "s16le", "-"], { encoding: "buffer" });
      samples.push(audio.stdout.length / 2);
    }
    assert.equal(samples[0], samples[1], "Preview and Master retain the same decoded audio sample count");
    assert.ok(samples[0]! >= 48000 && samples[0]! <= 48128, "audio sample count covers the one-second Timeline");
    const publicationGuard = await (host as any).creationPreviewPublicationGuard([heldRender], () => {}); publicationGuard();
  } finally { await heldRender.release(); }
  // An image uses a still proxy and an independent Master profile. Both
  // targets execute and pass QC with the same Timeline and original authority.
  const heldImage = await (host as any).holdCreationPreviewProxy(still);
  try {
    const asset = still.source.asset_ref, imageSource = { ...still.source, original_width: 1200, original_height: 1800 };
    const imageTimeline = { version: 1, tracks: [{ track_id: "image-track", kind: "video" as const, clips: [{ clip_id: "image-clip", kind: "image" as const, source: sourceRange(asset, 0n, 30n, 30n), timeline_start: 0n, timeline_duration: 30n }] }] };
    const profiles = { preview: { name: "preview", width: 640, height: 960, fps: 30 }, master: { name: "master", width: 1200, height: 1800, fps: 30 } };
    const graphs = Object.fromEntries((["preview", "master"] as const).map(target => [target, buildTimelineRenderGraph(imageTimeline, new Map([[asset, imageSource]]), target, profiles[target])])) as Record<"preview" | "master", any>;
    const plans = Object.fromEntries((["preview", "master"] as const).map(target => [target, resolveExecutionPlan(graphs[target], target, { schema_version: 1, mode: "standard-v1" })])) as Record<"preview" | "master", any>;
    assert.equal(plans.preview.semantic_graph_hash, plans.master.semantic_graph_hash);
    for (const target of ["preview", "master"] as const) {
      const selected = graphs[target].nodes.find((node: any) => node.kind === "source").parameters;
      assert.equal(selected.source_kind, target === "preview" ? "proxy" : "original");
      const outputDir = resolve(root, "project", "temp", `image-${target}`); await mkdir(outputDir);
      const result = await (host as any).workerPort.submit("render.timeline.v1", { graph: JSON.parse(renderGraphPayload(graphs[target])), execution_plan: JSON.parse(canonicalSerialize(plans[target])), output_dir: outputDir }, {});
      const output = result.outputs.find((item: any) => item.kind === "render"); assert.ok(output);
      const probe = JSON.parse((await exec("ffprobe", ["-v", "error", "-count_frames", "-show_entries", "stream=codec_type,width,height,nb_read_frames", "-of", "json", output.path])).stdout);
      const videoStream = probe.streams.find((stream: any) => stream.codec_type === "video");
      assert.equal(videoStream.width, profiles[target].width); assert.equal(videoStream.height, profiles[target].height); assert.equal(Number(videoStream.nb_read_frames), 30);
      const report = await qcMaster(output.path, (host as any).workerPort, "original", { render_id: `image-real-${target}`, require_audio: false, export_profile: { width: profiles[target].width, height: profiles[target].height, frame_rate: "30/1", duration: 1, duration_tolerance: 0.05 }, source_identity: { source_kind: "original", asset_id: asset, object_ref: imageSource.original_object_ref, render_graph_source_kind: target === "preview" ? "proxy" : "original" }, render_graph_sources: [{ asset_id: asset, source_kind: "original", object_ref: imageSource.original_object_ref }], source_audio_evidence: [{ asset_id: asset, path: imageSource.original_ref }], qc_audio_context: { schema_version: 1, graph: JSON.parse(renderGraphPayload(graphs[target])), execution_plan: JSON.parse(canonicalSerialize(plans[target])) } });
      assert.equal(report.status, "passed", JSON.stringify(report));
      heldImage.assertCurrent();
    }
    await heldImage.verify();
  } finally { await heldImage.release(); }
  const count = () => session.db.prepare("SELECT count(*) n FROM object_refs WHERE object_type='creation_preview_proxy'").get().n;
  assert.equal(count(), 2);
  const wrongGrant = resolve(root, "project", "temp", "wrong-grant"); await mkdir(wrongGrant);
  const { grant: _grant, ...imageSource } = sources[0];
  await assert.rejects((host as any).prepareCreationPreviewProxy(imageSource, "image", timeline, sources[1].grant, wrongGrant, new AbortController().signal, () => {}), /matching current material grant/);
  assert.equal(count(), 2, "another asset's grant cannot authorize a cached proxy");
  await assert.rejects(run(0, "revoked", () => { throw new Error("REQUEST_AUTHORIZATION_STALE"); }), /REQUEST_AUTHORIZATION_STALE/);
  assert.equal(count(), 2, "revoked permission publishes no candidate");
  const original = (listAssetLocationsForAssets(session, project, [sources[0].asset_ref]) as any[]).find(item => item.location_type === "original" && item.asset_location_id === imported[0].asset_location_id);
  const permission = original.metadata.permission_decision;
  let checks = 0;
  try {
    await assert.rejects(run(0, "permission-race", () => { if (++checks === 2) setAssetLocationPermission(session, project, sources[0].asset_ref, original.asset_location_id, { ...permission, permission_state: "denied" }); }), /permission|authority|stale/i);
    assert.equal(count(), 2, "permission changed after the first check prevents cache reuse");
  } finally { setAssetLocationPermission(session, project, sources[0].asset_ref, original.asset_location_id, permission); }
  const saved = await readFile(first.source.proxy_ref);
  const cacheMetadata = session.db.prepare("SELECT metadata_json FROM object_refs WHERE project_id=? AND object_ref_id=?").get(project, first.source.proxy_object_ref).metadata_json;
  try {
    session.db.prepare("UPDATE object_refs SET metadata_json=? WHERE project_id=? AND object_ref_id=?").run(JSON.stringify({ ...JSON.parse(cacheMetadata), producer_version: "changed-before-hold" }), project, first.source.proxy_object_ref);
    await assert.rejects((host as any).holdCreationPreviewProxy(first), /cache metadata no longer matches/, "cache producer identity must be checked again while acquiring the hold");
  } finally { session.db.prepare("UPDATE object_refs SET metadata_json=? WHERE project_id=? AND object_ref_id=?").run(cacheMetadata, project, first.source.proxy_object_ref); }
  const held = await (host as any).holdCreationPreviewProxy(first);
  const heldStill = await (host as any).holdCreationPreviewProxy(still);
  try {
    const publicationGuard = await (host as any).creationPreviewPublicationGuard([heldStill, held], () => {});
    publicationGuard();
    await assert.rejects((host as any).creationPreviewPublicationGuard([held, held], () => {}), /unique pinned sources/);
    const cacheRow = session.db.prepare("SELECT metadata_json FROM object_refs WHERE project_id=? AND object_ref_id=?").get(project, first.source.proxy_object_ref);
    try {
      session.db.prepare("UPDATE object_refs SET metadata_json=? WHERE project_id=? AND object_ref_id=?").run(JSON.stringify({ ...JSON.parse(cacheRow.metadata_json), producer_version: "altered" }), project, first.source.proxy_object_ref);
      assert.throws(() => held.assertCurrent(), /cache record changed/);
    } finally { session.db.prepare("UPDATE object_refs SET metadata_json=? WHERE project_id=? AND object_ref_id=?").run(cacheRow.metadata_json, project, first.source.proxy_object_ref); }
    await held.verify();
    session.db.exec("BEGIN IMMEDIATE");
    try {
      session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, 'test.proxy-publication', '{}', ?)").run(project, "2026-11-11T00:00:00Z");
      session.db.prepare("UPDATE object_refs SET metadata_json=? WHERE project_id=? AND object_ref_id=?").run(JSON.stringify({ ...JSON.parse(cacheRow.metadata_json), producer_version: "changed-in-transaction" }), project, first.source.proxy_object_ref);
      assert.throws(() => publicationGuard(), /cache record changed/, "transaction guard rejects identity changes after the final rehash");
    } finally { session.db.exec("ROLLBACK"); }
    assert.equal(session.db.prepare("SELECT count(*) n FROM project_events WHERE event_type='test.proxy-publication'").get().n, 0, "rejected guard permits publication rollback");
    const videoOriginal = (listAssetLocationsForAssets(session, project, [sources[1].asset_ref]) as any[]).find(item => item.location_type === "original" && item.asset_location_id === imported[1].asset_location_id);
    const videoPermission = videoOriginal.metadata.permission_decision;
    try {
      setAssetLocationPermission(session, project, sources[1].asset_ref, videoOriginal.asset_location_id, { ...videoPermission, permission_state: "denied" });
      assert.throws(() => held.assertCurrent(), /permission|authority|stale/i, "held proxy cannot outlive its Original grant");
    } finally { setAssetLocationPermission(session, project, sources[1].asset_ref, videoOriginal.asset_location_id, videoPermission); }
    await held.verify();
    await writeFile(first.source.proxy_ref, Buffer.alloc(saved.length, 0));
    assert.throws(() => held.assertCurrent(), /preview cache file changed/, "synchronous publication guard rejects modified proxy bytes");
    await assert.rejects(held.verify(), /preview cache file changed/, "publication rehash rejects changed pinned files");
    await assert.rejects(run(1, "corrupt-cache"), /damaged|CREATION_PROXY_CACHE_CORRUPT/);
    assert.equal(count(), 2, "damaged cache cannot publish a replacement or silently regenerate");
  } finally { await heldStill.release(); await held.release(); await held.release(); await writeFile(first.source.proxy_ref, saved); }
  assert.throws(() => held.assertCurrent(), /no longer current/, "released handle cannot authorize publication");
  const cancelledStage = resolve(root, "project", "temp", "cancelled-hold"); await mkdir(cancelledStage);
  const controller = new AbortController(), { grant: videoGrant, ...videoSource } = sources[1];
  const cancellable = await (host as any).prepareCreationPreviewProxy(videoSource, "video", timeline, videoGrant, cancelledStage, controller.signal, () => {});
  const cancelledHold = await (host as any).holdCreationPreviewProxy(cancellable);
  try { controller.abort(); assert.throws(() => cancelledHold.assertCurrent(), /operation changed|stale/i, "cancellation invalidates the held proxy"); }
  finally { await cancelledHold.release(); }
  const displaced = `${first.source.proxy_ref}.test-displaced`;
  await rename(first.source.proxy_ref, displaced);
  try { await assert.rejects((host as any).holdCreationPreviewProxy(first), (error: any) => error.code === "CREATION_PROXY_CACHE_CORRUPT" && error.cause?.code === "ENOENT", "missing cache retains its cause and explicit category"); }
  finally { await rename(displaced, first.source.proxy_ref); }
  console.log("Isolated proxy binding, held-file publication guards, actual image and A/V Preview/Master with dual QC passed under the standard strategy.");
} finally {
  await host.close();
  await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
