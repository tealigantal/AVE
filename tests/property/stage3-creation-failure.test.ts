import assert from "node:assert/strict";
import { test } from "node:test";
import { projectCreationFailure } from "../../packages/platform/project-host/src/creation-failure.js";

const failed = { status: "failed", sequence: 4, revisions: [{}] };
const record = (phase: string, error: unknown, revision = 1) => ({ input_revision: revision, failure_state_sequence: 4, phase, error });

test("invalid model content has a useful bounded explanation without exposing its payload", () => {
  const result = projectCreationFailure(record("observation", { code: "MODEL_OUTPUT_INVALID", message: "private response or token", output_diagnostic: { payload: '{"uncertain:false":"private"}' } }), failed);
  assert.equal(result?.code, "MODEL_OUTPUT_INVALID");
  assert.match(result!.message, /模型返回内容.*格式或内容校验/);
  assert.doesNotMatch(JSON.stringify(result), /private|token|uncertain/);
  assert.doesNotMatch(result!.message, /内存不足|没有可确认/);
});

test("failure projection distinguishes render targets and never exposes raw diagnostic paths", () => {
  const error = { code: "CREATION_PREVIEW_TIMEOUT", message: "private path /tmp/private.png", cause: { code: "TIMEOUT" } };
  const preview = projectCreationFailure(record("preview-master-render", error), failed);
  assert.equal(preview?.code, "CREATION_PREVIEW_TIMEOUT");
  assert.match(preview!.message, /预览.*超时/);
  assert.doesNotMatch(JSON.stringify(preview), /private|tmp|png/);
  const withDiagnostics = projectCreationFailure(record("preview-master-render", { ...error, render_diagnostic: { stage: "preview", operation: "video_encode", elapsed_ms: 3800, deadline_ms: 305000, frame: 83, exit_code: 1, stderr_tail: "private_filename: Invalid data found when processing input" } }), failed);
  assert.deepEqual(withDiagnostics?.details, { target: "preview", operation: "video_encode", elapsed_seconds: 3.8, timeout_seconds: 305, frame: 83, exit_code: 1, diagnostic_summary: "媒体处理无法识别输入数据。" });
  assert.doesNotMatch(JSON.stringify(withDiagnostics), /private_filename/);
  const wrongTarget = projectCreationFailure(record("preview-master-render", { ...error, render_diagnostic: { stage: "master", frame: 9, elapsed_ms: 100 } }), failed);
  assert.deepEqual(wrongTarget?.details, { target: "preview" });
  const unknownOperation = projectCreationFailure(record("preview-master-render", { ...error, render_diagnostic: { stage: "preview", operation: "private", elapsed_ms: 100 } }), failed);
  assert.equal(unknownOperation?.details?.operation, undefined);
  assert.doesNotMatch(JSON.stringify(unknownOperation), /private/);
  const manual = projectCreationFailure({ ...record("preview-master-render", { code: "ENOSPC" }), render_phase: "render:master" }, failed);
  assert.deepEqual(manual?.details, { target: "master" });
  const conflicting = projectCreationFailure({ ...record("preview-master-render", error), render_phase: "render:master" }, failed);
  assert.equal(conflicting, null);
  const master = projectCreationFailure(record("preview-master-render", { code: "CREATION_MASTER_TIMEOUT" }), failed);
  assert.match(master!.message, /成片.*超时/);
  const historical = projectCreationFailure(record("preview-master-render", { code: null, message: "TIMEOUT: worker job 123 exceeded its deadline" }), failed);
  assert.equal(historical?.code, "CREATION_RENDER_TIMEOUT");
});

test("only the failed current revision may expose a failure and unexpected errors stay unknown", () => {
  assert.equal(projectCreationFailure(record("preview-master-render", { code: "TIMEOUT" }, 2), failed), null);
  assert.equal(projectCreationFailure(record("preview-master-render", { code: "TIMEOUT" }), { ...failed, status: "rendering" }), null);
  assert.equal(projectCreationFailure({ ...record("preview-master-render", { code: "TIMEOUT" }), failure_state_sequence: 3 }, failed), null);
  const unknown = projectCreationFailure(record("observation", { message: "private input or token" }), failed);
  assert.equal(unknown?.code, "CREATION_FAILURE_UNKNOWN");
  assert.match(unknown!.message, /素材分析.*没有错误代码/);
  assert.doesNotMatch(JSON.stringify(unknown), /private|token/);
  const workerUnknown = projectCreationFailure(record("preview-master-render", { code: "WORKER_HANDLER_FAILED", message: "private path" }), failed);
  assert.equal(workerUnknown?.code, "WORKER_HANDLER_FAILED");
  assert.match(workerUnknown!.message, /画面制作.*WORKER_HANDLER_FAILED/);
  assert.doesNotMatch(JSON.stringify(workerUnknown), /private path/);
  const untrustedCode = projectCreationFailure(record("observation", { code: "/private/path" }), failed);
  assert.equal(untrustedCode?.code, "CREATION_FAILURE_UNKNOWN");
  assert.doesNotMatch(JSON.stringify(untrustedCode), /private/);
  const storage = projectCreationFailure(record("preview-master-render", { cause: { code: "ENOSPC" } }), failed);
  assert.match(storage!.message, /空间不足/);
  const encoder = projectCreationFailure(record("preview-master-render", { message: "WORKER_HANDLER_FAILED: ffmpeg: Unknown encoder 'example' /private/source" }), failed);
  assert.equal(encoder?.code, "FFMPEG_ENCODER_UNAVAILABLE");
  assert.doesNotMatch(JSON.stringify(encoder), /private|source|example/);
  const input = projectCreationFailure(record("preview-master-render", { message: "WORKER_HANDLER_FAILED: Invalid data found when processing input" }), failed);
  assert.equal(input?.code, "FFMPEG_INPUT_INVALID");
});

