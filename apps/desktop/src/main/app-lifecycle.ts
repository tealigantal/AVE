import { app, BrowserWindow } from "electron";
import type { ProjectSessionManager } from "./project-session-manager.js";
import type { ProjectHostSession } from "../../../../packages/platform/project-host/src/public.js";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createWindow } from "./window-manager.js";

export function registerAppLifecycle(currentDirectory: string, sessions: ProjectSessionManager, host: ProjectHostSession): void {
  app.whenReady().then(async () => {
    if (process.env.AVE_OPEN_PROJECT) await host.open(resolve(process.env.AVE_OPEN_PROJECT));
    const window = createWindow(currentDirectory, sessions);
    if (process.env.AVE_ELECTRON_SMOKE === "1") {
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
    if (process.env.AVE_ELECTRON_PRODUCT_REVIEW === "1" && process.env.AVE_ELECTRON_REVIEW_DIR) {
      window.webContents.once("did-finish-load", async () => {
        try {
          const reviewDirectory = resolve(process.env.AVE_ELECTRON_REVIEW_DIR!); await mkdir(reviewDirectory, { recursive: true });
          const summary = await window.webContents.executeJavaScript(`new Promise((resolve, reject) => { const started = Date.now(); const poll = () => { const workspace = document.querySelector('.stage2-workspace'); const identity = workspace?.querySelector('.stage2-badge.good'); if (workspace && identity && !identity.textContent.includes('等待')) return resolve({ title: document.title, tabs: document.querySelectorAll('[data-stage2-view]').length, text: workspace.textContent, cards: workspace.querySelectorAll('.stage2-card').length }); if (Date.now() - started > 15000) return reject(new Error('Stage 2 workspace load timeout')); setTimeout(poll, 100); }; poll(); })`, true) as { title: string; tabs: number; text: string; cards: number };
          if (process.env.AVE_ELECTRON_PRODUCT_REOPEN_ONLY === "1") {
            const reopened = await window.webContents.executeJavaScript(`(async () => { const status = await window.projectApi.query({ api_version: 1, query_type: 'app.status', project_id: '' }); const workspace = await window.projectApi.query({ api_version: 1, query_type: 'project.stage2.workspace', project_id: status.data.project }); return { project_id: status.data.project, timeline_version: workspace.data.timeline.version, workspace_digest: workspace.data.workspace_digest, render_binding: workspace.data.review.render?.binding_status ?? 'none', stale_intents: workspace.data.intents.filter((item) => item.status === 'stale').length }; })()`, true);
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
          const journey = await window.webContents.executeJavaScript(`(async () => {
            const waitFor = async (read, test, label, timeout = 20000) => { const started = Date.now(); while (Date.now() - started < timeout) { const value = await read(); if (test(value)) return value; await new Promise((done) => setTimeout(done, 100)); } throw new Error(label + ' timed out'); };
            const status = await window.projectApi.query({ api_version: 1, query_type: 'app.status', project_id: '' }), projectId = status.data.project;
            const workspace = () => window.projectApi.query({ api_version: 1, query_type: 'project.stage2.workspace', project_id: projectId }).then((result) => { if (!result.ok) throw new Error(result.error.message); return result.data; });
            const before = await workspace();
            const previewButton = [...document.querySelectorAll('.stage2-workspace button')].find((button) => button.textContent.includes('打开当前 Preview'));
            if (!previewButton || previewButton.disabled) throw new Error('current Preview button unavailable'); previewButton.click();
            const video = await waitFor(() => Promise.resolve(document.querySelector('.player-panel video')), Boolean, 'Preview player'); video.muted = true; await video.play(); await waitFor(() => Promise.resolve(video.currentTime), (value) => value > 0.15, 'Preview playback'); video.pause();
            const form = document.querySelector('.stage2-feedback'), inputs = form ? [...form.querySelectorAll('input')] : []; if (!form || inputs.length !== 2) throw new Error('feedback form unavailable'); inputs[0].value = '把当前镜头再收紧四分之一秒'; inputs[1].value = '0.25'; form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
            const afterFeedback = await waitFor(workspace, (value) => value.intents.length > before.intents.length, 'feedback generation'); const newIntent = afterFeedback.intents.find((item) => !before.intents.some((prior) => prior.object_id === item.object_id)); if (!newIntent || newIntent.status !== 'candidate') throw new Error('new feedback intent unavailable');
            await waitFor(() => Promise.resolve([...document.querySelectorAll('.intent-card')].find((card) => card.textContent.includes(newIntent.object_id))), Boolean, 'feedback card'); const feedbackCard = [...document.querySelectorAll('.intent-card')].find((card) => card.textContent.includes(newIntent.object_id)), previewEffect = [...feedbackCard.querySelectorAll('button')].find((button) => button.textContent.includes('预览局部影响')); if (!previewEffect) throw new Error('feedback preview action unavailable'); previewEffect.click(); await waitFor(() => Promise.resolve(document.querySelector('.stage2-effect')?.textContent ?? ''), (value) => value.includes('尚未修改 Timeline'), 'feedback preview effect');
            const beforeMismatch = await workspace(), mismatchedAction = await window.projectApi.command({ api_version: 1, command_type: 'project.stage2.action', command_id: crypto.randomUUID(), idempotency_key: 'product-dual-id:' + crypto.randomUUID(), project_id: projectId, payload: { action: 'feedback.reject', workspace_digest: beforeMismatch.workspace_digest, reason: '双 ID 必须在确认前关闭', selected_id: beforeMismatch.directions[0].object_id, intent_id: newIntent.object_id } }), afterMismatch = await workspace();
            if (mismatchedAction.ok || afterMismatch.timeline.version !== beforeMismatch.timeline.version || afterMismatch.approvals.length !== beforeMismatch.approvals.length) throw new Error('dual-ID action was not closed before writes');
            const currentFeedbackCard = () => [...document.querySelectorAll('.intent-card')].find((card) => card.textContent.includes(newIntent.object_id));
            const rejectButton = await waitFor(() => Promise.resolve([...(currentFeedbackCard()?.querySelectorAll('button') ?? [])].find((button) => button.textContent.includes('拒绝此修订'))), (button) => Boolean(button && !button.disabled), 'feedback reject action');
            const originalPrompt = window.prompt; window.prompt = () => '在当前代表性旅程中明确拒绝这次局部修订'; try { rejectButton.click(); } finally { window.prompt = originalPrompt; }
            const decided = await waitFor(workspace, (value) => value.approvals.some((item) => item.action === 'feedback_revision.reject' && item.subject_ref.object_id === newIntent.object_id && item.status !== 'stale'), 'feedback rejection decision');
            const rejection = decided.approvals.find((item) => item.action === 'feedback_revision.reject' && item.subject_ref.object_id === newIntent.object_id && item.status !== 'stale');
            const feedbackDecisionVisible = await waitFor(() => Promise.resolve(currentFeedbackCard()?.textContent ?? ''), (value) => value.includes('修订已拒绝'), 'visible feedback rejection');
            if (decided.timeline.version !== afterFeedback.timeline.version) throw new Error('feedback rejection mutated Timeline');
            const invalid = await window.projectApi.query({ api_version: 1, query_type: 'project.stage2.feedback.preview', project_id: projectId, payload: { intent_id: newIntent.object_id, unexpected: true } });
            const undo = [...document.querySelectorAll('.recovery-row button')].find((button) => button.textContent === '撤销'); undo.click(); const undone = await waitFor(workspace, (value) => value.timeline.version !== afterFeedback.timeline.version, 'undo');
            const redo = await waitFor(() => Promise.resolve([...document.querySelectorAll('.recovery-row button')].find((button) => button.textContent === '重做')), Boolean, 'redo button'); redo.click(); const redone = await waitFor(workspace, (value) => value.timeline.version > undone.timeline.version, 'redo');
            const previewEffectCleared = await waitFor(() => Promise.resolve(Boolean(document.querySelector('.stage2-effect'))), (value) => value === false, 'stale feedback preview cleanup');
            const mediaPreviewCleared = await waitFor(() => Promise.resolve(Boolean(document.querySelector('.player-panel video'))), (value) => value === false, 'stale media preview cleanup');
            const legacyPreviewButton = [...document.querySelectorAll('.player-panel button')].find((button) => button.textContent.includes('Preview'));
            const stalePreview = await window.projectApi.query({ api_version: 1, query_type: 'project.stage2.preview.current', project_id: projectId, payload: { workspace_digest: before.workspace_digest } });
            return { project_id: projectId, before_timeline_version: before.timeline.version, preview_duration: video.duration, preview_played_seconds: video.currentTime, feedback_intent_id: newIntent.object_id, feedback_preview_visible: true, dual_id_payload_closed: mismatchedAction.ok === false, dual_id_timeline_unchanged: afterMismatch.timeline.version === beforeMismatch.timeline.version, dual_id_approval_unchanged: afterMismatch.approvals.length === beforeMismatch.approvals.length, feedback_decision: 'rejected', feedback_decision_visible: feedbackDecisionVisible.includes('修订已拒绝'), feedback_decision_timeline_unchanged: decided.timeline.version === afterFeedback.timeline.version, feedback_rejection_decision_id: rejection?.decision_id ?? '', preview_effect_after_recovery: previewEffectCleared, media_preview_after_recovery: mediaPreviewCleared, stale_preview_reload_disabled: Boolean(legacyPreviewButton?.disabled), stale_preview_query_closed: stalePreview.ok === false, invalid_payload_closed: invalid.ok === false, undo_timeline_version: undone.timeline.version, redo_timeline_version: redone.timeline.version, render_after_recovery: redone.review.render?.binding_status ?? 'none', feedback_after_recovery: redone.intents.find((item) => item.object_id === newIntent.object_id)?.status ?? 'missing', workspace_digest: redone.workspace_digest };
          })()`, true);
          window.webContents.invalidate(); await new Promise((done) => setTimeout(done, 500)); const recoveryPath = resolve(reviewDirectory, "review-after-recovery.png"); await writeFile(recoveryPath, (await window.webContents.capturePage()).toPNG()); captures.push(recoveryPath);
          const final = await window.webContents.executeJavaScript(`({ workspace: document.querySelector('.stage2-workspace')?.textContent ?? '', selectedTab: document.querySelector('[data-stage2-view].active')?.dataset.stage2View ?? '', candidateCards: document.querySelectorAll('.candidate-card').length, intentCards: document.querySelectorAll('.intent-card').length, feedbackForm: Boolean(document.querySelector('.stage2-feedback')), rawJsonPrompts: [...document.querySelectorAll('.stage2-workspace')].some(node => node.textContent.includes('输入 JSON')) })`, true);
          console.log(`AVE_ELECTRON_PRODUCT_REVIEW ${JSON.stringify({ ...summary, ...final, captures, views, journey })}`); app.quit(); setTimeout(() => process.exit(0), 250);
        } catch (error) { console.error(`AVE_ELECTRON_PRODUCT_REVIEW_FAILED ${error instanceof Error ? error.message : String(error)}`); app.quit(); setTimeout(() => process.exit(1), 250); }
      });
    }
    app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(currentDirectory, sessions); });
  });
  app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
}
