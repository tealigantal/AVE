import { strict as assert } from "node:assert";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { ProjectHostSession } from "../../apps/desktop/src/project-host.js";
const root = await mkdtemp(resolve(tmpdir(), "ai-vlog-export-host-")); const file = resolve(root, "export.mp4");
try { const host = new ProjectHostSession(); await host.create(root); await writeFile(file, "real-export"); host.registerDelivery({ schema_version: 1, delivery_id: "d-1", timeline_version: 1, master_render_id: "m-1", gates: { qc: "passed", privacy: "not_required", rights: "passed", original_link: "verified" }, status: "blocked" }); const row = await host.registerExportFile("d-1", "qc-1", "export-1", file) as { export_id: string }; assert.equal(row.export_id, "export-1"); host.validateExportProfile("social_1080p", { container: "mp4", video_codec: "h264", audio_codec: "aac", width: 1920, height: 1080, fps: 30, audio_sample_rate: 48000 }); assert.throws(() => host.validateExportProfile("social_1080p", { container: "mp4", video_codec: "h264", audio_codec: "aac", width: 3840, height: 2160, fps: 30, audio_sample_rate: 48000 }), /dimensions/); await host.close(); } finally { if (typeof global.gc === "function") global.gc(); await new Promise((resolve) => setTimeout(resolve, 50)); await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); }
console.log("export host check passed");
