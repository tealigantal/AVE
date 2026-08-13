import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";
import { listRenderManifests, listRenderResults, openProject } from "../../packages/platform/project-storage/src/public.js";
import { sourceRange, type AssetId } from "../../packages/core/media-identity/src/public.js";

type Manifest = Readonly<{ schema_version: 1; originals: readonly Readonly<{ path: string; proxy_path?: string; attribution?: string }>[] }>;
type Imported = Readonly<{ asset_id: AssetId; probe: { streams?: readonly Readonly<{ codec_type?: string; time_base?: string; duration_ts?: string }>[] } }>;

const manifestPath = process.env.AVE_REAL_MEDIA_MANIFEST;
if (!manifestPath) throw new Error("FOUNDATION_REAL_MEDIA_MANIFEST_REQUIRED: set AVE_REAL_MEDIA_MANIFEST to an authorized repository-external JSON manifest");
const manifestBytes = await readFile(manifestPath);
const manifest = JSON.parse(manifestBytes.toString("utf8")) as Manifest;
if (manifest.schema_version !== 1 || !Array.isArray(manifest.originals) || manifest.originals.length === 0 || manifest.originals.some((entry) => !entry.path)) throw new Error("FOUNDATION_REAL_MEDIA_MANIFEST_INVALID");
const manifestDigest = createHash("sha256").update(manifestBytes).digest("hex");
const reviewRoot = process.env.AVE_FOUNDATION_REVIEW_ROOT;
const root = reviewRoot ? resolve(reviewRoot) : await mkdtemp(resolve(tmpdir(), "ave-foundation-real-"));
if (reviewRoot) await mkdir(root, { recursive: false });

try {
  const host = new ProjectHostSession();
  await host.create(root);
  const entry = manifest.originals[0];
  const [imported] = await host.importMedia([entry.path]) as readonly Imported[];
  const relinkPath = resolve(root, "links", "relinked-original.mp4");
  await copyFile(entry.path, relinkPath);
  await host.relinkOriginal(imported.asset_id, relinkPath);
  const video = imported.probe.streams?.find((stream) => stream.codec_type === "video");
  const timeBase = video?.time_base?.match(/^(\d+)\/(\d+)$/);
  if (!timeBase || !video?.duration_ts) throw new Error("FOUNDATION_REAL_VIDEO_TIMING_REQUIRED");
  const numerator = BigInt(timeBase[1]); const timescale = BigInt(timeBase[2]); const duration = BigInt(video.duration_ts) * numerator;
  host.initializeTimeline([{ track_id: "v1", kind: "video", clips: [] }]);
  host.applyTimelineCommand({ type: "add_clip", track_id: "v1", clip: { clip_id: "real-clip", source: sourceRange(imported.asset_id, 0n, duration, timescale), timeline_start: 0n, timeline_duration: duration } }, 0);
  const render = await host.renderTimeline({ sources: [{ asset_ref: imported.asset_id, original_ref: relinkPath, ...(entry.proxy_path ? { proxy_ref: entry.proxy_path } : {}), source_timescale: timescale }], profile: { name: "foundation-real" } });
  assert.ok(render.render_id.startsWith("render-"));
  await host.close();
  const reopened = await openProject(root);
  assert.equal(reopened.db.prepare("SELECT MAX(timeline_version) AS version FROM timeline_versions").get().version, 1);
  const results = listRenderResults(reopened, reopened.manifest.project_id) as readonly Readonly<{ render_id: string; target: string; output_hash: string; original_refs: readonly Readonly<{ asset_ref: string; object_ref?: string }>[] }>[];
  assert.equal(results.length, 2);
  assert.ok(results.every((result) => result.original_refs.some((reference) => reference.asset_ref === imported.asset_id && reference.object_ref)));
  const manifests = listRenderManifests(reopened, reopened.manifest.project_id) as readonly Readonly<{ manifest_type: string; value: { semantic_graph_hash?: string } }>[];
  const plans = manifests.filter((item) => item.manifest_type === "execution_plan").map((item) => item.value);
  assert.equal(plans.length, 2);
  assert.equal(plans[0].semantic_graph_hash, plans[1].semantic_graph_hash);
  const latestRender = reopened.db.prepare("SELECT qc_status, qc_report_json, preview_path, master_path FROM render_runs ORDER BY created_at DESC LIMIT 1").get() as Readonly<{ qc_status: string; qc_report_json: string; preview_path: string; master_path: string }>;
  assert.equal(latestRender.qc_status, "passed");
  if (reviewRoot) {
    await writeFile(resolve(root, "FOUNDATION-REVIEW.json"), JSON.stringify({
      schema_version: 1,
      manifest_sha256: manifestDigest,
      source_attribution: entry.attribution ?? null,
      timeline_version: 1,
      render_id: results[0]?.render_id,
      preview: latestRender.preview_path,
      master: latestRender.master_path,
      qc: JSON.parse(latestRender.qc_report_json),
      semantic_graph_hash: plans[0].semantic_graph_hash,
      verified_original_asset_id: imported.asset_id,
      relink: { candidate: "links/relinked-original.mp4", verified_same_asset_id: true },
      render_results: results.map((result) => ({ target: result.target, output_hash: result.output_hash, original_refs: result.original_refs })),
      human_acceptance: "pending"
    }, null, 2) + "\n");
  }
  await reopened.close();
  console.log(`foundation real-media acceptance passed: manifest_sha256=${manifestDigest}${reviewRoot ? ` review_root=${root}` : ""}`);
} finally {
  if (typeof global.gc === "function") global.gc();
  if (!reviewRoot) await rm(root, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });
}
