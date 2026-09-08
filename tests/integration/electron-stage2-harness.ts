import { app, BrowserWindow, dialog } from "electron";
import type { ProjectSessionManager } from "../../apps/desktop/src/main/project-session-manager.js";
import type { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createWindow } from "../../apps/desktop/src/main/window-manager.js";
import { createCompositionRoot, registerCompositionRoot } from "../../apps/desktop/src/main/composition-root.js";
import { registerAppProtocol } from "../../apps/desktop/src/main/protocol-handler.js";
import { openCanonicalStage2Project } from "../../apps/desktop/src/main/project-lifecycle.js";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const feedbackText = "把当前镜头再收紧一秒";
const feedbackRejectionReason = "在当前代表性旅程中明确拒绝这次局部修订";
let expectedFeedbackCreationDetail: string | undefined;
let expectedExecutionId: string | undefined;
let priorIntentIds = new Set<string>();
const nativeFeedbackConfirmations: string[] = [];

export function registerElectronStage2Harness(currentDirectory: string, sessions: ProjectSessionManager, host: ProjectHostSession, harnessMode: string, projectDirectory: string | undefined, reviewDirectoryInput: string | undefined, feedbackIntentId: string | undefined): void {
  app.whenReady().then(async () => {
    if (projectDirectory) await openCanonicalStage2Project(host, resolve(projectDirectory));
    const window = createWindow(currentDirectory, sessions);
    if (harnessMode === "smoke") {
      window.webContents.once("did-finish-load", async () => {
        try {
          const result = await window.webContents.executeJavaScript("({ title: document.title, projectApi: typeof window.projectApi === 'object', workbench: Boolean(document.querySelector('.workbench-shell')) })", true);
          console.log(`AVE_ELECTRON_RUNTIME_SMOKE ${JSON.stringify(result)}`);
          const code = result.title === "AVE 工作台" && result.projectApi && result.workbench ? 0 : 1;
          app.quit();
          setTimeout(() => process.exit(code), 250);
        } catch (error) {
          console.error(`AVE_ELECTRON_RUNTIME_SMOKE_FAILED ${error instanceof Error ? error.message : String(error)}`);
          app.quit();
          setTimeout(() => process.exit(1), 250);
        }
      });
    }
    if ((harnessMode === "product" || harnessMode === "reopen") && reviewDirectoryInput) {
      window.webContents.once("did-finish-load", async () => {
        try {
          const reviewDirectory = resolve(reviewDirectoryInput); await mkdir(reviewDirectory, { recursive: true });
          const summary = await window.webContents.executeJavaScript(`new Promise((resolve, reject) => { const started = Date.now(); const poll = () => { const workspace = document.querySelector('.stage2-workspace'); const identity = workspace?.querySelector('.stage2-badge.good'); if (workspace && identity && !identity.textContent.includes('等待')) return resolve({ title: document.title, tabs: document.querySelectorAll('[data-stage2-view]').length, text: workspace.textContent, cards: workspace.querySelectorAll('.stage2-card').length }); if (Date.now() - started > 15000) return reject(new Error('Stage 2 workspace load timeout')); setTimeout(poll, 100); }; poll(); })`, true) as { title: string; tabs: number; text: string; cards: number };
          if (harnessMode === "reopen") {
            const reopened = await window.webContents.executeJavaScript(`(async () => { const status = await window.projectApi.query({ api_version: 1, query_type: 'app.status', project_id: '' }); const workspace = await window.projectApi.query({ api_version: 1, query_type: 'project.stage2.workspace', project_id: status.data.project }); const feedbackIntentId = ${JSON.stringify(feedbackIntentId)}; const feedback = workspace.data.intents.find((item) => item.object_id === feedbackIntentId); const rejection = workspace.data.approvals.find((item) => item.action === 'feedback_revision.reject' && item.subject_ref.object_id === feedbackIntentId && item.status !== 'stale'); return { project_id: status.data.project, timeline_version: workspace.data.timeline.version, workspace_digest: workspace.data.workspace_digest, render_binding: workspace.data.review.render?.binding_status ?? 'none', stale_intent_ids: workspace.data.intents.filter((item) => item.status === 'stale').map((item) => item.object_id).sort(), current_execution_id: workspace.data.review.current_execution_id, feedback_status: feedback?.status ?? 'missing', feedback_rejection_decision_id: rejection?.decision_id ?? '' }; })()`, true);
            console.log(`AVE_ELECTRON_PRODUCT_REOPEN ${JSON.stringify(reopened)}`); app.quit(); setTimeout(() => process.exit(0), 250); return;
          }
          const captures: string[] = [], views: Record<string, unknown> = {};
          for (const view of ["contract", "evidence", "story", "review"]) {
            await window.webContents.executeJavaScript(`new Promise((resolve) => { document.querySelector('[data-stage2-view="${view}"]').click(); document.querySelector('.stage2-workspace').scrollIntoView({ block: 'start', inline: 'start' }); window.scrollTo({ left: 0 }); document.documentElement.style.visibility = 'hidden'; requestAnimationFrame(() => { document.documentElement.style.visibility = 'visible'; requestAnimationFrame(resolve); }); })`, true);
            window.webContents.invalidate();
            await new Promise((done) => setTimeout(done, 500));
            views[view] = await window.webContents.executeJavaScript(`({ text: document.querySelector('.stage2-workspace')?.textContent ?? '', cards: document.querySelectorAll('.stage2-workspace .stage2-card').length, candidates: document.querySelectorAll('.stage2-workspace .candidate-card').length, intents: document.querySelectorAll('.stage2-workspace .intent-card').length, feedbackForm: Boolean(document.querySelector('.stage2-workspace .stage2-feedback')) })`, true);
            await window.webContents.capturePage();
            const path = resolve(reviewDirectory, `${view}.png`); await writeFile(path, (await window.webContents.capturePage()).toPNG()); captures.push(path);
          }
          const feedbackWorkspace = await host.readStage2Workspace() as any;
          const feedbackTarget = feedbackWorkspace.timeline.feedback_editable_targets.find((target: any) => target.track_id === "video-main" && target.source.end.value - target.source.start.value > target.source.end.timescale);
          if (!feedbackTarget) throw new Error("No current output target supports an exact one-second inward trim");
          expectedExecutionId = feedbackWorkspace.review.current_execution_id;
          priorIntentIds = new Set(feedbackWorkspace.intents.map((item: any) => item.object_id));
          const sourceStart = feedbackTarget.source.start, sourceEnd = feedbackTarget.source.end;
          expectedFeedbackCreationDetail = [`目标：${feedbackTarget.track_id}/${feedbackTarget.clip_id}`, "精确时长：1/1 秒", `精确源 PTS 裁剪：${sourceEnd.timescale} @ ${sourceEnd.timescale}`, `修订源范围：${sourceStart.value}/${sourceStart.timescale} → ${sourceEnd.value - sourceEnd.timescale}/${sourceEnd.timescale}`, `反馈：${feedbackText}`, `理由：${feedbackText}`].join("\n");
          const journey = await window.webContents.executeJavaScript(`(async () => {
            const waitFor = async (read, test, label, timeout = 20000) => { const started = Date.now(); while (Date.now() - started < timeout) { try { const value = await read(); if (test(value)) return value; } catch (error) { if (error.message !== 'PRODUCT_WORKSPACE_CHANGED_DURING_READ') throw error; } await new Promise((done) => setTimeout(done, 100)); } throw new Error(label + ' timed out: ' + (document.querySelector('.notice')?.textContent ?? '')); };
            const status = await window.projectApi.query({ api_version: 1, query_type: 'app.status', project_id: '' }), projectId = status.data.project;
            const workspace = () => window.projectApi.query({ api_version: 1, query_type: 'project.stage2.workspace', project_id: projectId }).then((result) => { if (!result.ok) throw new Error(result.error.message); return result.data; });
            const before = await workspace();
            const previewButton = [...document.querySelectorAll('.stage2-workspace button')].find((button) => button.textContent.includes('打开当前 Preview'));
            if (!previewButton || previewButton.disabled) throw new Error('current Preview button unavailable'); previewButton.click();
            const video = await waitFor(() => Promise.resolve(document.querySelector('.player-panel video')), Boolean, 'Preview player'); video.muted = true; await video.play(); await waitFor(() => Promise.resolve(video.currentTime), (value) => value > 0.15, 'Preview playback'); video.pause();
            const form = document.querySelector('.stage2-feedback'), inputs = form ? [...form.querySelectorAll('input')] : [], targetSelect = form?.querySelector('select[name="feedback-target"]');
            if (!form || inputs.length !== 2 || !targetSelect) throw new Error('feedback form unavailable');
            targetSelect.value = ${JSON.stringify(JSON.stringify([feedbackTarget.track_id, feedbackTarget.clip_id]))};
            inputs[0].value = ${JSON.stringify(feedbackText)}; inputs[1].value = '1';
            if (!form.checkValidity()) throw new Error('exact feedback form is invalid');
            form.requestSubmit();
            const afterFeedback = await waitFor(workspace, (value) => value.intents.length > before.intents.length, 'feedback generation'); const newIntent = afterFeedback.intents.find((item) => !before.intents.some((prior) => prior.object_id === item.object_id)); if (!newIntent || newIntent.status !== 'candidate') throw new Error('new feedback intent unavailable');
            const previewEffect = await waitFor(() => Promise.resolve([...([...document.querySelectorAll('.intent-card')].find((card) => card.textContent.includes(newIntent.object_id))?.querySelectorAll('button') ?? [])].find((button) => button.textContent.includes('预览局部影响'))), (button) => Boolean(button && !button.disabled), 'feedback preview action'); previewEffect.click(); await waitFor(() => Promise.resolve(document.querySelector('.stage2-effect')?.textContent ?? ''), (value) => value.includes('尚未修改 Timeline'), 'feedback preview effect');
            const beforeMismatch = await workspace(), mismatchedAction = await window.projectApi.command({ api_version: 1, command_type: 'project.stage2.action', command_id: crypto.randomUUID(), idempotency_key: 'product-dual-id:' + crypto.randomUUID(), project_id: projectId, payload: { action: 'feedback.reject', workspace_digest: beforeMismatch.workspace_digest, reason: '双 ID 必须在确认前关闭', selected_id: beforeMismatch.directions[0].object_id, intent_id: newIntent.object_id } }), afterMismatch = await workspace();
            if (mismatchedAction.ok || afterMismatch.timeline.version !== beforeMismatch.timeline.version || afterMismatch.approvals.length !== beforeMismatch.approvals.length) throw new Error('dual-ID action was not closed before writes');
            const currentFeedbackCard = () => [...document.querySelectorAll('.intent-card')].find((card) => card.textContent.includes(newIntent.object_id));
            const rejectButton = await waitFor(() => Promise.resolve([...(currentFeedbackCard()?.querySelectorAll('button') ?? [])].find((button) => button.textContent.includes('拒绝此修订'))), (button) => Boolean(button && !button.disabled), 'feedback reject action');
            const originalPrompt = window.prompt; window.prompt = () => ${JSON.stringify(feedbackRejectionReason)}; try { rejectButton.click(); } finally { window.prompt = originalPrompt; }
            const decided = await waitFor(workspace, (value) => value.approvals.some((item) => item.action === 'feedback_revision.reject' && item.subject_ref.object_id === newIntent.object_id && item.status !== 'stale'), 'feedback rejection decision');
            const rejection = decided.approvals.find((item) => item.action === 'feedback_revision.reject' && item.subject_ref.object_id === newIntent.object_id && item.status !== 'stale');
            const feedbackDecisionVisible = await waitFor(() => Promise.resolve(currentFeedbackCard()?.textContent ?? ''), (value) => value.includes('修订已拒绝'), 'visible feedback rejection');
            if (decided.timeline.version !== afterFeedback.timeline.version) throw new Error('feedback rejection mutated Timeline');
            const invalid = await window.projectApi.query({ api_version: 1, query_type: 'project.stage2.feedback.preview', project_id: projectId, payload: { intent_id: newIntent.object_id, unexpected: true } });
            const previewEffectCleared = await waitFor(() => Promise.resolve(Boolean(document.querySelector('.stage2-effect'))), (value) => value === false, 'decided feedback preview cleanup');
            const mediaPreviewRetained = Boolean(document.querySelector('.player-panel video'));
            const currentPreviewButton = [...document.querySelectorAll('.stage2-workspace button')].find((button) => button.textContent.includes('打开当前 Preview'));
            const stalePreview = await window.projectApi.query({ api_version: 1, query_type: 'project.stage2.preview.current', project_id: projectId, payload: { workspace_digest: before.workspace_digest } });
            return { stale_intent_ids: decided.intents.filter((item) => item.status === 'stale').map((item) => item.object_id).sort(), current_execution_id: decided.review.current_execution_id, project_id: projectId, before_timeline_version: before.timeline.version, preview_duration: video.duration, preview_played_seconds: video.currentTime, feedback_intent_id: newIntent.object_id, feedback_preview_visible: true, dual_id_payload_closed: mismatchedAction.ok === false, dual_id_timeline_unchanged: afterMismatch.timeline.version === beforeMismatch.timeline.version, dual_id_approval_unchanged: afterMismatch.approvals.length === beforeMismatch.approvals.length, feedback_decision: 'rejected', feedback_decision_visible: feedbackDecisionVisible.includes('修订已拒绝'), feedback_decision_timeline_unchanged: decided.timeline.version === afterFeedback.timeline.version, feedback_rejection_decision_id: rejection?.decision_id ?? '', decided_feedback_preview_cleared: previewEffectCleared === false, current_media_preview_retained: mediaPreviewRetained, current_preview_action_available: Boolean(currentPreviewButton && !currentPreviewButton.disabled), stale_preview_query_closed: stalePreview.ok === false, invalid_payload_closed: invalid.ok === false, timeline_version: decided.timeline.version, render_binding: decided.review.render?.binding_status ?? 'none', feedback_status: decided.intents.find((item) => item.object_id === newIntent.object_id)?.status ?? 'missing', workspace_digest: decided.workspace_digest };
          })()`, true);
          window.webContents.invalidate(); await new Promise((done) => setTimeout(done, 500)); const decisionPath = resolve(reviewDirectory, "review-after-decision.png"); await writeFile(decisionPath, (await window.webContents.capturePage()).toPNG()); captures.push(decisionPath);
          const final = await window.webContents.executeJavaScript(`({ workspace: document.querySelector('.stage2-workspace')?.textContent ?? '', selectedTab: document.querySelector('[data-stage2-view].active')?.dataset.stage2View ?? '', candidateCards: document.querySelectorAll('.candidate-card').length, intentCards: document.querySelectorAll('.intent-card').length, feedbackForm: Boolean(document.querySelector('.stage2-feedback')), rawJsonPrompts: [...document.querySelectorAll('.stage2-workspace')].some(node => node.textContent.includes('输入 JSON')) })`, true);
          console.log(`AVE_ELECTRON_PRODUCT_REVIEW ${JSON.stringify({ ...summary, ...final, captures, views, journey, native_feedback_confirmations: nativeFeedbackConfirmations })}`); app.quit(); setTimeout(() => process.exit(0), 250);
        } catch (error) { console.error(`AVE_ELECTRON_PRODUCT_REVIEW_FAILED ${error instanceof Error ? error.stack ?? error.message : String(error)}`); app.quit(); setTimeout(() => process.exit(1), 250); }
      });
    }
    app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(currentDirectory, sessions); });
  });
  app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
}

