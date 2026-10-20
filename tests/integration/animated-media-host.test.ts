import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFile as execFileCallback } from "node:child_process";
import { copyFile, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { sourceRange } from "../../packages/core/media-identity/src/public.js";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";

const run = promisify(execFileCallback), root = await mkdtemp(resolve(tmpdir(), "ave-animated-media-host-")), project = resolve(root, "project");
const python = process.env.AVE_PYTHON ?? "python", ffmpeg = process.env.AVE_FFMPEG ?? "ffmpeg";
let host = new ProjectHostSession();
try {
  const gif = resolve(root, "immutable-gif"), webp = resolve(root, "immutable-webp"), background = resolve(root, "background.mkv");
  const generate = "from PIL import Image; import sys; kind,out=sys.argv[1:]; colors=[(255,0,0,255),(0,255,0,96),(0,0,255,0)];\nif kind=='gif':\n fs=[]\n for i in range(3):\n  im=Image.new('P',(16,16),0); im.putpalette([0,0,0,255,0,0,0,255,0,0,0,255]+[0]*756)\n  for y in range(2,14):\n   for x in range(2,14): im.putpixel((x,y),i+1)\n  fs.append(im)\n fs[0].save(out,save_all=True,append_images=fs[1:],duration=[70,130,210],loop=0,transparency=0,disposal=2)\nelse:\n fs=[Image.new('RGBA',(16,16),c) for c in colors]; fs[0].save(out,save_all=True,append_images=fs[1:],duration=[70,130,210],loop=0,lossless=True)";
  const namedGif = resolve(root, "source.gif"), namedWebp = resolve(root, "source.webp");
  await run(python, ["-c", generate, "gif", namedGif]); await run(python, ["-c", generate, "webp", namedWebp]);
  await copyFile(namedGif, gif); await copyFile(namedWebp, webp);
  await run(ffmpeg, ["-v", "error", "-f", "lavfi", "-i", "color=c=blue:s=64x64:r=10:d=1.23", "-c:v", "ffv1", "-pix_fmt", "yuv420p", "-time_base", "1/1000", "-y", background]);
  await host.create(project);
  const [gifAsset, webpAsset, backgroundAsset] = await host.importMedia([gif, webp, background]) as any[];
  for (const [asset, expectedFormat] of [[gifAsset, "GIF"], [webpAsset, "WEBP"]] as const) {
    assert.equal(asset.probe.animated_image.format, expectedFormat);
    assert.deepEqual(asset.probe.animated_image.frame_durations_ms, [70, 130, 210]);
    assert.equal(asset.probe.animated_image.duration_ms, 410);
    assert.equal(asset.probe.animated_image.alpha, true);
    const analysis = await host.readMediaAnalysis(asset.asset_id);
    assert.ok(analysis.thumbnail, `${expectedFormat} produced a real source-bound preview frame`);
    assert.equal(createHash("sha256").update(await readFile(asset.location_ref)).digest("hex"), asset.asset_id.slice("asset:sha256:".length));
  }
  const originalHashes = [gifAsset, webpAsset].map(async asset => createHash("sha256").update(await readFile(asset.location_ref)).digest("hex"));
  assert.deepEqual(await Promise.all(originalHashes), [gifAsset, webpAsset].map(asset => asset.asset_id.slice("asset:sha256:".length)));
  host.initializeTimeline([
    { track_id: "background", kind: "video", z_index: 0, clips: [] },
    { track_id: "animated", kind: "video", z_index: 1, clips: [] },
  ], { sequence_id: "main", timebase: { value: 1n, timescale: 1000n }, tracks: [] });
  const addBackground = { type: "add_clip" as const, track_id: "background", clip: { clip_id: "blue-background", source: sourceRange(backgroundAsset.asset_id, 0n, 1230n, 1000n), timeline_start: 0n, timeline_duration: 820n } };
  const addAnimation = (asset: any) => ({ type: "add_clip" as const, track_id: "animated", clip: { clip_id: "animated-source", source: sourceRange(asset.asset_id, 0n, 410n, 1000n), timeline_start: 0n, timeline_duration: 820n } });
  host.applyTimelineCommands([addBackground, addAnimation(gifAsset)], 0);
  const sourceRefs = [backgroundAsset, gifAsset, webpAsset].map(asset => ({ asset_ref: asset.asset_id, original_ref: asset.location_ref, source_timescale: 1000n, has_audio: false }));
  const render = async (name: string) => host.renderTimeline({ sources: sourceRefs, outputDirectory: resolve(project, "renders", name), profile: { name, width: 64, height: 64, fps: 100 } });
  const gifRender = await render("gif");
  assert.equal(gifRender.status.qc, "passed");
  const gifMaster = (gifRender.master as any).outputs.find((output: any) => output.kind === "render").path as string;
  const pixel = async (path: string, at: string, x: number, y: number) => {
    const { stdout } = await run(ffmpeg, ["-v", "error", "-i", path, "-ss", at, "-vf", `crop=2:2:${x}:${y}`, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "pipe:1"]);
    return [...Buffer.from(stdout, "binary").subarray(0, 3)];
  };
  const red = await pixel(gifMaster, "0", 32, 32), green = await pixel(gifMaster, "0.07", 32, 32), alphaComposite = await pixel(gifMaster, "0.2", 0, 0), repeated = await pixel(gifMaster, "0.41", 32, 32);
  assert.ok(red[0]! > red[1]! && red[0]! > red[2]!, JSON.stringify(red));
  assert.ok(green[1]! > green[0]! && green[1]! > green[2]!, JSON.stringify(green));
  assert.ok(alphaComposite[2]! > alphaComposite[0]! && alphaComposite[2]! > alphaComposite[1]!, JSON.stringify(alphaComposite));
  assert.ok(repeated[0]! > repeated[1]! && repeated[0]! > repeated[2]!, JSON.stringify(repeated));
  host.applyTimelineCommand({ type: "remove_clip", track_id: "animated", clip_id: "animated-source" }, 1);
  host.applyTimelineCommand(addAnimation(webpAsset), 2);
  const webpRender = await render("webp");
  assert.equal(webpRender.status.qc, "passed");
  const webpMaster = (webpRender.master as any).outputs.find((output: any) => output.kind === "render").path as string;
  const translucent = await pixel(webpMaster, "0.07", 32, 32);
  assert.ok(translucent[1]! > translucent[0]! && translucent[2]! > translucent[1]!, JSON.stringify(translucent));
  assert.equal(createHash("sha256").update(await readFile(gifAsset.location_ref)).digest("hex"), gifAsset.asset_id.slice("asset:sha256:".length));
  await host.close(); host = new ProjectHostSession(); await host.open(project);
  assert.equal((host.readTimelineSnapshot() as any).version, 3);
  const reopened = await render("reopened-webp");
  assert.equal(reopened.status.qc, "passed");
  console.log("Animated GIF/WebP Host import by extensionless bytes, frame preview, timeline loop, alpha composite, Preview/Master render, original SHA256 and reopen passed");
} finally { await host.close(); await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); }
