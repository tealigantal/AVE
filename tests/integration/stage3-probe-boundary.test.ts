import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";
import { creationMediaFacts } from "../../packages/platform/project-host/src/stage3-creative.js";

const root = await mkdtemp(resolve(tmpdir(), "ave-probe-boundary-"));
const run = promisify(execFile);
const source = resolve(root, "supported-video.mp4");
const host = new ProjectHostSession();
const port = (host as any).workerPort;
const submit = port.submit.bind(port);
const summarizeError = (error: any): string => `${error?.message ?? error?.code ?? error}`;

try {
  await run("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "color=c=blue:s=64x64:r=10:d=1", "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=1", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", source]);

  // Real Worker output for a generated supported video is passed to the same
  // Host consumer used by creation; this is independent of the failed project.
  const actual = await (host as any).inspectMediaCandidate(source, "ephemeral");
  const actualFacts = creationMediaFacts(actual.probe);
  assert.ok(actualFacts.video);
  assert.equal(typeof actualFacts.probe_digest, "string");

  const bytes = await readFile(source), details = await stat(source), digest = createHash("sha256").update(bytes).digest("hex");
  let probeResult: any;
  port.submit = async (task: string) => task === "media.fingerprint.v1"
    ? { status: "succeeded", outputs: [{ kind: "media.fingerprint", algorithm: "sha256", digest, byte_length: details.size }] }
    : probeResult;

  const cases = [
    { name: "raw Worker result", result: "unexpected", code: "MEDIA_PROBE_OUTPUT_INVALID", shape: '"status":"unknown","output_kinds":[]' },
    { name: "array Worker result", result: [], code: "MEDIA_PROBE_OUTPUT_INVALID", shape: '"status":"unknown","output_kinds":[]' },
    { name: "missing output", result: { status: "succeeded", outputs: [] }, code: "MEDIA_PROBE_OUTPUT_INVALID", shape: '"output_kinds":[]' },
    { name: "null value", result: { status: "succeeded", outputs: [{ kind: "media.probe", value: null }] }, code: "MEDIA_PROBE_OUTPUT_INVALID", shape: '"value_type":"null"' },
    { name: "raw value", result: { status: "succeeded", outputs: [{ kind: "media.probe", value: "unexpected" }] }, code: "MEDIA_PROBE_OUTPUT_INVALID", shape: '"value_type":"string"' },
    { name: "array value", result: { status: "succeeded", outputs: [{ kind: "media.probe", value: [] }] }, code: "MEDIA_PROBE_OUTPUT_INVALID", shape: '"value_type":"array"' },
    { name: "worker rejection", result: { status: "failed", outputs: [], diagnostics: [{ code: "MEDIA_ANIMATED_IMAGE_UNSUPPORTED", message: `private path ${source}` }] }, code: "MEDIA_PROBE_WORKER_FAILED", shape: '"diagnostic_codes":["MEDIA_ANIMATED_IMAGE_UNSUPPORTED"]' },
  ];
  for (const scenario of cases) {
    probeResult = scenario.result;
    await assert.rejects(() => (host as any).inspectMediaCandidate(source, "ephemeral"), error => {
      const message = summarizeError(error);
      assert.ok(message.includes(scenario.code), `${scenario.name} reports a stable failure category`);
      assert.ok(message.includes(scenario.shape), `${scenario.name} reports the safe structural summary`);
      assert.equal(message.includes(source), false, `${scenario.name} does not expose paths or the raw Worker traceback`);
      return true;
    });
  }

  probeResult = { status: "succeeded", outputs: [{ kind: "media.probe", value: actual.probe }] };
  assert.deepEqual((await (host as any).inspectMediaCandidate(source, "ephemeral")).probe, actual.probe, "valid probe object passes through unchanged");
  console.log("Stage3 probe boundary: actual Worker-to-Host media facts plus missing, null, raw, array, and failed Worker responses passed");
} finally {
  port.submit = submit;
  await host.close();
  await port.close();
  await rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}
