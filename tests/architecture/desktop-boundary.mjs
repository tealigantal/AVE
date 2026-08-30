import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

process.on("beforeExit", () => {
  if (!handlers.includes("project.stage2.generate") || !handlers.includes("confirmedGenerationReview") || !confirmation.includes("parseStage2ProductGenerationInput(raw)") || !confirmation.includes("prepareStage2ProductGenerationReview(input)") || confirmation.indexOf("prepareStage2ProductGenerationReview(input)") > confirmation.lastIndexOf("showMessageBox(options)")) throw new Error("Stage 2 generation must remain a Main-owned exact human-confirmation path");
});

const root = resolve(import.meta.dirname, "../..");
const read = (path) => readFile(resolve(root, path), "utf8");
const preload = await read("apps/desktop/src/preload.ts");
const preloadRuntime = await read("apps/desktop/src/preload-runtime.cjs");
const main = await read("apps/desktop/src/main/main.ts");
const bootstrap = await read("apps/desktop/src/main/bootstrap.ts");
const composition = await read("apps/desktop/src/main/composition-root.ts");
const register = await read("apps/desktop/src/main/ipc/register-ipc.ts");
const handlers = await read("apps/desktop/src/main/ipc/project.handlers.ts");
const mediaHandlers = await read("apps/desktop/src/main/ipc/media.handlers.ts");
const stage2Timeline = await read("apps/desktop/src/main/stage2-timeline.ts");
const projectLifecycle = await read("apps/desktop/src/main/project-lifecycle.ts");
const dialogs = await read("apps/desktop/src/main/ipc/dialog.ts");
const confirmation = await read("apps/desktop/src/main/ipc/stage2-confirmation.ts");
const renderer = await read("apps/desktop/src/renderer/workbench/workbench.js");
const sender = await read("apps/desktop/src/main/validate-sender.ts");
const window = await read("apps/desktop/src/main/window-manager.ts");

for (const forbidden of ["project.sqlite", "ffmpeg", "child_process", "nodeIntegration: true"]) if (preload.includes(forbidden) || main.includes(forbidden) || bootstrap.includes(forbidden)) throw new Error(`desktop boundary violation: ${forbidden}`);
if (!window.includes("contextIsolation: true") || !window.includes("sandbox: true") || !sender.includes("app://renderer") || sender.includes("file://")) throw new Error("desktop security boundary missing");
if (!main.includes("bootstrap") || !bootstrap.includes("registerAppProtocol")) throw new Error("desktop bootstrap boundary missing");
const actionConfirmationStart = confirmation.indexOf("export async function confirmStage2ActionWithDialog"), actionConfirmationDialog = confirmation.indexOf("showMessageBox(options)", actionConfirmationStart);
if (!composition.includes("stage2ReviewCredential") || !handlers.includes("context.stage2ReviewCredential") || !handlers.includes("afterStage2HumanConfirmation") || !handlers.includes("confirmedExecutionReview") || !dialogs.includes("showMessageBox") || !confirmation.includes("defaultId: 0") || !confirmation.includes("prepareStage2ProductActionReview(input)") || confirmation.indexOf("prepareStage2ProductActionReview(input)") > actionConfirmationDialog || !confirmation.includes("const confirmed = await confirm()") || !confirmation.includes("return perform(confirmed)") || preload.includes("stage2ReviewCredential") || preloadRuntime.includes("stage2ReviewCredential") || renderer.includes("stage2ReviewCredential") || renderer.includes("window.confirm")) throw new Error("Stage 2 human review must remain an explicit main-process-owned confirmation bound to the prepared review");
if (!handlers.includes("project.stage2.feedback.create") || !dialogs.includes("confirmStage2FeedbackWithDialog") || !confirmation.includes("FEEDBACK_TRIM_TIMEBASE_NOT_EXACT:native-confirmation") || !confirmation.includes("精确源 PTS 裁剪")) throw new Error("Stage 2 feedback must remain a Main-owned exact RationalTime confirmation path");
if (!confirmation.includes("parseStage2ProductActionInput(raw)") || !confirmation.includes("stage2ProductActionTargetId(input)") || confirmation.includes("selected_id ?? input.intent_id")) throw new Error("Stage 2 native dialog and Host must share exact action target parsing");
const duplicateStoryGuard = confirmation.indexOf("assertStage2PreConfirmationAvailable(action, workspace)");
if (duplicateStoryGuard < 0 || duplicateStoryGuard > actionConfirmationDialog) throw new Error("duplicate Story approval must close before native confirmation");
if (!handlers.includes("project.stage2.contract.create") || !handlers.includes("project.stage2.execution.render") || !handlers.includes("createCanonicalStage2Project") || !handlers.includes("openCanonicalStage2Project") || !stage2Timeline.includes("video-reference") || !stage2Timeline.includes("video-main")) throw new Error("Stage 2 Contract render and canonical Timeline topology must remain Main-owned");
if (!projectLifecycle.includes("deferJobRecovery: true") || projectLifecycle.indexOf("ensureCanonicalStage2Timeline") > projectLifecycle.lastIndexOf("recoverOpenJobs()") || !projectLifecycle.includes("await host.close()")) throw new Error("desktop open must reject unsupported topology before Job recovery and close the failed session");
const desktopRoutes = `${register}\n${handlers}\n${mediaHandlers}`;
for (const removed of ["project.render", "project.preview.latest", "project.review.list", "project.delivery.list", "project.export.list", "project.model.runs", "project.render.latest", "project.render.results", "project.qc.issues", "project.assembly.v2", "project.rough-cut.apply", "project.review.compare", "project.delivery.manifest"]) if (desktopRoutes.includes(removed)) throw new Error(`legacy desktop route remains: ${removed}`);
const lifecycle = await read("apps/desktop/src/main/app-lifecycle.ts");
const electronHarness = await read("tests/integration/electron-stage2-harness.ts");
for (const productionSource of [lifecycle, dialogs, confirmation]) if (/AVE_ELECTRON_|AVE_OPEN_PROJECT|automatedFeedback|harnessMode/.test(productionSource)) throw new Error("production desktop lifecycle and confirmation must contain no test or automation hook");
if (!electronHarness.includes('options?.buttons?.[1] === "确认拒绝"') || electronHarness.includes('options?.buttons?.[1] === "确认批准"') || electronHarness.includes("AVE_ELECTRON_PRODUCT_REVIEW_REJECT_CONFIRM")) throw new Error("test-owned Electron harness may confirm only exact feedback rejection");
if (!renderer.includes("state.stage2Preview.intent_ref?.object_id") || !renderer.includes('previewIntent?.status !== "candidate"')) throw new Error("decided feedback must clear its Renderer-only local effect preview");
console.log("desktop boundary check passed");
