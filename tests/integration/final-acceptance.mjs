import assert from "node:assert/strict";
import { access, stat } from "node:fs/promises";
import { delimiter, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);
const repo = resolve(import.meta.dirname, "../..");
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const syntheticCommands = [
  "p0:acceptance",
  "worker:qc:test",
  "job-persistence:test",
  "worker:crash-recovery:test",
  "project-recovery:test",
  "timeline-render:test",
  "timeline:audio-caption:test",
  "adapter:roundtrip:test",
];

async function runScript(script) {
  await run(pnpm, ["run", script], { cwd: repo, shell: process.platform === "win32", maxBuffer: 1024 * 1024 * 16 });
}

async function inspectMedia(filePath) {
  const { stdout } = await run("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", filePath], { maxBuffer: 1024 * 1024 * 8 });
  const probe = JSON.parse(stdout);
  const streams = Array.isArray(probe.streams) ? probe.streams : [];
  const video = streams.find((stream) => stream.codec_type === "video");
  assert.ok(video, `真实素材缺少视频流: ${filePath}`);
  return { path: filePath, frameRate: String(video.r_frame_rate ?? video.avg_frame_rate ?? "unknown"), hasAudio: streams.some((stream) => stream.codec_type === "audio") };
}

async function requireRealInputs() {
  const rawPaths = process.env.AVE_REAL_MEDIA_PATHS ?? "";
  const subtitlePath = process.env.AVE_REAL_SUBTITLE_PATH ?? "";
  const paths = rawPaths.split(delimiter).map((value) => value.trim()).filter(Boolean);
  if (paths.length < 2) throw new Error("BLOCKED: AVE_REAL_MEDIA_PATHS must contain at least two real media files");
  if (!subtitlePath) throw new Error("BLOCKED: AVE_REAL_SUBTITLE_PATH must point to a real subtitle fixture");
  const media = [];
  for (const filePath of paths) {
    await access(filePath);
    const file = await stat(filePath);
    if (!file.isFile()) throw new Error(`BLOCKED: media path is not a file: ${filePath}`);
    media.push(await inspectMedia(filePath));
  }
  await access(subtitlePath);
  const subtitle = await stat(subtitlePath);
  if (!subtitle.isFile() || subtitle.size === 0) throw new Error("BLOCKED: subtitle fixture is empty");
  assert.ok(media.some((item) => item.hasAudio), "BLOCKED: real media set has no audio stream");
  assert.ok(new Set(media.map((item) => item.frameRate)).size >= 2, "BLOCKED: real media set must contain at least two frame rates");
  return { media, subtitlePath };
}

const syntheticOnly = process.argv.includes("--synthetic-only");
if (!syntheticOnly) {
  try {
    const inputs = await requireRealInputs();
    console.log(`real media preflight passed (${inputs.media.length} files, subtitle=${inputs.subtitlePath})`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
}
}

if (process.exitCode !== 2) {
  for (const script of syntheticCommands) await runScript(script);
  if (!syntheticOnly) await runScript("acceptance:real");
  console.log(syntheticOnly ? "final acceptance synthetic slice passed; real media was not claimed" : "final acceptance preflight, real media Host flow, and synthetic regression passed");
}
