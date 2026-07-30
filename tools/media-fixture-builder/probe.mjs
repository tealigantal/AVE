import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
const run = promisify(execFile); const file = resolve(import.meta.dirname, "../../tests/fixtures/generated/p0-synthetic.mp4"); const { stdout } = await run("ffprobe", ["-v", "error", "-print_format", "json", "-show_streams", "-show_format", file]); const data = JSON.parse(stdout); const video = data.streams.find((stream) => stream.codec_type === "video"); if (!video || video.codec_name !== "h264") throw new Error("synthetic video probe failed"); if (!data.streams.some((stream) => stream.codec_type === "audio")) throw new Error("synthetic audio probe failed"); console.log(`media probe check passed (${video.codec_name}, ${video.width}x${video.height})`);
