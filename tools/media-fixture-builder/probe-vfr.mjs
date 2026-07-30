import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
const run = promisify(execFile); const file = resolve(import.meta.dirname, "../../tests/fixtures/generated/p0-vfr.mp4"); const { stdout } = await run("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=avg_frame_rate,r_frame_rate,nb_frames", "-of", "json", file]); const stream = JSON.parse(stdout).streams[0]; if (!stream || !stream.nb_frames || stream.avg_frame_rate === stream.r_frame_rate) throw new Error(`fixture is not demonstrably VFR: ${JSON.stringify(stream)}`); console.log(`VFR probe passed (avg=${stream.avg_frame_rate}, r=${stream.r_frame_rate}, frames=${stream.nb_frames})`);