test("bounded-render blockers describe unsupported semantics without claiming an OOM", () => {
  for (const error of [
    { code: "CREATION_RENDER_PREFLIGHT_BLOCKED", message: "BOUNDED_LINEAR_UNVERIFIED" },
    { message: "RENDER_RESOLVER_BLOCKED:OTHER_BLOCKER,BOUNDED_LINEAR_UNSUPPORTED" },
  ]) {
    const result = projectCreationFailure(record("preview-master-render", error), failed);
    assert.equal(result?.code, "CREATION_LOW_RESOURCE_RENDER_UNAVAILABLE");
    assert.match(result!.message, /低资源模式.*不支持.*剪辑效果/);
    assert.doesNotMatch(result!.message, /内存不足|耗尽/);
  }
  const unrelated = projectCreationFailure(record("preview-master-render", { message: "RENDER_RESOLVER_BLOCKED:OTHER_BLOCKER" }), failed);
  assert.notEqual(unrelated?.code, "CREATION_LOW_RESOURCE_RENDER_UNAVAILABLE");
  const outsideRender = projectCreationFailure(record("observation", { message: "RENDER_RESOLVER_BLOCKED:BOUNDED_LINEAR_UNVERIFIED" }), failed);
  assert.notEqual(outsideRender?.code, "CREATION_LOW_RESOURCE_RENDER_UNAVAILABLE");
  const generation = projectCreationFailure(record("generation-and-commit", { code: "CREATION_RENDER_PREFLIGHT_BLOCKED", message: "BOUNDED_LINEAR_UNVERIFIED" }), failed);
  assert.equal(generation?.code, "CREATION_LOW_RESOURCE_RENDER_UNAVAILABLE");
  const corrupt = projectCreationFailure(record("preview-master-render", { code: "CREATION_PROXY_CACHE_CORRUPT", message: "/private/path" }), failed);
  assert.match(corrupt!.message, /预览缓存.*完整性/);
  assert.doesNotMatch(corrupt!.message, /private/);
  const segmentCorrupt = projectCreationFailure(record("preview-master-render", { message: "WORKER_HANDLER_FAILED:RENDER_SEGMENT_CACHE_CORRUPT" }), failed);
  assert.equal(segmentCorrupt?.code, "RENDER_SEGMENT_CACHE_CORRUPT");
  assert.match(segmentCorrupt!.message, /缓存.*完整性/);
  const disk = projectCreationFailure(record("preview-master-render", { message: "WORKER_HANDLER_FAILED:RENDER_SEGMENT_DISK_SPACE_INSUFFICIENT" }), failed);
  assert.equal(disk?.code, "ENOSPC");
  const observation = projectCreationFailure(record("observation", { code: "CREATION_OBSERVATION_MEMORY_BUDGET_EXCEEDED", message: "/private/path" }), failed);
  assert.match(observation!.message, /超过.*预算.*未发送模型请求/);
  assert.doesNotMatch(observation!.message, /private/);
  for (const code of ["MEDIA_IMAGE_RESOURCE_EXHAUSTED", "STILL_PROXY_RESOURCE_EXHAUSTED"]) {
    const image = projectCreationFailure(record("preview-master-render", { code, message: "/private/path" }), failed);
    assert.equal(image?.code, code);
    assert.match(image!.message, /图片.*超过处理预算/);
    assert.doesNotMatch(image!.message, /private/);
  }
  assert.match(projectCreationFailure(record("observation", { code: "MEDIA_IMAGE_PNG_INVALID" }), failed)!.message, /PNG.*完整性/);
  assert.match(projectCreationFailure(record("observation", { code: "MEDIA_IMAGE_PNG_UNSUPPORTED" }), failed)!.message, /PNG.*无法安全保留/);
});
