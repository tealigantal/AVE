import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { sourceRange } from "../../packages/core/media-identity/src/public.js";
import { createQwenProvider } from "../../packages/platform/model-gateway/src/public.js";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";
import { listAssetLocationsForAssets, readObjectSync } from "../../packages/platform/project-storage/src/public.js";

// A synthetic fixture and a controlled local model response; no real service,
// user project, source media, or paid model call is accessed.
process.env.AVE_LOW_RESOURCE = "1";
const root = await mkdtemp(resolve(tmpdir(), "ave-large-still-host-")), run = promisify(execFile), credential = {};
let sends = 0;
const adapter = createQwenProvider({ api_key: "fixture-only", models: [{ model: "fixture-model", media_types: ["image/png"] }], fetch_impl: async (_url, init) => {
  sends++;
  const wire = JSON.parse(init!.body as string), content = wire.messages[0].content, context = JSON.parse(content[0].text);
  assert.ok(content.some((item: any) => item.type === "image_url" && item.image_url.url.startsWith("data:image/png;base64,")));
  assert.equal(context.samples.length, 1);
  const output = { samples: context.samples.map((sample: any) => ({ sample_id: sample.sample_id, description: "Synthetic fixture", uncertain: true, transcript: [] })) };
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(output) }, finish_reason: "stop" }], usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } }));
} });
const host = new ProjectHostSession({ now: () => Date.parse("2026-11-11T00:00:00Z"), creationRequestChannels: [{ credential, actor_id: "fixture" }], provider: "qwen", model: "fixture-model", modelProvider: adapter, creationModelPolicy: { max_attempts: 1, timeout_ms: 120000 }, creationObservationPolicy: { scene_threshold: 10, max_frame_edge: 960, max_samples: 20, timeout_seconds: 90 } });
try {
  const image = resolve(root, "large.jpg");
  await run("python", ["-c", "from PIL import Image; import sys; im=Image.new('RGB',(6503,4001),(60,120,180)); ex=Image.Exif(); ex[274]=6; im.save(sys.argv[1],exif=ex); im.close()", image]);
  await host.create(resolve(root, "project"));
  host.initializeTimeline([], { sequence_id: "main", timebase: { value: 1n, timescale: 30n }, tracks: [] });
  const imported = (await host.importMedia([image]))[0] as any;
  const fixture = JSON.parse(await readFile("contracts/examples/valid/editorial/creation-session.v1.json", "utf8")).authorization;
  const { actor_id: _actor, project_id: _project, deployment: _deployment, original_locations: _locations, ...authorization } = fixture;
  host.beginCreationRequest(credential, { ...authorization, request_id: "large-still", provider: "qwen", model: "fixture-model", allowed_data: ["request", "evidence", "frames"], asset_ids: [imported.asset_id], original_locations: [{ asset_id: imported.asset_id, asset_location_id: imported.asset_location_id }], expires_at: "2027-01-01T00:00:00Z" });
  const grant = await host.prepareCreationMaterial(credential, { request_id: "large-still", operation_id: "large-material", asset_id: imported.asset_id, asset_location_id: imported.asset_location_id });
  const observation = await host.observeCreationMaterial(credential, { request_id: "large-still", expected_revision: 1, material_operation_ids: ["large-material"], include_audio: false });
  assert.equal(sends, 1);
  assert.equal(observation.value.samples.length, 1);
  const sample = observation.value.samples[0]!.sample;
  assert.equal(sample.detail.kind, "image");
  if (sample.detail.kind !== "image") throw new Error("expected image sample");
  assert.deepEqual([sample.detail.width, sample.detail.height], [591, 960]);
  const session = (host as any).session, project = session.manifest.project_id;
  assert.equal(readObjectSync(session.projectDirectory, sample.content_digest).byteLength, sample.byte_length);
  const immutable = (listAssetLocationsForAssets(session, project, [imported.asset_id]) as any[]).find(location => location.asset_location_id === grant.value.immutable_location_id);
  assert.ok(immutable);
  const source = { original_ref: immutable.location_ref, original_object_ref: immutable.asset_location_id, asset_ref: imported.asset_id, source_timescale: 30n, has_audio: false };
  const timeline = { version: 1, tracks: [{ track_id: "image-track", kind: "video", clips: [{ clip_id: "image", kind: "image", source: sourceRange(imported.asset_id, 0n, 30n, 30n), timeline_start: 0n, timeline_duration: 30n }] }] };
  const staging = resolve(root, "project", "temp", "large-proxy"); await mkdir(staging);
  const proxy = await (host as any).prepareCreationPreviewProxy(source, "image", timeline, grant.object_hash, staging, new AbortController().signal, () => {});
  assert.equal(proxy.record.original_digest, imported.asset_id.slice("asset:sha256:".length));
  assert.match(proxy.record.producer_version, /; jpeg-draft-r1$/);
  assert.deepEqual([proxy.source.proxy_width, proxy.source.proxy_height], [591, 960]);
  assert.notEqual(proxy.source.proxy_ref, proxy.source.original_ref);
  const held = await (host as any).holdCreationPreviewProxy(proxy);
  try { await held.verify(); } finally { await held.release(); }

  // The measured low-resource boundary for <=8-bit PNG is 16 MP. Use a
  // high-entropy RGBA source, real import/observation/browsing and proxy,
  // rather than treating a header or a standalone decoder as the user path.
  const png = resolve(root, "boundary.png");
  await run("python", ["-c", "from PIL import Image,ImageCms; import os,sys; im=Image.frombytes('RGBA',(4000,4000),os.urandom(64000000)); ex=Image.Exif(); ex[274]=6; icc=ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes(); im.save(sys.argv[1],exif=ex,icc_profile=icc,compress_level=1); im.close()", png]);
  const importedPng = (await host.importMedia([png]))[0] as any;
  host.beginCreationRequest(credential, { ...authorization, request_id: "boundary-png", provider: "qwen", model: "fixture-model", allowed_data: ["request", "evidence", "frames"], asset_ids: [importedPng.asset_id], original_locations: [{ asset_id: importedPng.asset_id, asset_location_id: importedPng.asset_location_id }], expires_at: "2027-01-01T00:00:00Z" });
  const pngGrant = await host.prepareCreationMaterial(credential, { request_id: "boundary-png", operation_id: "png-material", asset_id: importedPng.asset_id, asset_location_id: importedPng.asset_location_id });
  const pngObservation = await host.observeCreationMaterial(credential, { request_id: "boundary-png", expected_revision: 1, material_operation_ids: ["png-material"], include_audio: false });
  assert.equal(sends, 2);
  const pngSample = pngObservation.value.samples[0]!.sample;
  assert.equal(pngSample.detail.kind, "image");
  if (pngSample.detail.kind !== "image") throw new Error("expected image sample");
  assert.deepEqual([pngSample.detail.width, pngSample.detail.height], [960, 960]);
  const control = { signal: new AbortController().signal, assertCurrent: () => {} };
  const browse = await host.prepareMediaBrowse(1, { asset_id: importedPng.asset_id, operation_id: "boundary-browse" }, control);
  assert.equal(browse.mime_type, "image/png");
  await host.releaseMediaBrowse(1, { operation_id: "boundary-browse" });
  const pngImmutable = (listAssetLocationsForAssets(session, project, [importedPng.asset_id]) as any[]).find(location => location.asset_location_id === pngGrant.value.immutable_location_id);
  assert.ok(pngImmutable);
  const pngSource = { original_ref: pngImmutable.location_ref, original_object_ref: pngImmutable.asset_location_id, asset_ref: importedPng.asset_id, source_timescale: 30n, has_audio: false };
  const pngTimeline = { version: 1, tracks: [{ track_id: "png-track", kind: "video", clips: [{ clip_id: "png", kind: "image", source: sourceRange(importedPng.asset_id, 0n, 30n, 30n), timeline_start: 0n, timeline_duration: 30n }] }] };
  const pngStaging = resolve(root, "project", "temp", "png-proxy"); await mkdir(pngStaging);
  const pngProxy = await (host as any).prepareCreationPreviewProxy(pngSource, "image", pngTimeline, pngGrant.object_hash, pngStaging, new AbortController().signal, () => {});
  assert.equal(pngProxy.record.original_digest, importedPng.asset_id.slice("asset:sha256:".length));
  assert.deepEqual([pngProxy.source.proxy_width, pngProxy.source.proxy_height], [960, 960]);
  const pngHeld = await (host as any).holdCreationPreviewProxy(pngProxy);
  try { await pngHeld.verify(); } finally { await pngHeld.release(); }

  // A resource rejection must be explicit to the real import caller and in
  // its durable per-item state, without embedding a private path/traceback.
  const tooLarge = resolve(root, "over-limit.png");
  await run("python", ["-c", "from PIL import Image; import sys; im=Image.new('L',(4001,4000),128); im.save(sys.argv[1]); im.close()", tooLarge]);
  assert.deepEqual(await host.importMedia([tooLarge]), []);
  const failed = (host.listMediaImportBatches() as any[]).flatMap(batch => batch.items).find(item => item.display_name === "over-limit.png");
  assert.equal(failed.status, "failed");
  assert.equal(failed.error.code, "MEDIA_IMAGE_RESOURCE_EXHAUSTED");
  assert.match(failed.error.message, /低资源模式.*处理预算/);
  assert.equal(failed.error.message.includes(root), false);
  assert.equal(failed.error.message.includes("Traceback"), false);
  assert.ok((host.listJobs() as any[]).some(job => job.task_type === "media.probe.v2" && job.error_class === "MEDIA_IMAGE_RESOURCE_EXHAUSTED"), "persistent diagnostics retain the actual worker category");

  const unsupportedPng = resolve(root, "unknown-critical.png"), corruptPng = resolve(root, "corrupt-crc.png");
  await run("python", ["-c", "import io,struct,sys,zlib; from PIL import Image; b=io.BytesIO(); Image.new('RGBA',(3,3),(2,4,6,128)).save(b,format='PNG'); raw=b.getvalue(); typ=b'ABCD'; data=b'fixture'; chunk=struct.pack('>I',len(data))+typ+data+struct.pack('>I',zlib.crc32(data,zlib.crc32(typ))); open(sys.argv[1],'wb').write(raw[:33]+chunk+raw[33:]); broken=bytearray(raw); broken[-1]^=1; open(sys.argv[2],'wb').write(broken)", unsupportedPng, corruptPng]);
  assert.deepEqual(await host.importMedia([unsupportedPng, corruptPng]), []);
  const failureItems = (host.listMediaImportBatches() as any[]).flatMap(batch => batch.items);
  const unsupported = failureItems.find(item => item.display_name === "unknown-critical.png"), corrupt = failureItems.find(item => item.display_name === "corrupt-crc.png");
  assert.equal(unsupported.error.code, "MEDIA_IMAGE_PNG_UNSUPPORTED"); assert.match(unsupported.error.message, /暂不支持/);
  assert.equal(corrupt.error.code, "MEDIA_IMAGE_PNG_INVALID"); assert.match(corrupt.error.message, /完整性校验/);
  for (const item of [unsupported, corrupt]) { assert.equal(item.error.message.includes(root), false); assert.equal(item.error.message.includes("Traceback"), false); }

  // Code-shaped text in an unrelated diagnostic must not be promoted into a
  // resource exhaustion diagnosis or its user-facing explanation.
  const unrelated = resolve(root, "unrelated.png");
  await run("python", ["-c", "from PIL import Image; import sys; Image.new('RGB',(3,3),'red').save(sys.argv[1])", unrelated]);
  const port = (host as any).workerPort, originalSubmit = port.submit.bind(port);
  try {
    port.submit = (task: string, ...args: any[]) => task === "media.probe.v2" ? Promise.resolve({ status: "failed", outputs: [], diagnostics: [{ code: "OTHER", message: "MEDIA_IMAGE_RESOURCE_EXHAUSTED: untrusted text" }] }) : originalSubmit(task, ...args);
    assert.deepEqual(await host.importMedia([unrelated]), []);
  } finally { port.submit = originalSubmit; }
  const unrelatedItem = (host.listMediaImportBatches() as any[]).flatMap(batch => batch.items).find(item => item.display_name === "unrelated.png");
  assert.equal(unrelatedItem.error.code, "OTHER");
  assert.doesNotMatch(unrelatedItem.error.message, /低资源模式.*处理预算/);
  const spoofed = resolve(root, "spoofed.png");
  await run("python", ["-c", "from PIL import Image; import sys; Image.new('RGB',(3,3),'blue').save(sys.argv[1])", spoofed]);
  const coordinator = (host as any).mediaImports, originalInspect = coordinator.ports.inspect;
  try {
    coordinator.ports.inspect = async () => { throw Object.assign(new Error("MEDIA_IMAGE_RESOURCE_EXHAUSTED: untrusted local text"), { code: "MEDIA_IMAGE_RESOURCE_EXHAUSTED" }); };
    assert.deepEqual(await host.importMedia([spoofed]), []);
  } finally { coordinator.ports.inspect = originalInspect; }
  const spoofedItem = (host.listMediaImportBatches() as any[]).flatMap(batch => batch.items).find(item => item.display_name === "spoofed.png");
  assert.equal(spoofedItem.error.code, "MEDIA_IMPORT_FILE_FAILED");
  assert.doesNotMatch(spoofedItem.error.message, /低资源模式.*处理预算/);
} finally {
  await host.close();
  await rm(root, { recursive: true, force: true });
}
console.log("large JPEG and bounded PNG isolated Host import, authorized observation, browse and proxy binding passed");
