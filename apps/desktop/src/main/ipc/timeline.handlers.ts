import type { TimelineCommand, Track } from "../../../../../packages/core/timeline-core/src/public.js";
import type { CommandHandler } from "../types.js";

export function registerTimelineHandlers(commands: Map<string, CommandHandler>, host: { initializeTimeline(tracks: readonly Track[]): unknown; applyTimelineCommand(command: TimelineCommand, baseVersion: number): unknown; undoTimeline(): unknown; redoTimeline(): unknown }): void {
  commands.set("project.timeline.initialize", (request) => host.initializeTimeline((request.payload as { tracks?: readonly Track[] } | undefined)?.tracks ?? []));
  commands.set("project.timeline.command", (request) => { const payload = request.payload as { command?: TimelineCommand; base_version?: number } | undefined; return host.applyTimelineCommand(payload?.command as TimelineCommand, payload?.base_version as number); });
  commands.set("project.timeline.undo", () => host.undoTimeline());
  commands.set("project.timeline.redo", () => host.redoTimeline());
}
