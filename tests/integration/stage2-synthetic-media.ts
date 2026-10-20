import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";

const run = promisify(execFile);

/** Create a small, decodable audio/video fixture for Host tests that probe media. */
export async function writeSyntheticEvidenceVideo(path: string, durationSeconds: number): Promise<Buffer> {
  await run("ffmpeg", [
    "-y", "-v", "error",
    "-f", "lavfi", "-i", `color=c=blue:s=64x64:r=10:d=${durationSeconds}`,
    "-f", "lavfi", "-i", `sine=frequency=440:sample_rate=48000:duration=${durationSeconds}`,
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest",
    "-map_metadata", "-1", path,
  ]);
  return readFile(path);
}
