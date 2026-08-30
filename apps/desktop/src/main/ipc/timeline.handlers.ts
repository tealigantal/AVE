import type { TimelineCommand } from "../../../../../packages/core/timeline-core/src/public.js";
import type { CommandHandler } from "../types.js";

export function registerTimelineHandlers(commands: Map<string, CommandHandler>, host: { applyTimelineCommand(command: TimelineCommand, baseVersion: number): unknown }): void {
  commands.set("project.timeline.command", (request) => {
    const payload = request.payload as { command?: TimelineCommand; base_version?: number } | undefined, command = payload?.command;
    if (!command || !["add_clip", "move_clip", "trim_source"].includes(command.type) || !("track_id" in command) || command.track_id !== "video-reference") throw new Error("PRODUCT_REFERENCE_TIMELINE_COMMAND_UNSUPPORTED");
    return host.applyTimelineCommand(command, payload?.base_version as number);
  });
}
