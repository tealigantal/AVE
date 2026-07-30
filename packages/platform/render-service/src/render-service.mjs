import { mkdir, readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { dirname, resolve } from "node:path";
const run = promisify(execFile);

export async function renderPreviewMaster(original, outputDirectory) {
  await mkdir(outputDirectory, { recursive: true });
  const proxy = resolve(outputDirectory, "proxy.mp4"); const preview = resolve(outputDirectory, "preview.mp4"); const master = resolve(outputDirectory, "master.mp4");
  await run("ffmpeg", ["-y", "-i", original, "-vf", "scale=160:-2", "-c:v", "libx264", "-c:a", "aac", proxy]);
  await run("ffmpeg", ["-y", "-i", proxy, "-c", "copy", preview]);
  if (master.toLowerCase().includes("proxy")) throw new Error("master path must not use proxy");
  await run("ffmpeg", ["-y", "-i", original, "-c", "copy", master]);
  await run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", preview]);
  await run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", master]);
  await writeFile(resolve(outputDirectory, "proxy-map.json"), JSON.stringify({ schema_version: 1, original, proxy, original_timescale: 30, proxy_timescale: 30, segments: [{ original_start_pts: 0, proxy_start_pts: 0, duration_pts: 30 }] }, null, 2) + "\n");
  return { proxy, preview, master, proxy_map: resolve(outputDirectory, "proxy-map.json") };
}

export async function qcMaster(master) {
  const issues = [];
  try { const { stdout } = await run("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", master]); const data = JSON.parse(stdout); if (!data.streams.some((stream) => stream.codec_type === "video")) issues.push({ code: "DECODE_FAILED", severity: "error", message: "no video stream" }); if (!data.streams.some((stream) => stream.codec_type === "audio")) issues.push({ code: "DECODE_FAILED", severity: "error", message: "no audio stream" }); } catch (error) { issues.push({ code: "DECODE_FAILED", severity: "error", message: String(error) }); }
  if (master.toLowerCase().includes("proxy")) issues.push({ code: "PROXY_USAGE", severity: "error", message: "master path contains proxy" });
  const report = { schema_version: 1, render_id: "master", status: issues.some((issue) => issue.severity === "error") ? "blocked" : "passed", issues };
  await mkdir(dirname(master), { recursive: true }); await writeFile(resolve(dirname(master), "master-qc.json"), JSON.stringify(report, null, 2) + "\n");
  return report;
}
