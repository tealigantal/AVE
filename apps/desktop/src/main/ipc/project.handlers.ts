import type { CommandHandler, DesktopContext, QueryHandler } from "../types.js";

export function registerProjectHandlers(queries: Map<string, QueryHandler>, commands: Map<string, CommandHandler>, context: DesktopContext): void {
  queries.set("app.status", () => context.host.status());
  queries.set("project.timeline.current", () => context.host.readTimelineSnapshot());
  queries.set("project.timeline.diff", () => context.host.readTimelineDiff());
  queries.set("project.media.list", () => context.host.listMedia());
  queries.set("project.story.list", () => context.host.listStoryPlans());
  queries.set("project.review.list", () => context.host.listReviewArtifacts());
  queries.set("project.delivery.list", () => context.host.listDeliveryRecords());
  queries.set("project.export.list", () => context.host.listExports());
  queries.set("project.model.runs", () => context.host.listModelRuns());
  queries.set("project.render.latest", () => context.host.latestRender());
  queries.set("project.render.results", () => context.host.listRenderResults());
  queries.set("project.preview.latest", () => context.host.readLatestPreview());
  commands.set("project.create", async () => {
    const selection = await context.dialog.showOpenDialog({ properties: ["openDirectory", "createDirectory"] });
    if (selection.canceled || !selection.filePaths[0]) throw new Error("没有选择项目目录");
    return context.host.create(selection.filePaths[0]);
  });
  commands.set("project.open", async () => {
    const selection = await context.dialog.showOpenDialog({ properties: ["openDirectory", "createDirectory"] });
    if (selection.canceled || !selection.filePaths[0]) throw new Error("没有选择项目");
    return context.host.open(selection.filePaths[0]);
  });
  commands.set("project.close", async () => { await context.host.close(); return context.host.status(); });
  commands.set("project.story.propose", (request) => context.host.proposeStory((request.payload ?? {}) as Record<string, unknown>));
  commands.set("project.timeline.export", (request) => context.host.exportTimeline((request.payload as { format?: "otio" | "fcpxml" | "edl" | "web-preview" } | undefined)?.format ?? "web-preview"));
}
