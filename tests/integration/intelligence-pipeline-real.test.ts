import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";

const manifest = process.env.AVE_REAL_MEDIA_MANIFEST, reviewRoot = process.env.AVE_INTELLIGENCE_PIPELINE_REVIEW_ROOT;
if (!manifest) throw new Error("INTELLIGENCE_PIPELINE_REAL_MEDIA_MANIFEST_REQUIRED: set AVE_REAL_MEDIA_MANIFEST to an authorized repository-external manifest");
if (!reviewRoot) throw new Error("INTELLIGENCE_PIPELINE_REVIEW_ROOT_REQUIRED: set AVE_INTELLIGENCE_PIPELINE_REVIEW_ROOT to a fresh repository-external directory");
const run = promisify(execFile);
const result = await run(process.execPath, ["--expose-gc", "--import", "tsx", "tests/integration/intelligence-pipeline-host.test.ts"], { cwd: resolve(import.meta.dirname, "../.."), env: { ...process.env, AVE_PIPELINE_REAL_MODE: "1" }, maxBuffer: 16 * 1024 * 1024 });
assert.match(result.stdout, /INTELLIGENCE_PIPELINE_REAL_REVIEW_ROOT=/);
const review = JSON.parse((await readFile(resolve(reviewRoot, "review", "INTELLIGENCE-PIPELINE-REVIEW.json"))).toString("utf8"));
assert.equal(review.status, "agent_visual_precheck_pending"); assert.equal(review.qc_status, "passed"); assert.equal(review.timeline_version, 2); assert.equal(review.base_execution_id, "execution-pipeline"); assert.equal(review.feedback_diagnosis_id, "diagnosis-pipeline-trim"); assert.match(review.preview_sha256, /^[0-9a-f]{64}$/); assert.match(review.master_sha256, /^[0-9a-f]{64}$/); assert.match(review.execution_semantic_graph_hash, /^[0-9a-f]{64}$/); assert.equal(review.preview_semantic_graph_hash, review.execution_semantic_graph_hash); assert.equal(review.master_semantic_graph_hash, review.execution_semantic_graph_hash);
assert.equal(review.feedback_trim.trim_amount_pts, review.feedback_trim.timescale, "real feedback acceptance must retain an exact one-second trim"); assert.equal(review.feedback_trim.trim_duration_seconds, 1); assert.equal(review.feedback_trim.base_source_end_pts / review.feedback_trim.timescale, 3); assert.equal(review.feedback_trim.revised_source_end_pts / review.feedback_trim.timescale, 2); assert.equal(review.feedback_trim.base_source_end_pts - review.feedback_trim.revised_source_end_pts, review.feedback_trim.trim_amount_pts);
const video = review.output_probe.streams.find((stream: any) => stream.codec_type === "video"); assert.equal(review.output_probe.format.duration, "2.000000"); assert.equal(video?.r_frame_rate, "30/1"); assert.equal(video?.nb_frames, "60");
await access(review.preview_path); await access(review.master_path);
console.log(`Intelligence pipeline authorized real-media render and QC precheck passed: ${reviewRoot}`);
