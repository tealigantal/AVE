import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { test } from "node:test";

const testFile = fileURLToPath(import.meta.url);
const repositoryRoot = resolve(dirname(testFile), "../..");
const electronHarnessMode = Boolean(process.versions.electron) && process.argv.includes("--ave-p4-workbench-harness");

async function runElectronHarness() {
  const { app, BrowserWindow } = await import("electron");
  const tempRoot = await mkdtemp(resolve(tmpdir(), "ave-p4-workbench-"));
  let browserWindow;
  let failingStep = "prepare-renderer";
  const rendererErrors = [];
  try {
    const rendererRoot = resolve(tempRoot, "renderer");
    await cp(resolve(repositoryRoot, "apps/desktop/src/renderer"), rendererRoot, { recursive: true });
    const indexPath = resolve(rendererRoot, "index.html");
    const index = await readFile(indexPath, "utf8");
    await writeFile(indexPath, index.replace('href="/styles/', 'href="./styles/').replace('src="/app/', 'src="./app/'));
    const preload = resolve(tempRoot, "p4-workbench-preload.cjs");
    await writeFile(preload, `
      const ok = data => ({ ok: true, data });
      window.__p4Queries = [];
      window.projectApi = {
        query: async request => {
          const type = request.query_type;
          window.__p4Queries.push(type);
          if (type === "app.status") return ok({ project: "not-open", model_service: null });
          if (type === "app.projects.recent") return ok({ items: [] });
          if (type === "app.projects.recycle-bin") return ok({ items: [] });
          throw new Error("Unexpected P4 DOM test query: " + type);
        },
        command: async request => ({ ok: false, error: { code: "P4_TEST_UNEXPECTED_COMMAND", message: request.command_type } }),
        subscribeProjectEvents: () => () => {},
        onBeforeClose: () => () => {},
        acknowledgeClose: async () => ({ ok: true }),
        chooseFiles: async () => ({ canceled: true, filePaths: [] }),
        chooseDirectory: async () => ({ canceled: true, filePath: "" }),
      };
    `);
    app.setPath("userData", process.env.AVE_P4_USER_DATA);
    await app.whenReady();
    failingStep = "create-window"; process.stderr.write("P4 step: create-window\n");
    browserWindow = new BrowserWindow({
      show: false,
      width: 1440,
      height: 1000,
      webPreferences: { preload, contextIsolation: false, nodeIntegration: false, sandbox: false, backgroundThrottling: false },
    });
    browserWindow.setMinimumSize(320, 360);
    browserWindow.webContents.on("console-message", event => {
      if (event.level >= 2) {rendererErrors.push(event.message);process.stderr.write("Renderer: "+event.message+"\n");}
    });
    browserWindow.webContents.on("render-process-gone", (_event, details) => rendererErrors.push(`renderer process gone: ${JSON.stringify(details)}`));
    failingStep = "load-official-entry"; process.stderr.write("P4 step: load-official-entry\n");
    await browserWindow.loadFile(resolve(rendererRoot, "index.html"));
    failingStep = "inspect-mounted-entry"; process.stderr.write("P4 step: inspect-mounted-entry\n");
    await browserWindow.webContents.executeJavaScript(`new Promise(resolve => setTimeout(resolve, 500))`);
    const boot = await browserWindow.webContents.executeJavaScript(`({
      mounted: Boolean(document.querySelector('[data-action="toggle-nav"]')),
      apiAvailable: Boolean(window.projectApi),
      queries: window.__p4Queries ?? [],
      pageText: document.body.innerText.slice(0, 1200),
      rootHtml: document.getElementById('app')?.innerHTML.slice(0, 1200) ?? '',
    })`);
    if (!boot.mounted) throw new Error(`Renderer entry did not mount the workbench: ${JSON.stringify(boot)}`);

    failingStep = "dispatch-navigation-events"; process.stderr.write("P4 step: dispatch-navigation-events\n");
    const workbench = await browserWindow.webContents.executeJavaScript(`(() => {
      const toggle = document.querySelector('[data-action="toggle-nav"]');
      const rail = document.querySelector('.sidebar');
      const routeButtons = [...document.querySelectorAll('[data-workspace-page]')];
      const routes = routeButtons.map(button => button.dataset.workspacePage);
      const initialHidden = rail.hidden;
      toggle.click();
      const hiddenAfterClick = rail.hidden;
      toggle.click();
      const annotationHelp = document.querySelector('.timeline-annotation-queue .muted')?.textContent ?? '';
      document.querySelector('[data-workspace-page="help"]').click();
      const help = document.querySelector('.workspace-help-page');
      const helpResult = { visible: Boolean(help && !help.hidden && !help.inert), hasShortcut: help?.innerText.includes('Ctrl + Shift + Z') ?? false, activeRoute: document.querySelector('[data-workspace-page="help"]').getAttribute('aria-current'), composerCount: document.querySelectorAll('.chat-compose .creation-composer').length };
      document.querySelector('[data-workspace-page="projects"]').click();
      document.querySelector('.project-management-page [data-workspace-focus-key="recycle"]').click();
      const recycle = document.querySelector('.workspace-recycle-page');
      const recycleResult = { visible: Boolean(recycle && !recycle.hidden && !recycle.inert), hasEmptyState: recycle?.innerText.includes('回收站为空') ?? false, activeRoute: document.querySelector('[data-workspace-page="recycle"]').getAttribute('aria-current') };
      document.querySelector('[data-workspace-page="projects"]').click();
      const projects = document.querySelector('.project-management-page');
      const openButton = projects?.querySelector('[data-project-focus-key="open"]');
      openButton?.focus();
      window.dispatchEvent(new Event('resize'));
      const projectResult = { visible: Boolean(projects && !projects.hidden && !projects.inert), title: projects?.querySelector('#project-management-title')?.textContent ?? '', hasProjectActions: Boolean(projects?.querySelector('[data-project-focus-key="create"]') && projects?.querySelector('[data-project-focus-key="open"]')), activeRoute: document.querySelector('[data-workspace-page="projects"]').getAttribute('aria-current'), focusedActionAfterResize: document.activeElement?.dataset.projectFocusKey ?? '' };
      return { title: document.title, mounted: Boolean(document.querySelector('.product-shell')), routes, initialHidden, hiddenAfterClick, restoredHidden: rail.hidden, annotationHelp, helpResult, recycleResult, projectResult };
    })()`);

    const creationWorkspaceUrl = pathToFileURL(resolve(rendererRoot, "features/creation-workspace.js")).href;
    failingStep = "dispatch-failed-annotation-recovery"; process.stderr.write("P4 step: dispatch-failed-annotation-recovery\n");
    const annotationUi = await browserWindow.webContents.executeJavaScript(`(async () => {
      const { createCreationWorkspace } = await import(${JSON.stringify(creationWorkspaceUrl)});
      const operationId = '11111111-1111-4111-8111-111111111111';
      const annotationMessage = { schema_version: 3, operation_id: operationId, message_id: '22222222-2222-4222-8222-222222222222', project_id: 'test-project', request_id: 'test-request', draft_id: 'test-draft', expected_revision: 1, timeline_version: 2, conversation_revision: 2, created_at: '2026-10-12T10:00:00.000Z', request_text: '保留动作节奏', preserve_refs: [], profile_query: null, annotations: [{ schema_version: 2, annotation_id: 'annotation-1', anchor: { surface: 'timeline', track_id: 'video-main', clip_id: 'clip-1', start: { schema_version: 1, value: 10, timescale: 30 }, end: null, preview_point: null }, body: '保留动作节奏', anchor_resolution: { status: 'current', timeline_version: 2, track_id: 'video-main', clip_id: 'clip-1', start_ticks: '10' } }], processing: { schema_version: 1, operation_id: operationId, request_id: 'test-request', target_revision: 2, status: 'failed', updated_at: '2026-10-12T10:00:01.000Z', failure: { code: 'MODEL_REJECTED', message: '请修正后重试' } } };
      const request = { authorization: { request_id: 'test-request', original_text: '测试作品', asset_ids: [], protected_refs: [] }, status: 'received', revisions: [{ revision: 1, raw_text: '测试作品', preserve_refs: [], conversation_revision: 1 }], drafts: [{ draft_id: 'test-draft', timeline_version: 2, base_timeline_version: 1, revision: 1, source: { kind: 'manual',raw_text:'受控 UI 测试精修' }, renders: [] }], timeline_annotations: [annotationMessage], materials: [], observations: [], learning: [], adoptions: [], latest_draft_id: 'test-draft', viewed_draft_id: 'test-draft', adopted_draft_id: null, revoked: false };
      const state = { status: { project: 'test-project', model_service: null }, workspace: { requests: [request], timeline_version: 2, profile_contexts: { mode: 'unconfigured', contexts: [] } }, selectedRequestId: 'test-request', selectedDraftId: 'test-draft', selectedRenderId: '', selectedClip: null, selectedCaption: null, selectedTransition: null, selectedTimelineTrackId: 'video-main', creationView: 'request', workspacePage: 'creation', authorityCurrent: true, timeline: { version: 2, sequence: { timebase: { value: 1n, timescale: 30n } }, tracks: [] }, displayedPreviewTimeline: null, forms: new Map(), formsGeneration: 0, pending: new Set(), media: [], precisionSources: [], failedRenderAttempts: new Set(), previewCovers: new Map(), previewCoverRevision: 0, profileQuery: null };
      let clickedOperationId = null;
      const actions = new Proxy({ editAvailability: () => ({ undo: false, redo: false }), adoptionAvailability: () => ({ undo: false, redo: false }), reopenFailedTimelineAnnotations: id => { clickedOperationId = id; }, saveUi() {} }, { get(target, key) { return target[key] ?? (() => {}); } });
      const workspace = createCreationWorkspace(actions, state);
      document.body.append(workspace.node, workspace.dock);
      const reopen = [...workspace.node.querySelectorAll('button')].find(item => item.textContent.trim() === '重新打开编辑');
      const buttonVisible = Boolean(reopen && !reopen.hidden && !reopen.disabled);
      reopen?.click();
      const composer = workspace.dock.querySelector('textarea');
      composer.focus(); composer.value = '保留光标与未发送输入'; composer.setSelectionRange(1, 4); composer.dispatchEvent(new Event('input', { bubbles: true }));
      workspace.update();
      const composerState = { focused: document.activeElement === composer, value: composer.value, selectedText: composer.value.slice(composer.selectionStart, composer.selectionEnd), persisted: state.forms.get(JSON.stringify(['test-project', 'test-request', 'creative-composer'])) };
      const queueKey=JSON.stringify(['test-project','test-request','timeline-annotation-drafts']);
      state.forms.set(queueKey,{schema_version:1,annotations:annotationMessage.annotations,submission:annotationMessage});
      actions.revise=async()=>{request.revisions.push({revision:2,raw_text:composer.value,preserve_refs:[],conversation_revision:3});};
      // Simulate the real failure boundary: Host accepted the revision but rendering
      // failed. Saving the message must not clear the unsent combined request.
      workspace.node.querySelector('[data-creation-form="revise"]').requestSubmit();
      await new Promise(resolve=>setTimeout(resolve,0));
      const failedComposerPreserved=composer.value==='保留光标与未发送输入'&&state.forms.get(JSON.stringify(['test-project','test-request','creative-composer']))===composer.value;
      document.body.append(workspace.annotationDialog);
      let savedBody=null;workspace.editAnnotation(annotationMessage.annotations[0],body=>{savedBody=body;});
      const dialog=workspace.annotationDialog;dialog.querySelector('textarea').value='新的批注正文';dialog.querySelector('form').requestSubmit();
      const annotationDialogResult={savedBody,closed:!dialog.open};
      window.__p4WorkbenchFixture={workspace:structuredClone(state.workspace),timeline:structuredClone(state.timeline)};
      workspace.destroy(); workspace.node.remove(); workspace.dock.remove();
      return { buttonVisible, clickedOperationId, composerState, failedComposerPreserved, annotationDialogResult };
    })().catch(error => ({ harnessError: error?.stack ?? String(error) }))`);
    if (annotationUi.harnessError) throw new Error(`Failed annotation recovery UI failed: ${annotationUi.harnessError}`);

    const timelineModuleUrl = pathToFileURL(resolve(rendererRoot, "features/timeline-panel.js")).href;
    failingStep = "dispatch-timeline-events"; process.stderr.write("P4 step: dispatch-timeline-events\n");
    const timeline = await browserWindow.webContents.executeJavaScript(`(async () => {
      const { timelinePanel } = await import(${JSON.stringify(timelineModuleUrl)});
      const clip = { clip_id: 'test-clip', source: { asset_id: 'asset:sha256:${"a".repeat(64)}', start_pts: 0n, end_pts: 360n, timescale: 30n }, timeline_start: 0n, timeline_duration: 360n, media_kind: 'video', kind: 'media' };
      const current = { version: 2, sequence: { sequence_id: 'main', timebase: { value: 1n, timescale: 30n }, tracks: [] }, tracks: [{ track_id: 'video-main', kind: 'video', clips: [clip], captions: [], effects: [], locks: [] }] };
      const state = {
        status: { project: 'test-project' }, authorityCurrent: true, timeline: current,
        workspace: { requests: [{ authorization: { request_id: 'test-request' }, drafts: [{ draft_id: 'test-draft', timeline_version: 2 }], timeline_annotations: [] }] },
        selectedRequestId: 'test-request', selectedDraftId: 'test-draft', selectedTimelineTrackId: 'video-main',
        selectedClip: { track_id: 'video-main', clip_id: 'test-clip', timeline_version: 2 },
        displayedPreviewTimeline: { ...current, version: 1 }, displayedPreviewUrl: '', displayedPreviewBinding: null,
        timelineZoom: 0, timelineSnap: false, playheadTicks: 0n, pending: new Set(), precisionSources: [], forms: new Map(),
      };
      const seeks = [];
      let panel;
      const actions = {
        timelineSeek(tick) { seeks.push(String(tick)); state.playheadTicks = tick; panel.update(); },
        editAvailability: () => ({ undo: false, redo: false }),
        selectTimelineTrack() {}, selectClip() {},
      };
      panel = timelinePanel(actions, state, document.createElement('aside'));
      document.body.append(panel.node);
      panel.update();
      const editor = panel.node.querySelector('.p4-timeline-editor');
      const ruler = panel.node.querySelector('.p4-timeline-ruler');
      const lane = panel.node.querySelector('.p4-timeline-lane');
      const clipBar = panel.node.querySelector('.p4-timeline-clip');
      const scale = Number.parseFloat(clipBar.style.width) / Number(clip.timeline_duration);
      const rulerRect = ruler.getBoundingClientRect();
      const laneRect = lane.getBoundingClientRect();
      const target = laneRect.left + 600 * scale;
      const visibleAtTwentySeconds = target <= rulerRect.right;
      const rulerEndTicks = ruler.getAttribute('aria-valuemax');
      ruler.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: target }));
      const result = { editorMode: editor.dataset.mode, visibleAtTwentySeconds, rulerEndTicks, soughtTicks: seeks.at(-1) ?? null, currentVersion: state.timeline.version, previewVersion: state.displayedPreviewTimeline.version, editVersion: panel.node.querySelector('.p4-timeline-heading .muted')?.textContent };
      panel.destroy(); panel.node.remove();
      return result;
    })()`);

    const interactions = await browserWindow.webContents.executeJavaScript(`(async () => {
      const { timelinePanel } = await import(${JSON.stringify(timelineModuleUrl)});
      const asset = 'asset:sha256:${"b".repeat(64)}';
      const audioClip = { clip_id: 'music-clip', source: { asset_id: asset, start_pts: 0n, end_pts: 300n, timescale: 30n }, timeline_start: 0n, timeline_duration: 300n, media_kind: 'audio', kind: 'media' };
      const caption = { caption_id: 'caption-1', text: '原始字幕', timeline_start: 300n, timeline_duration: 120n, style: { workbench_kind: 'caption' } };
      const main = { track_id: 'video-main', kind: 'video', clips: [{ clip_id: 'video-clip', source: { asset_id: asset, start_pts: 0n, end_pts: 360n, timescale: 30n }, timeline_start: 0n, timeline_duration: 360n, media_kind: 'video', kind: 'media' }, { clip_id: 'video-clip-next', source: { asset_id: asset, start_pts: 360n, end_pts: 720n, timescale: 30n }, timeline_start: 345n, timeline_duration: 360n, media_kind: 'video', kind: 'media' }], captions: [], effects: [{ effect_id: 'effect-1', clip_id: 'video-clip', kind: 'blur', enabled: true }], transitions: [{ transition_id: 'transition-1', kind: 'cross_dissolve', from_clip_id: 'video-clip', to_clip_id: 'video-clip-next', timeline_start: 345n, timeline_duration: 15n }], locks: [] };
      const pip = { track_id: 'video-pip-1', kind: 'video', clips: [{ clip_id: 'pip-clip', source: { asset_id: asset, start_pts: 0n, end_pts: 240n, timescale: 30n }, timeline_start: 0n, timeline_duration: 240n, media_kind: 'video', kind: 'media', transform: { position_mode: 'normalized', x: 0.6, y: 0.6, scale_x: 0.35, scale_y: 0.35 } }], captions: [], semantic_sidecar: { labels: ['picture-in-picture'] }, locks: [] };
      const captions = { track_id: 'captions-track', kind: 'video', clips: [], captions: [caption], semantic_sidecar: { metadata: { workbench_role: 'captions' } }, locks: [] };
      const music = { track_id: 'music-track', kind: 'audio', clips: [audioClip], captions: [], audio_routing: [{ bus: 'music' }], locks: [] };
      const text = { track_id: 'text-track', kind: 'video', clips: [], captions: [], semantic_sidecar: { metadata: { workbench_role: 'text' } }, locks: [] };
      const sfx = { track_id: 'sfx-track', kind: 'audio', clips: [], captions: [], audio_routing: [], locks: [] };
      const current = { version: 2, sequence: { sequence_id: 'main', timebase: { value: 1n, timescale: 30n }, tracks: [] }, tracks: [main, pip, captions, text, music, sfx] };
      const state = {
        status: { project: 'test-project' }, authorityCurrent: true, timeline: current,
        workspace: { requests: [{ authorization: { request_id: 'test-request' }, drafts: [{ draft_id: 'test-draft', timeline_version: 2 }], timeline_annotations: [] }] },
        selectedRequestId: 'test-request', selectedDraftId: 'test-draft', selectedTimelineTrackId: 'video-main',
        selectedClip: { track_id: 'video-main', clip_id: 'video-clip', timeline_version: 2 },
        selectedCaption: { track_id: 'captions-track', caption_id: 'caption-1', timeline_version: 2 },
        displayedPreviewTimeline: null, displayedPreviewUrl: '', displayedPreviewBinding: null,
        timelineZoom: 0, timelineSnap: false, playheadTicks: 0n, pending: new Set(), precisionSources: [], forms: new Map(),
      };
      const captionUpdates = [], queuedAnnotations = [], audioMoves = [], captionMoves = [], clipTrims = [], captionTrims = [], clipSplits = [], captionSplits = [], clipRemovals = [], captionRemovals = [], effectRemovals = [], transitionSelections = [], transitionReplacements = [], transitionRemovals = [];
      const actions = {
        editAvailability: () => ({ undo: false, redo: false }),
        selectTimelineTrack() {}, selectClip() {}, selectCaption() {}, timelineSeek() {},
        moveTimelineClip: (...args) => audioMoves.push(args), moveTimelineCaption: (...args) => captionMoves.push(args),
        trimTimelineClipAt: (...args) => clipTrims.push(args), trimTimelineCaptionAt: (...args) => captionTrims.push(args),
        splitTimelineClipAt: (...args) => clipSplits.push(args), splitTimelineCaption: () => captionSplits.push(true),
        removeTimelineClip: (...args) => clipRemovals.push(args), removeTimelineCaption: (...args) => captionRemovals.push(args),
        removeTimelineEffect: (...args) => effectRemovals.push(args),
        selectTimelineTransition: (track, transition, version) => { transitionSelections.push([track.track_id, transition.transition_id, version]); state.selectedTransition = { track_id: track.track_id, transition_id: transition.transition_id, timeline_version: version }; state.selectedClip = null; panel.update(); },
        addTimelineTransitionAt: (...args) => transitionReplacements.push(args),
        removeTimelineTransition: (...args) => transitionRemovals.push(args),
        updateTimelineCaption: (...args) => captionUpdates.push(args),
        queueTimelineAnnotation: value => queuedAnnotations.push(value),
      };
      const inspector = document.createElement('aside');
      const panel = timelinePanel(actions, state, inspector);
      document.body.append(panel.node, inspector); panel.update();
      const audioBar = panel.node.querySelector('[data-track-id="music-track"].p4-timeline-clip');
      const captionBlock = panel.node.querySelector('.p4-timeline-caption');
      const targetAudioLane = panel.node.querySelector('[data-track-id="sfx-track"].p4-timeline-lane.audio');
      const targetCaptionLane = panel.node.querySelector('[data-track-id="text-track"].p4-timeline-lane.caption');
      const pipBar = panel.node.querySelector('[data-track-id="video-pip-1"].p4-timeline-clip');
      const audioTransfer = new DataTransfer();
      audioBar.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: audioTransfer }));
      targetAudioLane.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: audioTransfer, clientX: targetAudioLane.getBoundingClientRect().left + 50 }));
      targetAudioLane.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: audioTransfer, clientX: targetAudioLane.getBoundingClientRect().left + 50 }));
      const captionTransfer = new DataTransfer();
      captionBlock.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: captionTransfer }));
      targetCaptionLane.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: captionTransfer, clientX: targetCaptionLane.getBoundingClientRect().left + 50 }));
      targetCaptionLane.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: captionTransfer, clientX: targetCaptionLane.getBoundingClientRect().left + 50 }));
      audioBar.querySelector('.p4-clip-trim-handle.start').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      captionBlock.querySelector('.p4-clip-trim-handle.start').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      pipBar.querySelector('.p4-clip-trim-handle.start').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      const audioRect = audioBar.getBoundingClientRect();
      audioBar.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: audioRect.left + audioRect.width / 2, clientY: audioRect.top + 10 }));
      let menu = panel.node.querySelector('.p4-clip-context-menu');
      [...menu.querySelectorAll('[role="menuitem"]')].find(item => item.textContent.trim() === '在此分割')?.click();
      audioBar.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: audioRect.left + audioRect.width / 2, clientY: audioRect.top + 10 }));
      menu = panel.node.querySelector('.p4-clip-context-menu');
      [...menu.querySelectorAll('[role="menuitem"]')].find(item => item.textContent.trim() === '删除片段')?.click();
      const pipRect = pipBar.getBoundingClientRect();
      pipBar.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: pipRect.left + pipRect.width / 2, clientY: pipRect.top + 10 }));
      menu = panel.node.querySelector('.p4-clip-context-menu');
      [...menu.querySelectorAll('[role="menuitem"]')].find(item => item.textContent.trim() === '在此分割')?.click();
      pipBar.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: pipRect.left + pipRect.width / 2, clientY: pipRect.top + 10 }));
      menu = panel.node.querySelector('.p4-clip-context-menu');
      [...menu.querySelectorAll('[role="menuitem"]')].find(item => item.textContent.trim() === '删除片段')?.click();
      state.selectedClip = null;
      state.playheadTicks = 360n;
      panel.update();
      [...panel.node.querySelectorAll('.p4-timeline-operations button')].find(item => item.textContent.trim() === '在播放头分割')?.click();
      const captionInput = inspector.querySelector('[aria-label="文字或字幕内容"]');
      captionInput.value = '已修改字幕';
      captionInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      captionInput.dispatchEvent(new FocusEvent('blur'));
      const clip = panel.node.querySelector('[data-track-id="video-main"].p4-timeline-clip');
      clip.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 300, clientY: 300 }));
      menu = panel.node.querySelector('.p4-clip-context-menu');
      const menuItems = [...menu.querySelectorAll('[role="menuitem"]')].map(item => item.textContent.trim());
      const removeEffectVisible = menuItems.includes('移除效果');
      [...menu.querySelectorAll('[role="menuitem"]')].find(item => item.textContent.trim() === '移除效果')?.click();
      clip.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 300, clientY: 300 }));
      menu = panel.node.querySelector('.p4-clip-context-menu');
      const annotate = [...menu.querySelectorAll('[role="menuitem"]')].find(item => item.textContent.trim() === '添加时间线批注');
      annotate?.click();
      panel.node.querySelector('.p4-timeline-transition-marker')?.click();
      const transitionDuration = inspector.querySelector('[aria-label="转场精确时长（秒，可输入分数）"]');
      if (transitionDuration) transitionDuration.value = '1/3';
      [...inspector.querySelectorAll('button')].find(item => item.textContent.trim() === '替换交叉叠化时长')?.click();
      [...inspector.querySelectorAll('button')].find(item => item.textContent.trim() === '移除转场')?.click();
      state.selectedTransition = null; panel.update();
      inspector.querySelector('button.ghost')?.click();
      const result = { audioDraggable: audioBar.draggable, captionDraggable: captionBlock.draggable, audioMoveCount: audioMoves.length, audioMoveTarget: audioMoves[0]?.[1] ?? null, captionMoveCount: captionMoves.length, captionMoveTarget: captionMoves[0]?.[1] ?? null, audioTrim: clipTrims.filter(args => args[0] === 'music-clip').map(args => [args[0], args[1], String(args[2])]), pipTrim: clipTrims.filter(args => args[0] === 'pip-clip').map(args => [args[0], args[1], String(args[2])]), captionTrimCount: captionTrims.length, captionTrim: captionTrims[0] ? [captionTrims[0][0], captionTrims[0][1], String(captionTrims[0][2])] : null, audioSplit: clipSplits.filter(args => args[0] === 'music-clip').map(args => [args[0], String(args[1])]), pipSplit: clipSplits.filter(args => args[0] === 'pip-clip').map(args => [args[0], String(args[1])]), captionSplitCount: captionSplits.length, audioRemoval: clipRemovals.filter(args => args[1] === 'music-clip').length, pipRemoval: clipRemovals.filter(args => args[1] === 'pip-clip').length, captionRemovalCount: captionRemovals.length, captionUpdateCount: captionUpdates.length, removeEffectVisible, effectRemovalCount: effectRemovals.length, queuedAnnotationCount: queuedAnnotations.length, transitionSelections, transitionReplacementCount: transitionReplacements.length, transitionReplacement: transitionReplacements[0] ?? null, transitionRemovalCount: transitionRemovals.length };
      panel.destroy(); panel.node.remove(); inspector.remove();
      return result;
    })().catch(error => ({ harnessError: error?.stack ?? String(error) }))`);
    if (interactions.harnessError) throw new Error(`P4 interaction harness failed: ${interactions.harnessError}`);
    failingStep = "responsive-workspace-layout"; process.stderr.write("P4 step: responsive-workspace-layout\n");
    const responsive=[];
    browserWindow.webContents.debugger.attach("1.3");
    await browserWindow.webContents.debugger.sendCommand("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
    await browserWindow.webContents.executeJavaScript(`(()=>{const style=document.createElement('style');style.textContent='.product-shell{transition:none!important}';document.head.append(style)})()`);
    for(const width of [1440,1080,820,640,360]){
      browserWindow.webContents.setZoomFactor(1);
      await browserWindow.webContents.executeJavaScript(`document.querySelector('[data-project-focus-key="open"]')?.focus()`);
      await browserWindow.webContents.debugger.sendCommand("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: false });
      await browserWindow.webContents.executeJavaScript(`window.dispatchEvent(new Event('resize'))`);
      await browserWindow.webContents.executeJavaScript(`new Promise(resolve => setTimeout(resolve, 80))`);
      responsive.push(await browserWindow.webContents.executeJavaScript(`(()=>{const grid=document.querySelector('.product-shell');return {width:${width},hasHorizontalOverflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,navWidth:document.querySelector('.sidebar').getBoundingClientRect().width,projectVisible:!document.querySelector('.project-management-page').hidden,focusKey:document.activeElement?.dataset.projectFocusKey??''}})()`));
    }
    for(const zoom of [1.25,1.5]){
      browserWindow.webContents.setZoomFactor(zoom);
      await browserWindow.webContents.executeJavaScript(`document.querySelector('[data-project-focus-key="open"]')?.focus()`);
      await browserWindow.webContents.debugger.sendCommand("Emulation.setDeviceMetricsOverride", { width: Math.round(1024/zoom), height: 1000, deviceScaleFactor: 1, mobile: false });
      await browserWindow.webContents.executeJavaScript(`window.dispatchEvent(new Event('resize'))`);
      await browserWindow.webContents.executeJavaScript(`new Promise(resolve => setTimeout(resolve, 80))`);
      responsive.push(await browserWindow.webContents.executeJavaScript(`({zoom:${zoom},hasHorizontalOverflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,navWidth:document.querySelector('.sidebar').getBoundingClientRect().width,projectVisible:!document.querySelector('.project-management-page').hidden,focusKey:document.activeElement?.dataset.projectFocusKey??''})`));
    }
    failingStep = "export-page-layout-and-actions"; process.stderr.write("P4 step: export-page-layout-and-actions\n");
    browserWindow.webContents.setZoomFactor(1);
    await browserWindow.webContents.debugger.sendCommand("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    const exportModuleUrl = pathToFileURL(resolve(rendererRoot, "features/export-dialog.js")).href;
    const exportUi = await browserWindow.webContents.executeJavaScript(`(async () => {
      const { exportDialog } = await import(${JSON.stringify(exportModuleUrl)});
      const shell = document.querySelector('.product-shell');
      const projects = document.querySelector('.project-management-page');
      const component = exportDialog(async () => ({ ok: true }), async () => [], () => {});
      shell.dataset.page = 'export'; projects.hidden = true; projects.inert = true;
      component.node.classList.add('export-page'); shell.append(component.node); component.setPageMode(true);
      const cover = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="9"><rect width="16" height="9" fill="#dbe3e9"/></svg>');
      component.open({ project_id: 'test-project', request_id: 'test-request', draft_id: 'test-draft', render_id: 'test-render', timeline_version: 7, preview_qc: '通过', master_qc: '通过', cover });
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const panel = component.node.querySelector('.export-dialog'), form = component.node.querySelector('.export-form'), preview = component.node.querySelector('.export-preview-card');
      const desktopForm = form.getBoundingClientRect(), desktopPreview = preview.getBoundingClientRect();
      const navButton=shell.querySelector('[data-workspace-page="help"]'),navRect=navButton.getBoundingClientRect(),navHit=document.elementFromPoint(navRect.left+navRect.width/2,navRect.top+navRect.height/2);
      const desktop = { twoColumns: desktopPreview.left > desktopForm.left && desktopPreview.top < desktopForm.bottom, hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth, navigationReachable:navHit===navButton||navButton.contains(navHit) };
      window.__p4ExportComponent = component;
      return {
        role: panel.getAttribute('role'), ariaModal: panel.getAttribute('aria-modal'), heading: panel.querySelector('h1')?.textContent ?? '',
        eyebrow: panel.querySelector('.export-eyebrow')?.textContent ?? '', returnLabel: panel.querySelector('.export-dismiss')?.textContent ?? '',
        version: panel.querySelector('.export-version-summary h2')?.textContent ?? '', qc: panel.querySelector('.export-qc')?.innerText ?? '',
        previewAlt: panel.querySelector('.export-preview-frame img')?.alt ?? '', downloadLabel: panel.querySelector('.export-send')?.textContent ?? '',
        fakeSettings: panel.querySelectorAll('select,input').length, desktop, complete: true
      };
    })().catch(error => ({ harnessError: error?.stack ?? String(error) }))`);
    if (exportUi.harnessError) throw new Error(`Export page DOM harness failed: ${exportUi.harnessError}`);
    await browserWindow.webContents.debugger.sendCommand("Emulation.setDeviceMetricsOverride", { width: 360, height: 900, deviceScaleFactor: 1, mobile: false });
    await browserWindow.webContents.executeJavaScript(`window.dispatchEvent(new Event('resize'));new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))`);
    const exportMobile = await browserWindow.webContents.executeJavaScript(`(()=>{const form=document.querySelector('.export-form').getBoundingClientRect(),preview=document.querySelector('.export-preview-card').getBoundingClientRect(),layout=document.querySelector('.export-layout'),layoutRect=layout.getBoundingClientRect(),back=document.querySelector('.export-dismiss').getBoundingClientRect(),intro=document.querySelector('.export-page-heading p:not(.export-eyebrow)'),introRect=intro.getBoundingClientRect(),style=getComputedStyle(layout),template=style.gridTemplateColumns,columns=template.match(/(?:[^\\s()]|\\([^()]*\\))+/g)?.length??0;return {stacked:preview.top>=form.bottom,columns,template,breakpoint820:matchMedia('(max-width: 820px)').matches,layoutWithinViewport:layoutRect.right<=document.documentElement.clientWidth,hasHorizontalOverflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,returnButtonVisible:back.width>0&&back.left>=0&&back.right<=document.documentElement.clientWidth,introFits:intro.scrollWidth<=intro.clientWidth&&introRect.right<=document.documentElement.clientWidth}})()`);
    exportUi.mobile = exportMobile;
    exportUi.pageClose = await browserWindow.webContents.executeJavaScript(`(()=>{const component=window.__p4ExportComponent;component.node.querySelector('.export-dismiss').click();return {hidden:component.node.hidden,inert:component.node.inert,animations:component.node.querySelector('.export-dialog').getAnimations().length};})()`);
    await browserWindow.webContents.executeJavaScript(`(()=>{window.__p4ExportComponent?.close(true,false);window.__p4ExportComponent?.node.remove();window.__p4ExportComponent=null;const shell=document.querySelector('.product-shell');shell.dataset.page='projects';const projects=document.querySelector('.project-management-page');projects.hidden=false;projects.inert=false})()`);
    failingStep = "reduced-motion-preference"; process.stderr.write("P4 step: reduced-motion-preference\n");
    await browserWindow.webContents.debugger.sendCommand("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
    const reducedMotion = await browserWindow.webContents.executeJavaScript(`parseFloat(getComputedStyle(document.querySelector('[data-workspace-page="projects"]')).transitionDuration)`);
    await browserWindow.webContents.debugger.sendCommand("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
    failingStep = "recover-related-import-issues"; process.stderr.write("P4 step: recover-related-import-issues\n");
    const errorDialogUrl = pathToFileURL(resolve(rendererRoot, "components/error-dialog.js")).href;
    const importRecovery = await browserWindow.webContents.executeJavaScript(`(async () => {
      const { configureErrorJournal, reportError, resolveRecoveredImportIssues } = await import(${JSON.stringify(errorDialogUrl)});
      const projectId = 'import-recovery-project';
      const saved = [];
      let nextIssue = 0;
      configureErrorJournal({
        projectId: () => projectId,
        report: async (id, value) => {
          const issue = { ...value, issue_id: 'issue-' + (++nextIssue), project_id: id, revision: 1, count: 1, created_at: '2026-10-13T00:00:00.000Z', updated_at: '2026-10-13T00:00:00.000Z', status: 'open' };
          saved.push(issue);
          return structuredClone(issue);
        },
        list: async id => structuredClone(saved.filter(issue => issue.project_id === id)),
        acknowledge: async (id, request) => {
          const index = saved.findIndex(issue => issue.project_id === id && issue.issue_id === request.issue_id);
          if (index < 0 || saved[index].revision !== request.expected_revision) throw new Error('stale issue revision');
          saved[index] = { ...saved[index], revision: saved[index].revision + 1, status: request.status };
          return structuredClone(saved[index]);
        },
      });
      const failures = [
        { code: 'WORKER_HANDLER_FAILED', message: 'moov atom not found' },
        { code: 'MEDIA_SOURCE_REQUIRED', message: '失败上传的临时文件已清理，请重新选择该失败项的来源' },
      ];
      for (const failure of failures) reportError(failure.code + ': clip.mp4：' + failure.message, { operation_type: 'media.import' });
      reportError('MEDIA_SOURCE_REQUIRED: other.mp4：另一个素材仍需重新选择来源', { operation_type: 'media.import' });
      reportError('TIMELINE_EDIT_FAILED: 字幕修改失败', { operation_type: 'timeline.edit' });
      const resolvedCount = await resolveRecoveredImportIssues({ project_id: projectId, items: [{ display_name: 'clip.mp4', status: 'imported', issues: failures.map(error => ({ attempt: 1, error })) }] });
      return { resolvedCount, issues: saved.map(({ code, message, operation_type, status, revision }) => ({ code, message, operation_type, status, revision })) };
    })().catch(error => ({ harnessError: error?.stack ?? String(error) }))`);
    if (importRecovery.harnessError) throw new Error(`Import issue recovery failed: ${importRecovery.harnessError}`);
    failingStep="global-chat-and-active-page-layout";process.stderr.write("P4 step: active-layout\n");
    await browserWindow.webContents.debugger.sendCommand("Emulation.setDeviceMetricsOverride", { width:1440,height:1000,deviceScaleFactor:1,mobile:false });
    const workbenchModuleUrl=pathToFileURL(resolve(rendererRoot,"workbench/workbench.js")).href;
    const activeUi=await browserWindow.webContents.executeJavaScript(`(async()=>{
      const {mountWorkbench}=await import(${JSON.stringify(workbenchModuleUrl)});
      const fixture=window.__p4WorkbenchFixture,originalQuery=window.projectApi.query,originalCommand=window.projectApi.command;
      let uiVersion=0,uiValue=null;const commands=[];
      fixture.timeline.tracks=[{track_id:'video-main',kind:'video',clips:[],captions:[],effects:[],transitions:[],locks:[]}];
      window.projectApi.query=async request=>{const type=request.query_type;let data;
        if(type==='app.status')data={project:'test-project',timeline:'2',render:'idle',qc:'not-run',model_service:null};
        else if(type==='app.projects.recent'||type==='app.projects.recycle-bin')data={items:[]};
        else if(type==='project.creation.ui')data={version:uiVersion,value:uiValue};
        else if(type==='project.creation.workspace')data=fixture.workspace;
        else if(type==='project.creation.timeline')data=fixture.timeline;
        else if(type==='project.audio.library')data={pack_id:'fixture',pack_version:'1',pack_digest:'fixture',items:[]};
        else if(type==='project.media.list')data=[{asset_id:'layout-audio',asset_location_id:'layout-original',location_type:'original',media_kind:'audio',display_name:'layout-tone.wav',permission_state:'registered'}];
        else if(type==='project.media.browse')data={asset_id:'layout-audio',kind:'audio',time_mapping:'blocked',audio_status:'absent',reference:'layout-browse',url:'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YQIAAAAAAA=='};
        else if(['project.jobs.list','project.media.import-batches','project.issues.list'].includes(type))data=[];
        else throw new Error('unexpected active UI fixture query '+type);
        return {ok:true,data:structuredClone(data)};
      };
      window.projectApi.command=async request=>{commands.push(request);if(request.command_type==='project.media.browse.release')return {ok:true,data:{}};if(request.command_type==='project.creation.ui.save'){uiValue=structuredClone(request.payload.value);return {ok:true,data:{version:++uiVersion,value:uiValue}};}throw new Error('unexpected active UI fixture command '+request.command_type);};
      document.getElementById('app').hidden=true;const root=document.createElement('div');root.id='p4-active-fixture';document.body.append(root);const mounted=mountWorkbench(root);await mounted.refresh();
      const bubble=root.querySelector('.chat-bubble-toggle'),popover=root.querySelector('.fine-chat-popover'),composer=root.querySelector('.creation-composer textarea');
      if(!popover.hidden)bubble.click();const collapsed=popover.hidden;bubble.click();const opened=!popover.hidden;
      composer.value='跨页面保留的中文草稿';composer.dispatchEvent(new Event('input',{bubbles:true}));composer.setSelectionRange(2,5);
      const pages=[];for(const page of ['creation','assets','precision','history','issues','projects','recycle','help']){root.querySelector('[data-workspace-page="'+page+'"]').click();await Promise.resolve();pages.push({page,active:root.querySelector('.product-shell').dataset.page,shared:root.querySelector('.creation-composer textarea')===composer,value:composer.value,chatVisible:!root.querySelector('.global-chat').hidden,overflow:document.documentElement.scrollWidth>innerWidth});}
      root.querySelector('[data-workspace-page="creation"]').click();
      const before=bubble.getBoundingClientRect();bubble.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));const after=bubble.getBoundingClientRect();
      await new Promise(resolve=>setTimeout(resolve,320));
      const positionSaved=commands.some(command=>command.payload?.value?.forms?.[JSON.stringify(['test-project','','composer-position'])]);
      window.__p4ActiveUi={root,mounted,originalQuery,originalCommand};
      return {collapsed,opened,pages,moved:after.left<before.left,positionSaved,oneComposer:root.querySelectorAll('.creation-composer').length,oneLog:root.querySelectorAll('.conversation-log').length,legacyLayouts:root.querySelectorAll('.navigation-rail,.story-sidebar,.dock-composer,.editor-desk').length};
    })().catch(error=>({harnessError:error.stack??String(error)}))`);
    if(activeUi.harnessError)throw new Error(activeUi.harnessError);
    
    // DOM pointer-handler regression; OS pointer capture is stubbed in the hidden window.
    // This is not native current-build interaction acceptance.
    activeUi.pointerDrag=await browserWindow.webContents.executeJavaScript("(()=>{const root=window.__p4ActiveUi.root,bubble=root.querySelector('.chat-bubble-toggle'),before=bubble.getBoundingClientRect(),capture=bubble.setPointerCapture,hasCapture=bubble.hasPointerCapture;try{bubble.setPointerCapture=()=>{};bubble.hasPointerCapture=()=>false;const x=before.left+20,y=before.top+20;for(const [type,dx,dy]of [['pointerdown',0,0],['pointermove',-70,-65],['pointerup',-70,-65]])bubble.dispatchEvent(new PointerEvent(type,{pointerId:51,button:0,buttons:type==='pointerup'?0:1,clientX:x+dx,clientY:y+dy,bubbles:true}));const after=bubble.getBoundingClientRect();return {moved:after.left<before.left-50&&after.top<before.top-50,opened:!root.querySelector('.fine-chat-popover').hidden};}finally{bubble.setPointerCapture=capture;bubble.hasPointerCapture=hasCapture;}})()");
    const activeLayouts=[];
    for(const width of [1440,1080,820,640,360]){
      await browserWindow.webContents.debugger.sendCommand("Emulation.setDeviceMetricsOverride",{width,height:1000,deviceScaleFactor:1,mobile:false});
      for(const page of ["creation","assets","precision","history","issues","projects","recycle","help"]){
        const geometry=await browserWindow.webContents.executeJavaScript(`(async()=>{const root=window.__p4ActiveUi.root;root.querySelector('[data-workspace-page="${page}"]').click();window.dispatchEvent(new Event('resize'));await new Promise(resolve=>setTimeout(resolve,30));const chat=root.querySelector('.fine-chat-popover').getBoundingClientRect();return {page:'${page}',width:${width},overflow:document.documentElement.scrollWidth>innerWidth,chatFits:chat.left>=0&&chat.right<=innerWidth&&chat.top>=0&&chat.bottom<=innerHeight}})()`);
        activeLayouts.push(geometry);
      }
    }
    const sourceLayouts=[];
    for(const width of [1440,820,360]){
      await browserWindow.webContents.debugger.sendCommand("Emulation.setDeviceMetricsOverride",{width,height:1000,deviceScaleFactor:1,mobile:false});
      for(const hidden of [false,true]){
        const geometry=await browserWindow.webContents.executeJavaScript(`(async()=>{const root=window.__p4ActiveUi.root;root.querySelector('[data-workspace-page="assets"]').click();const grid=root.querySelector('.product-shell');if(grid.classList.contains('navigation-hidden')!==${hidden})root.querySelector('[data-action="toggle-nav"]').click();root.querySelector('.media-row').click();const start=Date.now();while(!root.querySelector('.source-player audio')){if(Date.now()-start>3000)throw new Error('source layout fixture missing audio');await new Promise(resolve=>setTimeout(resolve,20));}await new Promise(resolve=>requestAnimationFrame(resolve));const nodes=[root.querySelector('.source-preview-overlay'),root.querySelector('.source-player audio'),root.querySelector('.source-player .panel-heading button')];const rectangles=nodes.map(node=>node.getBoundingClientRect().toJSON());root.querySelector('.source-player .panel-heading button').click();return {width:${width},navigationHidden:${hidden},rectangles,returned:root.querySelector('.workspace-editor').hidden};})()`);
        sourceLayouts.push(geometry);
      }
    }
    const sourceImageControls=[];
    await browserWindow.webContents.executeJavaScript(`(()=>{const root=window.__p4ActiveUi.root;if(!root.querySelector('.fine-chat-popover').hidden)root.querySelector('.chat-close').click();if(!root.querySelector('.fine-chat-popover').hidden)throw new Error('image-control test requires collapsed chat');const prior=window.projectApi.query;const canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;canvas.getContext('2d').fillRect(0,0,640,360);const url=canvas.toDataURL('image/png');window.projectApi.query=async request=>request.query_type==='project.media.browse'?{ok:true,data:{asset_id:'layout-audio',kind:'image',time_mapping:'blocked',audio_status:'absent',reference:'layout-image',url}}:prior(request);})()`);
    for(const width of [1440,820,360]){
      await browserWindow.webContents.debugger.sendCommand("Emulation.setDeviceMetricsOverride",{width,height:1000,deviceScaleFactor:1,mobile:false});
      for(const hidden of [false,true]){
        const controls=await browserWindow.webContents.executeJavaScript(`(async()=>{const root=window.__p4ActiveUi.root;root.querySelector('[data-workspace-page="assets"]').click();const grid=root.querySelector('.product-shell');if(grid.classList.contains('navigation-hidden')!==${hidden})root.querySelector('[data-action="toggle-nav"]').click();root.querySelector('.media-row').click();const start=Date.now();while(!root.querySelector('.source-player-stage img')?.complete){if(Date.now()-start>3000)throw new Error('source image fixture missing');await new Promise(resolve=>setTimeout(resolve,20));}const stage=root.querySelector('.source-player-stage'),zoom=stage.querySelector('input'),reset=stage.querySelector('button'),results=[];for(const scale of [1.5,4]){zoom.value=String(scale);zoom.dispatchEvent(new Event('input',{bubbles:true}));await new Promise(resolve=>requestAnimationFrame(resolve));const hits=[],diagnostics=[];for(const control of [zoom,reset,stage.lastElementChild]){control.scrollIntoView({block:'nearest'});const r=control.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);hits.push(hit===control||control.contains(hit));diagnostics.push({control:control.textContent,rect:r.toJSON(),hit:hit?.outerHTML.slice(0,250)});}reset.click();results.push({scale,hits,diagnostics,reset:zoom.value});}root.querySelector('.source-player .panel-heading button').click();return {width:${width},navigationHidden:${hidden},results};})()`);
        sourceImageControls.push(controls);
      }
    }
    await browserWindow.webContents.debugger.sendCommand("Emulation.setDeviceMetricsOverride",{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
    process.stderr.write("P4 step: capture\n");
    if(process.env.AVE_P4_SCREENSHOT_DIR){
      for(const page of ["creation","precision","history","assets","issues","projects","recycle","help"]){await browserWindow.webContents.executeJavaScript(`window.__p4ActiveUi.root.querySelector('[data-workspace-page="${page}"]').click();window.dispatchEvent(new Event('resize'));new Promise(resolve=>setTimeout(resolve,60))`);await browserWindow.webContents.capturePage();await new Promise(resolve=>setTimeout(resolve,120));const capture=await browserWindow.webContents.capturePage();await writeFile(resolve(process.env.AVE_P4_SCREENSHOT_DIR,`fixture-${page}.png`),capture.toPNG());}
    }
    await browserWindow.webContents.executeJavaScript(`(()=>{const value=window.__p4ActiveUi;value.mounted.destroy();value.root.remove();window.projectApi.query=value.originalQuery;window.projectApi.command=value.originalCommand;document.getElementById('app').hidden=false})()`);
    browserWindow.webContents.debugger.detach();
    return { workbench, annotationUi, timeline, interactions, responsive, exportUi, reducedMotion, importRecovery, activeUi, activeLayouts, sourceLayouts, sourceImageControls, rendererErrors };
  } catch (error) {
    throw new Error(`P4 DOM harness failed at ${failingStep}; renderer errors: ${JSON.stringify(rendererErrors)}; cause: ${error?.stack ?? error}`, { cause: error });
  } finally {
    await rm(tempRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
}

let isolatedRendererResult;
function launchIsolatedRenderer() { return isolatedRendererResult ??= runIsolatedRenderer(); }
async function runIsolatedRenderer() {
  const electron = resolve(repositoryRoot, "node_modules/electron/dist", process.platform === "win32" ? "electron.exe" : "electron");
  const launcherRoot = await mkdtemp(resolve(tmpdir(), "ave-p4-workbench-launcher-"));
  try {
    const launcher = resolve(launcherRoot, "electron-p4-workbench.cjs");
    await writeFile(launcher, `import(${JSON.stringify(pathToFileURL(testFile).href)}).catch(error => { console.error(error); process.exitCode = 1; });`);
    const child = spawn(electron, ["--no-sandbox", "--disable-gpu", launcher, "--ave-p4-workbench-harness"], {
      cwd: repositoryRoot,
      env: {...process.env,AVE_P4_USER_DATA:resolve(launcherRoot,"electron-user-data")},
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", chunk => { stdout += chunk; });
    child.stderr.on("data", chunk => { stderr += chunk; });
    const exitCode = await new Promise((resolveExit, reject) => {
      const timer = setTimeout(() => { child.kill(); reject(new Error(`P4 Electron renderer harness timed out.\nstdout:\n${stdout}\nstderr:\n${stderr}`)); }, 30000);
      child.on("close", code => { clearTimeout(timer); resolveExit(code); });
      child.on("error", error => { clearTimeout(timer); reject(error); });
    });
    const line = stdout.split(/\r?\n/).find(value => value.startsWith("AVE_P4_WORKBENCH "));
    assert.ok(line, `P4 renderer result missing.\nstdout:\n${stdout}\nstderr:\n${stderr}`);
    assert.equal(exitCode, 0, `P4 renderer harness exited with ${exitCode}.\nstdout:\n${stdout}\nstderr:\n${stderr}`);
    return JSON.parse(line.slice("AVE_P4_WORKBENCH ".length));
  } finally {
    await rm(launcherRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
}

if (electronHarnessMode) {
  runElectronHarness().then(result => {
    process.stdout.write(`AVE_P4_WORKBENCH ${JSON.stringify(result)}\n`);
    void import("electron").then(({ app }) => app.quit());
  }).catch(error => {
    process.stderr.write(`AVE_P4_WORKBENCH_ERROR ${error?.stack ?? error}\n`);
    process.exitCode = 1;
    void import("electron").then(({ app }) => app.quit());
  });
} else {
  test("official Renderer entry mounts and responds to real navigation DOM events", async () => {
    const result = await launchIsolatedRenderer();
    assert.equal(result.workbench.mounted, true);
    assert.equal(result.exportUi.desktop.navigationReachable,true,"the page export surface does not intercept navigation pointer events");
    assert.deepEqual(result.exportUi.pageClose,{hidden:true,inert:true,animations:0},"page navigation completes immediately without waiting on modal animation scheduling");
    assert.equal(result.workbench.initialHidden, false);
    assert.equal(result.workbench.hiddenAfterClick, true, "the navigation hide control changes the mounted workspace");
    assert.equal(result.workbench.restoredHidden, false, "the navigation can be restored by another user click");
    assert.deepEqual(result.workbench.routes, ["creation", "assets", "precision", "history", "issues", "projects", "recycle", "help", "export"], "the mounted Renderer exposes all nine production routes");
    assert.deepEqual(result.workbench.helpResult, { visible: true, hasShortcut: true, activeRoute: "page", composerCount: 1 }, "Help is a real page, the active route is announced, and the workspace keeps one shared composer");
    assert.deepEqual(result.workbench.recycleResult, { visible: true, hasEmptyState: true, activeRoute: "page" }, "Recycle Bin is an independent route with its real empty state");
    assert.deepEqual(result.workbench.projectResult, { visible: true, title: "作品管理", hasProjectActions: true, activeRoute: "page", focusedActionAfterResize: "open" }, "Projects is a real page and retains the focused action after responsive re-layout");
    assert.deepEqual({ role: result.exportUi.role, ariaModal: result.exportUi.ariaModal, heading: result.exportUi.heading, eyebrow: result.exportUi.eyebrow, returnLabel: result.exportUi.returnLabel, version: result.exportUi.version, hasQc: /预览检查：通过/.test(result.exportUi.qc) && /成片检查：通过/.test(result.exportUi.qc), previewAlt: result.exportUi.previewAlt, downloadAction: /^(下载成片|选择位置并导出)$/.test(result.exportUi.downloadLabel), fakeSettings: result.exportUi.fakeSettings, desktopColumns: result.exportUi.desktop.twoColumns, desktopOverflow: result.exportUi.desktop.hasHorizontalOverflow, mobileStacked: result.exportUi.mobile.stacked, mobileColumns: result.exportUi.mobile.columns, mobileWithinViewport: result.exportUi.mobile.layoutWithinViewport, mobileOverflow: result.exportUi.mobile.hasHorizontalOverflow, mobileReturnVisible: result.exportUi.mobile.returnButtonVisible, mobileIntroFits: result.exportUi.mobile.introFits }, { role: "region", ariaModal: "false", heading: "导出作品", eyebrow: "工作区 / 输出", returnLabel: "返回创作", version: "作品 v7", hasQc: true, previewAlt: "作品 v7 的实际预览帧", downloadAction: true, fakeSettings: 0, desktopColumns: true, desktopOverflow: false, mobileStacked: true, mobileColumns: 1, mobileWithinViewport: true, mobileOverflow: false, mobileReturnVisible: true, mobileIntroFits: true }, "the formal export route matches the demo page composition while exposing only the selected real version, QC, preview, and download action; mobile metrics: " + JSON.stringify(result.exportUi.mobile));
    assert.equal(result.responsive.length, 7, "the current workbench is measured at five window widths and two zoom levels");
    assert.equal(result.responsive.every(item => item.hasHorizontalOverflow === false), true, `responsive layouts do not overflow horizontally: ${JSON.stringify(result.responsive)}`);
    assert.equal(result.responsive.every(item => item.projectVisible && item.focusKey === "open"), true, `the project page and keyboard focus survive resizing and zoom changes: ${JSON.stringify(result.responsive)}`);
    assert.deepEqual(result.responsive.map(item => item.navWidth), [184,150,56,56,56,56,56], `the reference-width navigation collapses to icon-only widths at responsive breakpoints: ${JSON.stringify(result.responsive)}`);
    assert.ok(result.reducedMotion <= 0.00001, `reduced-motion preference shortens transitions (observed ${result.reducedMotion}s)`);
    assert.deepEqual(result.annotationUi, { failedComposerPreserved:true, annotationDialogResult:{savedBody:"新的批注正文",closed:true}, buttonVisible: true, clickedOperationId: "11111111-1111-4111-8111-111111111111", composerState: { focused: true, value: "保留光标与未发送输入", selectedText: "留光标", persisted: "保留光标与未发送输入" } }, "the shared composer preserves real input, selection and focus across workspace updates while failed batches remain editable");
    assert.deepEqual(result.importRecovery, { resolvedCount: 2, issues: [
      { code: "WORKER_HANDLER_FAILED", message: "clip.mp4：moov atom not found", operation_type: "media.import", status: "resolved", revision: 2 },
      { code: "MEDIA_SOURCE_REQUIRED", message: "clip.mp4：失败上传的临时文件已清理，请重新选择该失败项的来源", operation_type: "media.import", status: "resolved", revision: 2 },
      { code: "MEDIA_SOURCE_REQUIRED", message: "other.mp4：另一个素材仍需重新选择来源", operation_type: "media.import", status: "open", revision: 1 },
      { code: "TIMELINE_EDIT_FAILED", message: "字幕修改失败", operation_type: "timeline.edit", status: "open", revision: 1 },
    ] }, "successful retry resolves every exact historical issue for that source and preserves other open issues");
    assert.deepEqual(result.rendererErrors, [], "all production Renderer modules load without hidden JavaScript errors");
  });

  test("watching an older render does not disable edits or truncate the blank time domain", async () => {
    const result = await launchIsolatedRenderer();
    assert.deepEqual({
      editorMode: result.timeline.editorMode,
      visibleAtTwentySeconds: result.timeline.visibleAtTwentySeconds,
      rulerEndTicks: result.timeline.rulerEndTicks,
      seeksPastClipEnd: BigInt(result.timeline.soughtTicks ?? "0") > 360n,
      currentVersion: result.timeline.currentVersion,
      previewVersion: result.timeline.previewVersion,
      keepsViewingOlderVersion: /当前编辑 v2 · 正在观看 v1/.test(result.timeline.editVersion ?? ""),
    }, { editorMode: "editable", visibleAtTwentySeconds: true, rulerEndTicks: "600", seeksPastClipEnd: true, currentVersion: 2, previewVersion: 1, keepsViewingOlderVersion: true }, "the old render remains a watch target while edits and placements stay on the current Timeline");
  });

  test("audio and subtitle clips support real drag gestures", async () => {
    const result = await launchIsolatedRenderer();
    assert.deepEqual({ audio: result.interactions.audioDraggable, subtitle: result.interactions.captionDraggable }, { audio: true, subtitle: true }, "both audio and subtitle timeline objects expose a real drag gesture");
    assert.deepEqual({ audioMoves: result.interactions.audioMoveCount, audioTarget: result.interactions.audioMoveTarget, captionMoves: result.interactions.captionMoveCount, captionTarget: result.interactions.captionMoveTarget }, { audioMoves: 1, audioTarget: "sfx-track", captionMoves: 1, captionTarget: "text-track" }, "native DOM dragstart/dragover/drop gestures route audio and caption objects to their actual target tracks exactly once");
    assert.deepEqual({ audioTrim: result.interactions.audioTrim, pipTrim: result.interactions.pipTrim, captionTrim: result.interactions.captionTrim, audioSplit: result.interactions.audioSplit.length, pipSplit: result.interactions.pipSplit.length, audioRemove: result.interactions.audioRemoval, pipRemove: result.interactions.pipRemoval, captionSplit: result.interactions.captionSplitCount, captionRemove: result.interactions.captionRemovalCount }, { audioTrim: [["music-clip", "start", "1"]], pipTrim: [["pip-clip", "start", "1"]], captionTrim: ["caption-1", "start", "301"], audioSplit: 1, pipSplit: 1, audioRemove: 1, pipRemove: 1, captionSplit: 1, captionRemove: 1 }, "keyboard trim, context-menu split/delete, and selected-caption split/delete all reach one real edit action per gesture for audio, PiP, and text");
  });

  test("subtitle Enter and blur commit once, and an applied effect can be removed", async () => {
    const result = await launchIsolatedRenderer();
    assert.deepEqual({ captionUpdateCount: result.interactions.captionUpdateCount, removeEffectVisible: result.interactions.removeEffectVisible, effectRemovalCount: result.interactions.effectRemovalCount, transitionSelections: result.interactions.transitionSelections, transitionReplacementCount: result.interactions.transitionReplacementCount, transitionReplacement: result.interactions.transitionReplacement, transitionRemovalCount: result.interactions.transitionRemovalCount }, { captionUpdateCount: 1, removeEffectVisible: true, effectRemovalCount: 1, transitionSelections: [["video-main", "transition-1", 2]], transitionReplacementCount: 1, transitionReplacement: ["video-clip", "1/3"], transitionRemovalCount: 1 }, "subtitle edits commit once, effect removal is actionable, and a selected transition exposes replacement and removal actions");
  });

  test("timeline context menu adds an annotation through the actual DOM event path", async () => {
    const result = await launchIsolatedRenderer();
    assert.equal(result.interactions.queuedAnnotationCount, 1, "a clip context-menu click produces one anchored annotation");
  });

  test("annotation guidance requires one combined request and structured feedback context", async () => {
    const result = await launchIsolatedRenderer();
    assert.match(result.workbench.annotationHelp, /填写整体要求后一次提交/);
    assert.match(result.workbench.annotationHelp, /独立结构化上下文进入当前创作流程/);
    assert.doesNotMatch(result.workbench.annotationHelp, /不发送给创作模型/);
  });

  test("one movable global conversation survives every page and narrow layouts",async()=>{
    const result=await launchIsolatedRenderer();
    assert.deepEqual({...result.activeUi,pages:undefined},{collapsed:true,opened:true,pages:undefined,moved:true,positionSaved:true,oneComposer:1,oneLog:1,legacyLayouts:0,pointerDrag:{moved:true,opened:true}});
    assert.ok(result.activeUi.pages.every(item=>item.active===item.page&&item.shared&&item.value==='跨页面保留的中文草稿'&&item.chatVisible&&!item.overflow),JSON.stringify(result.activeUi.pages));
    assert.equal(result.activeLayouts.length,40);
    assert.ok(result.activeLayouts.every(item=>!item.overflow&&item.chatFits),JSON.stringify(result.activeLayouts));
    assert.equal(result.sourceImageControls.length,6);
    assert.ok(result.sourceImageControls.every(item=>item.results.every(value=>value.hits.every(Boolean)&&value.reset==='1')),JSON.stringify(result.sourceImageControls));
    assert.equal(result.sourceLayouts.length,6);
    assert.ok(result.sourceLayouts.every(item=>item.returned&&item.rectangles.every(rect=>rect.width>0&&rect.height>0&&rect.left>=0&&rect.right<=item.width&&rect.top>=0&&rect.bottom<=1000)),JSON.stringify(result.sourceLayouts));
  });
}
