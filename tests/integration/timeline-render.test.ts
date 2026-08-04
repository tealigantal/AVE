import { strict as assert } from "node:assert";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";
import { renderBundleIdentity } from "../../packages/platform/project-host/src/project-host.js";
import { sourceRange } from "../../packages/core/media-identity/src/public.js";
import { listRenderManifests, openProject, readLatestRenderResult } from "../../packages/platform/project-storage/src/public.js";
import { buildTimelineRenderGraph } from "../../packages/core/render-graph/src/public.js";

const run = promisify(execFile);
const root = await mkdtemp(resolve(tmpdir(), "ai-vlog-timeline-render-"));
const media = resolve(root, "media");
const red = resolve(media, "red.mp4");
const blue = resolve(media, "blue.mp4");
const redProxy = resolve(media, "red-proxy.mp4");
const blueProxy = resolve(media, "blue-proxy.mp4");
const assetA = `asset:sha256:${"a".repeat(64)}` as any;
const assetB = `asset:sha256:${"b".repeat(64)}` as any;

async function makeVideo(path: string, color: string, size = "64x64", sampleRate = 48000): Promise<void> {
  await run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", `color=c=${color}:s=${size}:r=30:d=1`, "-f", "lavfi", "-i", `sine=frequency=440:sample_rate=${sampleRate}:duration=1`, "-shortest", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", path]);
}
async function makeProxy(input: string, output: string): Promise<void> {
  await run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", input, "-vf", "scale=32:32", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", output]);
}