const harnessArguments = new Map(process.argv.slice(2).filter((value) => value.startsWith("--ave-harness-")).map((value) => {
  const separator = value.indexOf("=");
  if (separator < 0) throw new Error("Electron harness arguments must use --name=value");
  return [value.slice(2, separator), value.slice(separator + 1)];
}));
const harnessMode = harnessArguments.get("ave-harness-mode");
if (!harnessMode || !["smoke", "product", "reopen"].includes(harnessMode)) throw new Error("Electron harness mode must be smoke, product or reopen");
const harnessRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const harnessDialog = new Proxy(dialog, {
  get(target, property, receiver) {
    if (property === "showMessageBox") return async (...args: unknown[]) => {
      const options = args.at(-1) as { type?: string; title?: string; message?: string; detail?: string; buttons?: readonly string[]; defaultId?: number; cancelId?: number; noLink?: boolean } | undefined;
      const safeDialog = harnessMode === "product" && options?.type === "warning" && options.defaultId === 0 && options.cancelId === 0 && options.noLink === true && options.buttons?.length === 2 && options.buttons[0] === "取消";
      if (safeDialog && options?.buttons?.[1] === "确认创建反馈修订" && options.title === "AVE 精确反馈确认" && options.message === "请确认精确裁剪时长与源 PTS" && expectedFeedbackCreationDetail !== undefined && options.detail === expectedFeedbackCreationDetail && nativeFeedbackConfirmations.length === 0) {
        nativeFeedbackConfirmations.push("feedback.create");
        return { response: 1, checkboxChecked: false };
      }
      if (safeDialog && options?.buttons?.[1] === "确认拒绝" && options.title === "AVE 精确人工审批" && options.message === "请在主进程确认当前版本与精确效果" && nativeFeedbackConfirmations.length === 1) {
        const workspace = await harnessContext.host.readStage2Workspace() as any;
        const candidates = workspace.intents.filter((item: any) => !priorIntentIds.has(item.object_id) && item.status === "candidate" && item.feedback_diagnosis_ref);
        if (workspace.review.current_execution_id === expectedExecutionId && candidates.length === 1) {
          const intent = candidates[0];
          const detail = [`拒绝反馈修订：${intent.object_id}`, ...intent.operations.map((operation: any) => `${operation.kind} — ${operation.expected_effect ?? operation.reason ?? "未提供效果说明"} — ${operation.target_refs.join("、")}`), `Workspace：${workspace.workspace_digest.slice(0, 16)}`, `理由：${feedbackRejectionReason}`].join("\n");
          if (options.detail === detail && nativeFeedbackConfirmations.length === 1) {
            nativeFeedbackConfirmations.push(`feedback.reject:${intent.object_id}`);
            return { response: 1, checkboxChecked: false };
          }
        }
      }
      throw new Error("Electron harness refused a non-exact or repeated feedback native confirmation");
    };
    const value = Reflect.get(target, property, receiver);
    return typeof value === "function" ? value.bind(target) : value;
  },
}) as typeof dialog;
const harnessContext = createCompositionRoot(harnessDialog);
registerCompositionRoot(harnessContext);
app.whenReady().then(() => registerAppProtocol(resolve(harnessRoot, "apps/desktop/src/renderer")));
registerElectronStage2Harness(
  resolve(harnessRoot, "apps/desktop/src/main"),
  harnessContext.sessions,
  harnessContext.host,
  harnessMode,
  harnessArguments.get("ave-harness-project"),
  harnessArguments.get("ave-harness-review-dir"),
  harnessArguments.get("ave-harness-feedback-intent"),
);
