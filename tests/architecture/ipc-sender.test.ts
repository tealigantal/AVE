import { strict as assert } from "node:assert";
import { validateRendererUrl } from "../../apps/desktop/src/main/validate-sender.js";
import { registerTimelineHandlers } from "../../apps/desktop/src/main/ipc/timeline.handlers.js";

assert.doesNotThrow(() => validateRendererUrl("app://renderer/index.html"));
for (const url of ["file:///index.html", "app://evil/index.html", "app://renderer.evil/index.html", "https://renderer/index.html"]) assert.throws(() => validateRendererUrl(url), /untrusted/);
const commands = new Map<string, any>(); const accepted: any[] = [];
registerTimelineHandlers(commands, { applyTimelineCommand(command, baseVersion) { accepted.push({ command, baseVersion }); return null; } });
const timelineCommand = commands.get("project.timeline.command"); assert.ok(timelineCommand);
timelineCommand({ payload: { command: { type: "move_clip", track_id: "video-reference", clip_id: "clip-a", timeline_start: 1n }, base_version: 2 } });
assert.equal(accepted.length, 1);
for (const command of [{ type: "add_track", track: { track_id: "evil", kind: "video", clips: [] } }, { type: "add_clip", track_id: "video-main", clip: {} }, { type: "set_track_properties", track_id: "video-reference", properties: { enabled: true } }]) assert.throws(() => timelineCommand({ payload: { command, base_version: 2 } }), /PRODUCT_REFERENCE_TIMELINE_COMMAND_UNSUPPORTED/);
assert.equal(commands.has("project.timeline.undo"), false); assert.equal(commands.has("project.timeline.redo"), false); assert.equal(accepted.length, 1);
console.log("IPC sender validation check passed");
