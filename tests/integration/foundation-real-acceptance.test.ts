import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
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
const root = await mkdtemp(resolve(tmpdir(), "ave-foundation-real-"));

try {
  const host = new ProjectHostSession();
  await host.create(root);
  const entry = manifest.originals[0];
  const [imported] = await host.importMedia([entry.path]) as readonly Imported[];
  const video = imported.probe.streams?.find((stream) => stream.codec_type === "video");
  const timeBase = video?.time_base?.match(/^(\d+)\/(\d+)$/);
  if (!timeBase || !video?.duration_ts) throw new Error("FOUNDATION_REAL_VIDEO_TIMING_REQUIRED");
  const numerator = BigInt(timeBase[1]); const timescale = BigInt(timeBase[2]); const duration = BigInt(video.duration_ts) * numerator;
  host.initializeTimeline([{ track_id: "v1", kind: "video", clips: [] }]);
  host.applyTimelineCommand({ type: "add_clip", track_id: "v1", clip: { clip_id: "real-clip", source: sourceRange(imported.asset_id, 0n, duration, timescale), timeline_start: 0n, timeline_duration: duration } }, 0);
  const render = await host.renderTimeline({ sources: [{ asset_ref: imported.asset_id, original_ref: entry.path, ...(entry.proxy_path ? { proxy_ref: entry.proxy_path } : {}), source_timescale: timescale }], profile: { name: "foundation-real" } });
  assert.ok(render.render_id.startsWith("render-"));
  await host.close();
  const reopened = await openProject(root);
  assert.equal(reopened.db.prepare("SELECT MAX(timeline_version) AS version FROM timeline_versions").get().version, 1);
  const results = listRenderResults(reopened, reopened.manifest.project_id) as readonly Readonly<{ target: string; original_refs: readonly Readonly<{ asset_ref: string; object_ref?: string }>[] }>[];
  assert.equal(results.length, 2);
  assert.ok(results.every((result) => result.original_refs.some((reference) => reference.asset_ref === imported.asset_id && reference.object_ref)));
  const manifests = listRenderManifests(reopened, reopened.manifest.project_id) as readonly Readonly<{ manifest_type: string; value: { semantic_graph_hash?: string } }>[];
  const plans = manifests.filter((item) => item.manifest_type === "execution_plan").map((item) => item.value);
  assert.equal(plans.length, 2);
  assert.equal(plans[0].semantic_graph_hash, plans[1].semantic_graph_hash);
  await reopened.close();
  console.log(`foundation real-media acceptance passed: manifest_sha256=${manifestDigest}`);
} finally {
  if (typeof global.gc === "function") global.gc();
  await rm(root, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });
}
