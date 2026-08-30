import type { CommandHandler, DesktopContext, QueryHandler } from "../types.js";
import { confirmStage2ActionForEvent, confirmStage2GenerationForEvent, showOpenDialogForEvent } from "./dialog.js";
import { safeMediaRows } from "./project-media-projection.js";
import { afterStage2HumanConfirmation } from "./stage2-confirmation.js";
import { createCanonicalStage2Project, openCanonicalStage2Project } from "../project-lifecycle.js";

function assertNoPayload(value: unknown, label: string): void { if (value !== undefined && (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value as object).length !== 0)) throw new Error(`${label}_PAYLOAD_INVALID`); }
function exactIntentId(value: unknown): string { if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value as object).sort().join(",") !== "intent_id" || typeof (value as any).intent_id !== "string" || !(value as any).intent_id.trim()) throw new Error("PRODUCT_FEEDBACK_PREVIEW_PAYLOAD_INVALID"); return (value as any).intent_id; }
function exactWorkspaceDigest(value: unknown): string { if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value as object).sort().join(",") !== "workspace_digest" || typeof (value as any).workspace_digest !== "string" || !/^[a-f0-9]{64}$/.test((value as any).workspace_digest)) throw new Error("PRODUCT_PREVIEW_PAYLOAD_INVALID"); return (value as any).workspace_digest; }
export function registerProjectHandlers(queries: Map<string, QueryHandler>, commands: Map<string, CommandHandler>, context: DesktopContext): void {
  queries.set("app.status", () => context.host.status());
  queries.set("project.timeline.current", () => context.host.readTimelineSnapshot());
  queries.set("project.timeline.diff", () => context.host.readTimelineDiff());
  queries.set("project.media.list", () => safeMediaRows(context.host.listMedia()));
  queries.set("project.stage2.workspace", (request) => { assertNoPayload(request.payload, "PRODUCT_WORKSPACE"); return context.host.readStage2Workspace(); });
  queries.set("project.stage2.preview.current", (request) => context.host.readCurrentStage2Preview(exactWorkspaceDigest(request.payload)));
  queries.set("project.stage2.feedback.preview", (request) => context.host.previewFeedbackRevision(exactIntentId(request.payload)));
  commands.set("project.create", async (_request, event) => {
    const selection = await showOpenDialogForEvent(context, event, { properties: ["openDirectory", "createDirectory"] });
    if (selection.canceled || !selection.filePaths[0]) throw new Error("没有选择项目目录");
    return createCanonicalStage2Project(context.host, selection.filePaths[0]);
  });
  commands.set("project.open", async (_request, event) => {
    const selection = await showOpenDialogForEvent(context, event, { properties: ["openDirectory", "createDirectory"] });
    if (selection.canceled || !selection.filePaths[0]) throw new Error("没有选择项目");
    return openCanonicalStage2Project(context.host, selection.filePaths[0]);
  });
  commands.set("project.close", async () => { await context.host.close(); return context.host.status(); });
  commands.set("project.stage2.contract.create", (request) => context.host.createStage2ProductContractDraft(request.payload as any));
  commands.set("project.stage2.action", (request, event) => afterStage2HumanConfirmation(() => confirmStage2ActionForEvent(context, event, request.payload), (confirmedExecutionReview) => context.host.performStage2ProductAction(context.stage2ReviewCredential, request.payload as any, confirmedExecutionReview)));
  commands.set("project.stage2.generate", (request, event) => afterStage2HumanConfirmation(() => confirmStage2GenerationForEvent(context, event, request.payload), (confirmedGenerationReview) => context.host.performStage2ProductGeneration(context.stage2ReviewCredential, request.payload as any, confirmedGenerationReview)));
  commands.set("project.stage2.execution.render", (request) => context.host.renderStage2ProductExecution(request.payload as any));
  commands.set("project.stage2.feedback.create", (request) => context.host.createFeedbackRevision((request.payload ?? {}) as any));
}
