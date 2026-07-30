import { mkdir } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
const run = promisify(execFile); const root = resolve(import.meta.dirname, "../.."); const dir = resolve(root, "tests/fixtures/generated"); const output = resolve(dir, "p0-synthetic.mp4"); await mkdir(dir, { recursive: true }); await run("ffmpeg", ["-y", "-f", "lavfi", "-i", "testsrc=size=320x180:rate=30", "-f", "lavfi", "-i", "sine=frequency=1000:sample_rate=48000", "-t", "1", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", output]); console.log(output);