try {
  await mkdir(media, { recursive: true });
  await makeVideo(red, "red", "64x64", 48000); await makeVideo(blue, "blue", "32x64", 44100);
  await makeProxy(red, redProxy); await makeProxy(blue, blueProxy);
  const host = new ProjectHostSession();
  await host.create(root);
  host.initializeTimeline([{ track_id: "v1", kind: "video", clips: [] }]);
  host.applyTimelineCommand({ type: "add_clip", track_id: "v1", clip: { clip_id: "clip-b", source: sourceRange(assetB, 0n, 15n, 30n), timeline_start: 0n, timeline_duration: 15n } }, 0);
  host.applyTimelineCommand({ type: "add_clip", track_id: "v1", clip: { clip_id: "clip-a", source: sourceRange(assetA, 0n, 15n, 30n), timeline_start: 15n, timeline_duration: 15n } }, 1);
  const rendered = await host.renderTimeline({ sources: [{ asset_ref: assetA, original_ref: red, proxy_ref: redProxy, source_timescale: 30n }, { asset_ref: assetB, original_ref: blue, proxy_ref: blueProxy, source_timescale: 30n }], profile: { name: "r11-proxymap-render", width: 36, height: 64 } });
  assert.equal(rendered.status.qc, "passed", JSON.stringify(host.latestRender()));
  assert.notEqual(renderBundleIdentity("preview", "master"), renderBundleIdentity("preview", "master", { subtitle_bounds: { satisfied: true, evidence: ["policy-v2"] } }), "QC policy must participate in render bundle identity");
  host.applyTimelineCommand({ type: "set_effect", track_id: "v1", effect: { effect_id: "blocked-effect", clip_id: "clip-b", kind: "unregistered-effect", parameters: {}, enabled: true } }, 2);
  await assert.rejects(host.renderTimeline({ sources: [{ asset_ref: assetA, original_ref: red, proxy_ref: redProxy, source_timescale: 30n }, { asset_ref: assetB, original_ref: blue, proxy_ref: blueProxy, source_timescale: 30n }], profile: { name: "r11-proxymap-render", width: 36, height: 64 } }), /RENDER_RESOLVER_BLOCKED:EFFECT_UNSUPPORTED/);
  const effectBlockedPlans = (host.listRenderManifests() as any[]).filter((manifest) => manifest.manifest_type === "execution_plan" && manifest.value.diagnostics?.some((diagnostic: any) => diagnostic.code === "EFFECT_UNSUPPORTED"));
  assert.equal(effectBlockedPlans.length, 2, "Host must persist both target plans for an unregistered effect blocker");
  host.applyTimelineCommand({ type: "set_automation_curve", track_id: "v1", curve: { curve_id: "blocked-curve", target_id: "clip-b", property_path: "transform.opacity", value_kind: "number", keyframes: [{ keyframe_id: "blocked-key", time: 0n, value: 1 }] } }, 3);
  await assert.rejects(host.renderTimeline({ sources: [{ asset_ref: assetA, original_ref: red, proxy_ref: redProxy, source_timescale: 30n }, { asset_ref: assetB, original_ref: blue, proxy_ref: blueProxy, source_timescale: 30n }], profile: { name: "r11-proxymap-render", width: 36, height: 64 } }), /RENDER_RESOLVER_BLOCKED:AUTOMATION_RENDER_UNSUPPORTED/);
  const blockedPlans = (host.listRenderManifests() as any[]).filter((manifest) => manifest.manifest_type === "execution_plan" && manifest.value.diagnostics?.some((diagnostic: any) => diagnostic.code === "AUTOMATION_RENDER_UNSUPPORTED"));
  assert.equal(blockedPlans.length, 2, "Host must persist both target plans and their blocker before rejecting Worker submission");
  await host.close();
  const session = await openProject(root);
  const result = readLatestRenderResult(session, session.manifest.project_id, "master") as any;
  assert.equal(result.timeline_version, 2);
  assert.equal(result.original_refs.length, 2);
  assert.equal(result.proxy_refs.length, 2);
  assert.equal(result.proxy_refs.every((reference: any) => reference.proxy_map?.schema_version === 1), true);
  assert.match(result.graph_hash, /^[0-9a-f]{64}$/);
  assert.match(result.output_hash, /^[0-9a-f]{64}$/);
  assert.match(result.worker_version, /^ave-worker-host-r1[01]/);
  const manifests = listRenderManifests(session, session.manifest.project_id) as any[];
  assert.equal(manifests.filter((manifest) => manifest.manifest_type === "execution_plan").length, 6);
  assert.equal(manifests.filter((manifest) => manifest.manifest_type === "output_manifest").length, 2);
  const plans = manifests.filter((manifest) => manifest.manifest_type === "execution_plan" && manifest.value.diagnostics.length === 0).map((manifest) => manifest.value);
  assert.equal(plans[0].semantic_graph_hash, plans[1].semantic_graph_hash, "Preview and Master must persist one semantic graph");
  assert.equal(plans.every((plan) => plan.adapter_id === "worker-media" && plan.diagnostics.length === 0), true);
  assert.equal(manifests.filter((manifest) => manifest.manifest_type === "output_manifest").every((manifest) => manifest.value.semantic_graph_hash === plans[0].semantic_graph_hash), true);
  session.db.exec("PRAGMA wal_checkpoint(TRUNCATE); PRAGMA journal_mode=DELETE;");
  await session.close();
  const transitionRoot = resolve(root, "transition-blocker");
  const transitionHost = new ProjectHostSession();
  await transitionHost.create(transitionRoot);
  transitionHost.initializeTimeline([{ track_id: "v1", kind: "video", clips: [] }]);
  transitionHost.applyTimelineCommand({ type: "add_clip", track_id: "v1", clip: { clip_id: "left", source: sourceRange(assetA, 0n, 15n, 30n), timeline_start: 0n, timeline_duration: 15n } }, 0);
  transitionHost.applyTimelineCommand({ type: "add_clip", track_id: "v1", clip: { clip_id: "right", source: sourceRange(assetB, 0n, 15n, 30n), timeline_start: 15n, timeline_duration: 15n } }, 1);
  transitionHost.applyTimelineCommand({ type: "add_transition", track_id: "v1", transition: { transition_id: "blocked-transition", kind: "spin", from_clip_id: "left", to_clip_id: "right", timeline_start: 10n, timeline_duration: 5n } }, 2);
  await assert.rejects(transitionHost.renderTimeline({ sources: [{ asset_ref: assetA, original_ref: red, proxy_ref: redProxy, source_timescale: 30n }, { asset_ref: assetB, original_ref: blue, proxy_ref: blueProxy, source_timescale: 30n }], profile: { name: "transition-blocker", width: 64, height: 64 } }), /RENDER_RESOLVER_BLOCKED:TRANSITION_HANDLE_EXECUTION_UNSUPPORTED/);
  const transitionPlans = (transitionHost.listRenderManifests() as any[]).filter((manifest) => manifest.manifest_type === "execution_plan" && manifest.value.diagnostics?.some((diagnostic: any) => diagnostic.code === "TRANSITION_HANDLE_EXECUTION_UNSUPPORTED"));
  assert.equal(transitionPlans.length, 2, "unsupported transition semantics must persist Preview and Master blocker plans");
  await transitionHost.close();
  const probe = JSON.parse((await run("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "json", result.output_path])).stdout) as any;
  assert.deepEqual(probe.streams[0], { width: 36, height: 64 }, "vertical canvas must be rendered at the requested profile");
  const firstFrame = await run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-i", result.output_path, "-vf", "crop=2:2:31:31", "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "pipe:1"], { encoding: "buffer" });
  const [r, g, b] = [...firstFrame.stdout.subarray(0, 3)];
  assert.ok(b > r && b > g, `swapped Clip B must render first, got rgb(${r},${g},${b})`);
  const acceptanceTimeline = { version: 2, tracks: [{ track_id: "v1", kind: "video" as const, clips: [{ clip_id: "clip-b", source: sourceRange(assetB, 0n, 15n, 30n), timeline_start: 0n, timeline_duration: 15n }, { clip_id: "clip-a", source: sourceRange(assetA, 0n, 15n, 30n), timeline_start: 15n, timeline_duration: 15n }] }] };
  assert.throws(() => buildTimelineRenderGraph(acceptanceTimeline, new Map([[assetA, { asset_ref: assetA, proxy_ref: red, source_timescale: 30n }], [assetB, { asset_ref: assetB, original_ref: blue, source_timescale: 30n }]]), "master"), /MASTER_ORIGINAL_REQUIRED/);
  assert.throws(() => buildTimelineRenderGraph(acceptanceTimeline, new Map([[assetA, { asset_ref: assetA, original_ref: red, proxy_ref: blue, source_timescale: 30n }], [assetB, { asset_ref: assetB, original_ref: blue, proxy_ref: red, source_timescale: 30n }]]), "preview"), /PROXY_MAP_REQUIRED/);
} finally {
  if (typeof global.gc === "function") global.gc();
  let removed = false;
  for (let attempt = 0; attempt < 12 && !removed; attempt += 1) {
    try { await rm(root, { recursive: true, force: true, maxRetries: 2, retryDelay: 100 }); removed = true; }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "EBUSY") throw error; await new Promise((resolve) => setTimeout(resolve, 250)); if (typeof global.gc === "function") global.gc(); }
  }
  if (!removed) console.warn("timeline render temporary project remains locked; Windows will reclaim it from the temp directory");
}
console.log("timeline render acceptance passed");
