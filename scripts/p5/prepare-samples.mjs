import { tmpdir } from 'node:os';
import {readVerifiedProbeMetadata,decodeSceneEvidence} from '/opt/ave/app/packages/platform/project-host/src/media-evidence.js';
// Offline helper executed inside the exact desktop image; it never opens a project database.
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { createLocalWorkerJobPort } from '/opt/ave/app/packages/platform/worker-client/src/runtime.mjs';
import { creationMediaFacts, creationTemporalFrameIndices } from '/opt/ave/app/packages/platform/project-host/src/stage3-creative.js';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const [manifestPath, inputRoot, outputRoot, expectedManifestHash] = process.argv.slice(2);
if (!manifestPath || !inputRoot || !outputRoot || !/^[a-f0-9]{64}$/.test(expectedManifestHash ?? '')) throw Error('P5_SAMPLE_ARGUMENTS_REQUIRED');
const manifestBytes = await readFile(manifestPath);
if (hash(manifestBytes) !== expectedManifestHash) throw Error('P5_INPUT_MANIFEST_CHANGED');
const manifest = JSON.parse(manifestBytes);
const worker = createLocalWorkerJobPort({ command: '/opt/ave-python/bin/python' });
const entries = [];
const staging=await mkdtemp(join(tmpdir(),"ave-prepared-v2-"));
const control={assertCurrent(){}};
async function submit(task, input) {
  const result = await worker.submit(task, input, { idempotent: false });
  if (result.status !== 'succeeded') throw Error(`P5_SAMPLE_WORKER_FAILED: ${JSON.stringify(result.diagnostics)}`);
  return result.outputs;
}
try {
  for (const input of manifest.inputs) {
    if (basename(input.file) !== input.file) throw Error('P5_UNSAFE_INPUT_NAME');
    const path = join(inputRoot, input.file), bytes = await readFile(path);
    if (bytes.length !== input.bytes || hash(bytes) !== input.sha256) throw Error('P5_SOURCE_IDENTITY_CHANGED');
    const probeOutputs = await submit('media.probe.v2', {schema_version:2,task_type:'media.probe.v2',input_path:path,source_digest:input.sha256,output_dir:staging,timeout_seconds:180});
    const verified=await readVerifiedProbeMetadata(probeOutputs[0],staging,input.sha256,control);
    const {timing_summary,...metadata}=verified.metadata;const probe={...metadata,timing:timing_summary};
    const facts = creationMediaFacts(probe);
    const requests = [];
    let stream;
    if (facts.video) {
      stream = facts.video.index;
      const receipt = (await submit('media.scene_scan.v2', { schema_version: 2, task_type: 'media.scene_scan.v2', output_dir:staging, input_path: path, source_digest: input.sha256, stream_index: stream, threshold: 12, timeout_seconds: 180 }))[0];
      const scan=await decodeSceneEvidence(receipt,staging,{source_digest:input.sha256,stream_index:stream,time_base:{numerator:Number(facts.video.numerator),denominator:Number(facts.video.denominator)},threshold:12,ffmpeg_version:receipt.receipt.header.ffmpeg_version},control);
      const time = pts => ({ schema_version: 1, value: pts * scan.time_base.numerator, timescale: scan.time_base.denominator });
      for (const range of scan.spans) for (const index of creationTemporalFrameIndices(scan, range, facts)) {
        requests.push({ sample_id: `frame-${range.span_index}-${index}`, kind: 'frame', start: time(scan.frames[index].pts), end: time(scan.frames[index].end_pts) });
      }
    } else if (facts.image) {
      stream = facts.image.index;
      requests.push({ sample_id: 'image', kind: 'image', start: { schema_version: 1, value: 0, timescale: 1 }, end: { schema_version: 1, value: 0, timescale: 1 } });
    } else continue;
    const directory = join(outputRoot, input.file.replace(/\.[^.]+$/, ''));
    await mkdir(directory);
    const samples = await submit('media.sample.v1', { schema_version: 1, task_type: 'media.sample.v1', input_path: path, source_digest: input.sha256, stream_index: stream, samples: requests, output_dir: directory, max_frame_edge: 768, timeout_seconds: 180 });
    if (samples.length !== requests.length) throw Error('P5_SAMPLE_BATCH_INCOMPLETE');
    for (const sample of samples) {
      const bytes = await readFile(sample.path);
      if (bytes.length !== sample.byte_length || hash(bytes) !== sample.content_digest || sample.source_digest !== input.sha256) throw Error('P5_SAMPLE_BYTES_CHANGED');
      entries.push({ input: input.file, source_digest: input.sha256, content_digest: sample.content_digest, bytes: sample.byte_length, actual_start: sample.actual_start, actual_end: sample.actual_end, requested_start: sample.requested_start, requested_end: sample.requested_end, detail: sample.detail, file: `${input.file.replace(/\.[^.]+$/, '')}/${basename(sample.path)}` });
    }
  }
  await writeFile(join(outputRoot, 'receipt.json'), JSON.stringify({ schema_version: 1, inputs_manifest_sha256: expectedManifestHash, scene_threshold: 12, max_frame_edge: 768, prepared_at: new Date().toISOString(), entries }, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ samples: entries.length, source_hashes: [...new Set(entries.map(entry => entry.source_digest))] }));
} finally { await worker.close(); await rm(staging,{recursive:true}); }
