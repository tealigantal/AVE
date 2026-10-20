const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

let toastTimer;
let playing = false;
let undoStack = [];
let redoStack = [];
let selectedClip = '山路';
let selectedShot = '01';
let chatScope = 'project';
let timelineRevision = 3;
let annotationSequence = 0;
let annotationEditingId = null;
let pendingAnnotationEditingId = null;
let pendingAnnotations = [];
let timelineItemSequence = 0;
let playheadFrame = 120;
let pixelsPerSecond = 90;
let renderedTimelineEndFrame = 0;
let annotationDraft = null;
let contextTarget = null;
let magnetEnabled = true;
let chatHistory = [];
let skipChatToggleClick = false;
const FPS = 30;
const TRACK_LABEL_WIDTH = 94;
const TIMELINE_TAIL_FRAMES = FPS * 8;
const SNAP_THRESHOLD_PX = 8;
const TRANSITION_DROP_RADIUS_PX = 14;
const EFFECT_PRESETS = [
  { id: 'grayscale', engineKind: 'grayscale', name: '灰度', group: '基础画面', look: 'grayscale', description: '移除彩色信息，保留画面亮度层次。仓库已有此效果的渲染映射。', tags: ['基础', '已接入渲染'] },
  { id: 'blackwhite', engineKind: 'blackwhite', name: '黑白', group: '基础画面', look: 'blackwhite', description: '将画面转换为黑白效果。仓库当前将它与灰度编译为相同的去色滤镜。', tags: ['基础', '已接入渲染'] },
  { id: 'blur', engineKind: 'blur', name: '模糊', group: '基础画面', look: 'blurred', description: '对画面应用模糊。仓库已有此效果的渲染映射；当前注册效果没有强度参数。', tags: ['基础', '已接入渲染'] },
  { id: 'soft-glow', name: '柔光晕染', group: '氛围光效', look: 'glow', description: '提亮高光并柔化边缘，适合清晨、逆光和人物镜头。', intensity: 62, tags: ['氛围', '人像'] },
  { id: 'light-leak', name: '暖色漏光', group: '氛围光效', look: 'leak', description: '在画面边缘加入暖色漏光，营造自然的胶片感。', intensity: 48, tags: ['氛围', '暖调'] },
  { id: 'film-grain', name: '细腻胶片颗粒', group: '复古质感', look: 'grain', description: '叠加可控的细颗粒纹理，避免过度锐化的数码观感。', intensity: 32, tags: ['复古', '胶片'] },
  { id: 'rgb-split', name: 'RGB 色散', group: '故障动态', look: 'rgb', description: '分离边缘色彩，可用于短促转场或节奏强调。', intensity: 42, tags: ['故障', '节奏'] },
  { id: 'radial-blur', name: '径向动感模糊', group: '故障动态', look: 'blur', description: '从画面中心向外拉出速度感，适合运动和推进镜头。', intensity: 38, tags: ['动感', '模糊'] },
  { id: 'soft-focus', name: '镜头柔焦', group: '基础画面', look: 'focus', description: '轻微降低细节锐度，保留主体轮廓和画面层次。', intensity: 28, tags: ['柔焦', '人像'] },
  { id: 'vignette', name: '电影暗角', group: '基础画面', look: 'vignette', description: '压暗画面边缘，让视线集中到主体区域。', intensity: 36, tags: ['电影感', '氛围'] },
  { id: 'prism', name: '棱镜折射', group: '风格效果', look: 'prism', description: '在边缘加入轻微棱镜折射和虹彩高光。', intensity: 45, tags: ['折射', '风格'] }
];
const FINE_RESOURCES = [
  { id: 'trail-video', kind: 'video', name: '山间步道.mp4', details: '视频 · 00:12', art: 'landscape', duration: FPS * 12, style: 'clip-a' },
  { id: 'lake-video', kind: 'video', name: '湖边晨光.mp4', details: '视频 · 00:08', art: 'lake', duration: FPS * 8, style: 'clip-b' },
  { id: 'flower-image', kind: 'image', name: '山茶花.jpg', details: '图片 · 静帧', art: 'meadow', duration: FPS * 5, style: 'clip-c' },
  { id: 'ambient-audio', kind: 'audio', name: '环境声.wav', details: '音频 · 00:24', art: 'audio-thumb', duration: FPS * 24, style: 'audio-clip' },
  { id: 'bird-sfx', kind: 'sfx', name: '林间鸟鸣.wav', details: '音效 · 00:08', art: 'audio-thumb', duration: FPS * 8, style: 'sfx-clip' },
  { id: 'caption-resource', kind: 'caption', name: '新字幕', details: '文字 · 字幕轨', art: 'caption-art', duration: FPS * 3, style: 'subtitle-clip' },
  { id: 'text-resource', kind: 'text', name: '标题文字', details: '文字 · 文字轨', art: 'text-art', duration: FPS * 3, style: 'overlay-clip' },
  ...EFFECT_PRESETS.map(effect => ({ id: effect.id, kind: 'effect', effectId: effect.id, name: effect.name, details: `${effect.group} · ${effect.engineKind ? '仓库有渲染映射' : '未注册，暂不可拖入'}`, art: `effect-art ${effect.look}`, effect })),
  { id: 'dissolve-transition', kind: 'transition', transitionKind: 'cross_dissolve', name: '叠化', details: '转场 · 拖到相邻视频片段的剪辑点', art: 'transition-art', duration: FPS / 2 },
  { id: 'fade-transition', kind: 'transition', transitionKind: 'fade', name: '片段边界淡入淡出', details: '片段自身的边界淡化 · 不是剪辑点转场', art: 'transition-art fade', duration: FPS / 2 }
];
let activeFineResourceTab = 'media';
let selectedFineResource = null;
let draggingFineResourceId = null;
let resourceDropPreviewRow = null;
let timelineTransitions = [];
let selectedTransitionId = null;
let transitionDropPreviewElement = null;
const tracks = [
  { id: 'text-sticker', label: '文字 / 贴纸', type: 'overlay', icon: 'T', clips: [] },
  { id: 'effects', label: '特效', type: 'overlay', icon: '✧', clips: [] },
  { id: 'video', label: '主视频', type: 'video', icon: '▰', clips: [
    { id: 'video-lake', name: '湖面', start: 0, duration: 90, style: 'clip-a' },
    { id: 'video-road', name: '山路', start: 90, duration: 90, style: 'clip-b' },
    { id: 'video-woods', name: '林间', start: 180, duration: 120, style: 'clip-c' }
  ] },
  { id: 'captions', label: '字幕', type: 'caption', icon: '文', clips: [{ id: 'caption-main', name: '春天的风，刚刚好', start: 0, duration: FPS * 12, style: 'subtitle-clip' }] },
  { id: 'music', label: '配乐', type: 'audio', icon: '♫', clips: [{ id: 'music-bed', name: '背景配乐 · 音量与淡化', start: 0, duration: FPS * 12, style: 'audio-clip' }] },
  { id: 'sfx', label: '音效', type: 'audio', icon: '♪', clips: [{ id: 'sfx-bird', name: '林间鸟鸣音效', start: 180, duration: 90, style: 'sfx-clip' }] }
];
let selected = { trackId: 'video', clipId: 'video-road' };
let trimGesture = null;

function notify(message, isError = false) {
  const region = $('#toastRegion');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', isError ? 'alert' : 'status');
  toast.textContent = message;
  if (!isError) {
    toast.style.borderColor = '#b8d8fb';
    toast.style.color = '#235c94';
  }
  region.replaceChildren(toast);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.add('leaving');
    setTimeout(() => toast.remove(), 320);
  }, 2000);
}

function showScreen(name) {
  $$('.screen').forEach(screen => screen.classList.toggle('active', screen.id === `screen-${name}`));
  $$('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.screen === name));
  $('.main').scrollTop = 0;
  if (name === 'fine') requestAnimationFrame(drawPlayhead);
  updateChatContext();
}

$$('[data-screen]').forEach(button => {
  button.addEventListener('click', () => showScreen(button.dataset.screen));
});

$('#toggleWorkspace').addEventListener('click', event => {
  const hidden = $('.shell').classList.toggle('workspace-hidden');
  event.currentTarget.setAttribute('aria-pressed', String(hidden));
  event.currentTarget.textContent = hidden ? '显示工作区' : '隐藏工作区';
});

$('#stateSelect').addEventListener('change', event => {
  const states = {
    ready: ['可播放', '正在观看：v3 · 春日漫步'],
    empty: ['空项目 · 等待素材', '新作品 · 空项目'],
    imported: ['素材已导入', '春日漫步 · 已导入素材'],
    saved: ['已保存 · 待制作', '春日漫步 · 等待制作'],
    making: ['正在制作 · 模拟进度', '春日漫步 · 正在制作'],
    failed: ['操作失败 · 可查看恢复提示', '春日漫步 · 上一可用版本仍保留'],
    reopen: ['已恢复 · 演示状态', '春日漫步 · 已恢复工作区']
  };
  const [label, title] = states[event.target.value];
  $('#workState').textContent = label;
  $('#workState').hidden = event.target.value === 'failed';
  const isEmpty = event.target.value === 'empty';
  $('#videoFrame').hidden = isEmpty;
  $('#emptyPrompt').hidden = !isEmpty;
  $('#shotRow').hidden = isEmpty;
  $('#saveState').textContent = event.target.value === 'saved' ? '已保存 · 演示数据' : '演示数据';
  $('#createTitle').textContent = title;
  if (event.target.value === 'failed') notify('制作没有完成。上一可观看版本仍保留；可以打开“问题与恢复”查看原因和下一步。', true);
  else if (event.target.value === 'empty') notify('这是空项目演示。进入“素材”导入和整理素材，再到精修轨道编辑。');
  else if (event.target.value === 'imported') notify('素材已导入素材库；进入精修轨道后可放入对应轨道（演示）。');
  else if (event.target.value === 'saved') notify('修改已保存。可以继续描述调整，或进入精修轨道。');
  else if (event.target.value === 'making') notify('正在制作 · 演示进度不会执行真实任务。');
  else if (event.target.value === 'reopen') notify('已恢复输入草稿、观看版本和问题历史（模拟）。');
  else notify(`状态已切换：${label}`);
});

function togglePlay() {
  playing = !playing;
  $$('.play-button').forEach(button => { button.textContent = playing ? 'Ⅱ' : '▶'; });
  $('#playControl').textContent = playing ? 'Ⅱ　暂停' : '▶　播放';
  notify(playing ? '模拟播放中' : '模拟播放已暂停');
}
$$('.play-button').forEach(button => button.addEventListener('click', togglePlay));
$('#playControl').addEventListener('click', togglePlay);

$('#previewPosition').addEventListener('input', event => {
  playheadFrame = Math.max(0, Math.round(Number(event.target.value) * FPS));
  drawPlayhead();
});

$$('[data-shot]').forEach(shot => shot.addEventListener('click', () => {
  selectedShot = shot.dataset.shot;
  $$('[data-shot]').forEach(item => {
    const isSelected = item === shot;
    item.classList.toggle('active', isSelected);
    item.setAttribute('aria-pressed', String(isSelected));
  });
  chatScope = 'current';
  updateChatContext();
}));
$$('[data-shot-scope="project"]').forEach(button => button.addEventListener('click', () => setChatScope('project')));
$$('[data-chat-scope]').forEach(button => button.addEventListener('click', () => setChatScope(button.dataset.chatScope)));

const CHAT_HISTORY_KEY = 'ave-p4-workbench-chat-v2';
const PENDING_ANNOTATIONS_KEY = 'ave-p4-workbench-pending-annotations-v1';
const INITIAL_CHAT_HISTORY = [
  { kind: 'message', role: 'assistant', text: '这版把山路镜头放在中段，节奏比较舒缓。你可以继续告诉我想调整的地方。' },
  { kind: 'message', role: 'user', text: '把开头的湖面镜头再多停留一秒。' },
  { kind: 'message', role: 'assistant', text: '收到。你可以保存这条修改意图，或进入精修轨道调整镜头时长。' }
];
function persistChatHistory() {
  try { localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(chatHistory)); }
  catch { notify('对话无法保存到浏览器本地；当前页面仍保留这段对话。', true); }
}
function persistPendingAnnotations() {
  try { localStorage.setItem(PENDING_ANNOTATIONS_KEY, JSON.stringify(pendingAnnotations)); }
  catch { notify('待发送批注无法保存在浏览器本地；当前页面仍保留它们。', true); }
}
function restoreChatHistory() {
  try {
    const stored = JSON.parse(localStorage.getItem(CHAT_HISTORY_KEY) || '[]');
    if (Array.isArray(stored)) chatHistory = stored.filter(item => item && (item.kind === 'message' || item.kind === 'annotation'));
    if (!chatHistory.length) chatHistory = INITIAL_CHAT_HISTORY.map(item => ({ ...item }));
    const pending = JSON.parse(localStorage.getItem(PENDING_ANNOTATIONS_KEY) || '[]');
    if (Array.isArray(pending)) pendingAnnotations = pending.filter(item => item?.kind === 'annotation' && item?.metadata && item?.body);
    annotationSequence = allAnnotations().reduce((max, item) => Math.max(max, Number(item.annotationId?.split('-').at(-1)) || 0), 0);
    renderChatHistory();
    renderPendingAnnotations();
  } catch { notify('本地对话记录无法读取；继续显示本页初始对话。', true); }
}
function allAnnotations() {
  return [
    ...chatHistory.filter(item => item.kind === 'annotation'),
    ...chatHistory.flatMap(item => item.kind === 'message' && Array.isArray(item.annotations) ? item.annotations : []),
    ...pendingAnnotations
  ];
}
function annotationAnchorLabel(item) {
  const metadata = item.metadata;
  const surface = metadata.surfaceLabel ? `${metadata.surfaceLabel} · ` : '';
  return `${surface}${metadata.trackLabel}${metadata.clipLabel ? ` · ${metadata.clipLabel}` : ''}　${metadata.timecode}`;
}
function createAnnotationAnchor(item, className = 'annotation-anchor') {
  const anchor = document.createElement('button'); anchor.type = 'button'; anchor.className = className;
  anchor.textContent = annotationAnchorLabel(item);
  anchor.title = '跳转到批注锚定的片段与时间'; anchor.onclick = () => jumpToAnnotation(item);
  return anchor;
}
function renderChatHistory() {
  const list = $('#messageList'); list.replaceChildren();
  for (const item of chatHistory) {
    if (item.kind === 'annotation') {
      const message = document.createElement('article'); message.className = 'annotation-message';
      const header = document.createElement('header');
      const label = document.createElement('strong'); label.textContent = '页面批注';
      const actions = document.createElement('div'); actions.className = 'annotation-actions';
      const edit = document.createElement('button'); edit.type = 'button'; edit.textContent = '编辑'; edit.onclick = () => editAnnotation(item);
      const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = '删除'; remove.onclick = () => deleteAnnotation(item.annotationId);
      actions.append(edit, remove); header.append(label, actions);
      const anchor = createAnnotationAnchor(item);
      const text = document.createElement('p'); text.textContent = item.body.commentText;
      message.append(header, anchor, text); list.append(message);
    } else {
      const message = document.createElement('article'); message.className = `message ${item.role === 'assistant' ? 'assistant' : 'user'}`;
      message.textContent = item.text;
      if (item.role === 'user' && item.scopeLabel) { const scope = document.createElement('small'); scope.textContent = `调整范围：${item.scopeLabel}`; message.append(scope); }
      if (item.role === 'user' && Array.isArray(item.annotations) && item.annotations.length) {
        message.classList.add('message-with-annotations');
        const attachments = document.createElement('div'); attachments.className = 'message-annotation-list';
        const heading = document.createElement('strong'); heading.textContent = `页面批注 · ${item.annotations.length} 条`;
        attachments.append(heading);
        for (const annotation of item.annotations) {
          const card = document.createElement('div'); card.className = 'message-annotation-card';
          card.append(createAnnotationAnchor(annotation));
          const note = document.createElement('span'); note.textContent = annotation.body.commentText;
          card.append(note); attachments.append(card);
        }
        message.append(attachments);
      }
      if (item.role === 'assistant') { const note = document.createElement('small'); note.textContent = '回复为演示内容 · 不会调用模型'; message.append(note); }
      list.append(message);
    }
  }
  list.scrollTop = list.scrollHeight;
}
function renderPendingAnnotations() {
  const panel = $('#pendingAnnotations');
  if (!panel) return;
  const items = $('#pendingAnnotationItems'); items.replaceChildren();
  $('#pendingAnnotationCount').textContent = String(pendingAnnotations.length);
  panel.hidden = pendingAnnotations.length === 0;
  for (const annotation of pendingAnnotations) {
    const card = document.createElement('article'); card.className = 'pending-annotation-card';
    const summary = document.createElement('div'); summary.className = 'pending-annotation-summary';
    summary.append(createAnnotationAnchor(annotation, 'annotation-anchor pending-annotation-anchor'));
    const note = document.createElement('p'); note.textContent = annotation.body.commentText; summary.append(note);
    const actions = document.createElement('div'); actions.className = 'pending-annotation-actions';
    const edit = document.createElement('button'); edit.type = 'button'; edit.textContent = '编辑'; edit.onclick = () => editPendingAnnotation(annotation);
    const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = '移除'; remove.onclick = () => removePendingAnnotation(annotation.annotationId);
    actions.append(edit, remove); card.append(summary, actions); items.append(card);
  }
}
function openAnnotationDialog() {
  const dialog = $('#annotationDialog');
  if (!dialog.open) dialog.showModal();
  requestAnimationFrame(() => $('#annotationInput').focus());
}
function editAnnotation(item) {
  annotationEditingId = item.annotationId;
  pendingAnnotationEditingId = null;
  annotationDraft = { timelineVersion: item.metadata.sourceTimelineVersion, trackId: item.metadata.trackId,
    trackLabel: item.metadata.trackLabel, clipId: item.metadata.clipId, clipLabel: item.metadata.clipLabel,
    clipOffsetFrames: item.metadata.clipOffsetFrames, frame: item.metadata.position.value };
  $('#annotationDialogTitle').textContent = '编辑页面批注';
  $('#sendAnnotation').textContent = '保存修改';
  $('#annotationAnchor').textContent = `${item.metadata.trackLabel}${item.metadata.clipLabel ? ` · ${item.metadata.clipLabel}` : ''} · ${item.metadata.timecode}`;
  $('#annotationRevision').textContent = `v${item.metadata.sourceTimelineVersion}`;
  $('#annotationInput').value = item.body.commentText;
  openAnnotationDialog();
}
function editPendingAnnotation(item) {
  annotationEditingId = null;
  pendingAnnotationEditingId = item.annotationId;
  annotationDraft = deepCopy(item.metadata);
  annotationDraft.frame = annotationDraft.position.value;
  $('#annotationDialogTitle').textContent = '编辑待发送批注';
  $('#annotationAnchor').textContent = annotationAnchorLabel(item);
  $('#annotationRevision').textContent = `v${item.metadata.sourceTimelineVersion}`;
  $('#annotationInput').value = item.body.commentText;
  $('#sendAnnotation').textContent = '保存批注';
  openAnnotationDialog();
}
function removePendingAnnotation(annotationId) {
  pendingAnnotations = pendingAnnotations.filter(item => item.annotationId !== annotationId);
  persistPendingAnnotations(); renderPendingAnnotations(); renderTimeline();
  notify('已从待发送列表移除；其他批注仍保留。');
}
function resolvePendingAnnotations() {
  const resolved = [];
  for (const [index, item] of pendingAnnotations.entries()) {
    const metadata = item.metadata;
    const originalTrack = tracks.find(track => track.id === metadata.trackId);
    const clipTrack = metadata.clipId && tracks.find(track => track.clips.some(clip => clip.id === metadata.clipId));
    const clip = clipTrack?.clips.find(value => value.id === metadata.clipId);
    if (metadata.clipId && !clip) return { error: `第 ${index + 1} 条批注对应的片段已不存在。请移除这条批注后重新定位。` };
    if (!metadata.clipId && !originalTrack) return { error: `第 ${index + 1} 条批注对应的轨道已不存在。请移除这条批注后重新定位。` };
    if (clip && (!Number.isInteger(metadata.clipOffsetFrames) || metadata.clipOffsetFrames < 0 || metadata.clipOffsetFrames >= clip.duration)) {
      return { error: `第 ${index + 1} 条批注的原位置已被修剪。请移除这条批注后重新定位。` };
    }
    const track = clipTrack || originalTrack;
    const frame = clip ? clip.start + metadata.clipOffsetFrames : metadata.position.value;
    resolved.push({ ...deepCopy(item), metadata: { ...metadata, timelineVersion: timelineRevision,
      trackId: track.id, trackLabel: track.label, clipId: clip?.id || null, clipLabel: clip?.name || null,
      position: { value: frame, timescale: FPS }, timecode: frameLabel(frame) } });
  }
  return { annotations: resolved };
}
function deleteAnnotation(annotationId) {
  if (!confirm('删除这条页面批注？')) return;
  chatHistory = chatHistory.filter(item => item.kind !== 'annotation' || item.annotationId !== annotationId);
  renderChatHistory(); persistChatHistory(); renderTimeline();
}
function jumpToAnnotation(item) {
  const metadata = item.metadata;
  const anchoredTrack = tracks.find(track => track.clips.some(clip => clip.id === metadata.clipId))
    || tracks.find(track => track.id === metadata.trackId);
  if (!anchoredTrack) return notify('批注对应的轨道已删除，无法跳转。', true);
  const clip = metadata.clipId ? anchoredTrack.clips.find(value => value.id === metadata.clipId) : null;
  if (metadata.clipId && !clip) return notify('批注对应的片段已删除，无法跳转。', true);
  const offset = Number.isInteger(metadata.clipOffsetFrames) ? metadata.clipOffsetFrames : 0;
  if (clip && offset >= clip.duration) return notify('批注锚点所在的片段区间已被修剪，请重新定位。', true);
  playheadFrame = clip ? clip.start + offset : metadata.position.value;
  selected = { trackId: anchoredTrack.id, clipId: clip?.id || '' };
  showScreen('fine'); renderTimeline();
  const viewport = $('#timelineViewport');
  viewport.scrollLeft = Math.max(0, TRACK_LABEL_WIDTH + playheadFrame / FPS * pixelsPerSecond - viewport.clientWidth / 2);
  $(`.track-row[data-track-id="${CSS.escape(anchoredTrack.id)}"]`)?.scrollIntoView({ block: 'nearest' });
  if (clip) $(`[data-clip-id="${CSS.escape(clip.id)}"]`)?.scrollIntoView({ block: 'nearest', inline: 'center' });
}
restoreChatHistory();
$('#sendMessage').addEventListener('click', () => {
  const input = $('#oneInput');
  const typedText = input.value.trim();
  if (!typedText && !pendingAnnotations.length) {
    notify('先描述你想调整的内容。', true);
    input.focus();
    return;
  }
  const scopeLabel = currentScopeLabel();
  if (scopeLabel === '未选中镜头或片段') { notify('先选择一个镜头或片段，或切换到“整部作品”。', true); return; }
  const text = typedText || '请根据附带的批注调整当前作品。';
  const resolution = resolvePendingAnnotations();
  if (resolution.error) { notify(resolution.error, true); return; }
  const annotations = resolution.annotations;
  chatHistory.push({ kind: 'message', role: 'user', text, scopeLabel, ...(annotations.length ? { annotations } : {}) },
    { kind: 'message', role: 'assistant', text: annotations.length
      ? `已模拟处理${scopeLabel}的调整要求和 ${annotations.length} 条页面批注；批注标记已从当前页面撤下。这里是交互演示，本页不会调用真实模型或修改作品。`
      : `已收到针对${scopeLabel}的演示调整要求。真实产品会由创作流程处理；本页面不会调用模型。` });
  pendingAnnotations = [];
  persistPendingAnnotations();
  renderChatHistory(); persistChatHistory();
  input.value = '';
  renderPendingAnnotations(); renderTimeline();
  $('#fineChatPopover').hidden = false;
  $('#toggleFineChat').setAttribute('aria-expanded', 'true');
  notify(annotations.length ? `${scopeLabel}要求与 ${annotations.length} 条批注已放入本页演示对话；未调用模型。` : `针对${scopeLabel}的消息仅在本页演示，没有发送到模型。`);
});
$('#clearPendingAnnotations').addEventListener('click', () => {
  if (!pendingAnnotations.length) return;
  pendingAnnotations = []; persistPendingAnnotations(); renderPendingAnnotations(); renderTimeline();
  notify('已清空待发送批注。');
});

function escapeHtml(value) {
  const node = document.createElement('span');
  node.textContent = value;
  return node.innerHTML;
}
$('#oneInput').addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    $('#sendMessage').click();
  }
});

$('#thumbSize').addEventListener('input', event => {
  const size = Number(event.target.value);
  $('#assetCards').style.gridTemplateColumns = `repeat(auto-fit, minmax(${size}px, 1fr))`;
  $('#thumbValue').textContent = size;
});
$('#gallerySize').addEventListener('input', event => {
  $('#galleryArea').style.setProperty('--tile', `${event.target.value}px`);
});
$('#mediaView').addEventListener('change', event => {
  $('#galleryArea').classList.toggle('list-view', event.target.value === 'list');
  $('#galleryArea').classList.toggle('compact-view', event.target.value === 'compact');
});

$$('.media-card').forEach(card => card.addEventListener('click', () => {
  $$('.media-card').forEach(item => item.classList.toggle('selected', item === card));
  notify(`已选中 ${card.dataset.name}，缩略图仅为演示画面。`);
}));
$$('.media-tabs:not(.catalog-tabs)').forEach(tabs => $$('.media-tabs button', tabs).forEach((button, index) => {
  button.addEventListener('click', () => {
    if (button.hasAttribute('data-media-source')) return;
    $$('.media-tabs button', tabs).forEach(item => item.classList.toggle('selected', item === button));
    if (tabs.classList.contains('big')) {
      const kind = ['all', 'video', 'image', 'audio'][index];
      $$('.gallery-card').forEach(card => { card.hidden = kind !== 'all' && card.dataset.kind !== kind; });
    } else {
      const kind = ['all', 'video', 'image', 'audio'][index];
      $$('.media-card').forEach(card => { card.hidden = kind !== 'all' && card.dataset.kind !== kind; });
    }
  });
}));
$$('.category').forEach((button, index) => button.addEventListener('click', () => {
  $$('.category').forEach(item => item.classList.toggle('selected', item === button));
  const category = button.dataset.category;
  $$('.gallery-card').forEach(card => { card.hidden = category !== 'all' && category !== 'local' && category !== 'recent'; });
  if (!['all', 'local', 'recent'].includes(category)) notify('此来源仅展示目录入口；当前未连接素材服务。');
  else if (category === 'recent') notify('最近使用的演示素材已显示。');
}));
$$('[data-library-kind]').forEach(button => button.addEventListener('click', () => {
  $$('[data-library-kind]').forEach(item => item.classList.toggle('selected', item === button));
  const kind = button.dataset.libraryKind;
  $('.media-content').hidden = false;
  $('#audioCatalog').hidden = true;
  $('#mediaTitle').textContent = '素材';
  $('#mediaDescription').textContent = '管理当前作品素材；时间线使用请进入“精修轨道”。';
  $('#importMedia2').hidden = false;
  $('.source-tabs').hidden = false;
  $('.media-toolbar .state-label').hidden = false;
  $('.thumb-size.inline').hidden = false;
  $('#mediaSearch').placeholder = '搜索素材名称';
  const mapped = kind;
  const supported = ['all', 'video', 'image', 'audio', 'sfx'].includes(kind);
  $$('.gallery-card').forEach(card => { card.hidden = !supported || (mapped !== 'all' && card.dataset.kind !== mapped); });
  let empty = $('#libraryEmpty');
  if (!empty) {
    empty = document.createElement('div');
    empty.id = 'libraryEmpty'; empty.className = 'library-empty';
    $('#galleryArea').append(empty);
  }
  empty.hidden = supported;
  empty.textContent = `${button.textContent}素材分类入口 · 当前没有连接对应资源目录。接入后可在这里收藏、管理和复用素材。`;
}));
$('#mediaSearch').addEventListener('input', event => {
  const query = event.target.value.trim().toLocaleLowerCase();
  const kind = $('[data-library-kind].selected')?.dataset.libraryKind || 'all';
  const supported = ['all', 'video', 'image', 'audio', 'sfx'].includes(kind);
  $$('.gallery-card').forEach(card => { card.hidden = !supported || (kind !== 'all' && kind !== card.dataset.kind) || !card.dataset.name.toLocaleLowerCase().includes(query); });
  $('#libraryEmpty').hidden = supported;
  if (!supported) $('#libraryEmpty').textContent = `${$('[data-library-kind].selected').textContent}素材分类入口 · 当前没有连接对应资源目录。`;
  $$('.catalog-card').forEach(card => { card.hidden = !card.textContent.toLocaleLowerCase().includes(query); });
});
$$('.gallery-card').forEach(card => card.addEventListener('click', event => {
  if (card.dataset.name.endsWith('.wav')) notify('音频预览入口（演示），不会播放素材文件。');
  else notify(`正在预览 ${card.dataset.name} 的演示缩略图。`);
}));
function addEffectToTimeline(effect, targetVideo = null) {
  if (!effect?.engineKind) return notify(`“${effect?.name || '此效果'}”在仓库中没有注册的渲染映射，不能加入时间线。`, true);
  const selectedItem = selectedRecord();
  const video = targetVideo || (selectedItem.clip && selectedItem.track?.id === 'video' ? selectedItem.clip : tracks.find(item => item.id === 'video')?.clips.find(item => playheadFrame >= item.start && playheadFrame < item.start + item.duration));
  if (!video) return notify('先选中一个视频片段，再添加特效。', true);
  let effectTrack = tracks.find(item => item.id === 'effects');
  const createTrack = !effectTrack;
  if (createTrack) effectTrack = { id: 'effects', label: '特效', type: 'overlay', icon: '✧', clips: [] };
  const item = { id: `effect-${effect.id}-${++timelineItemSequence}`, name: effect.name, effectId: effect.engineKind, effectVersion: '1', look: effect.previewLook || effect.look || null, targetClipId: video.id, start: video.start, duration: video.duration, style: 'effect-clip' };
  recordEdit(`添加特效“${effect.name}”`, () => { if (createTrack) insertOptionalTrack(effectTrack); effectTrack.clips.push(item); selected = { trackId: effectTrack.id, clipId: item.id }; });
  notify(`已把“${effect.name}”放入特效轨道示意；本页不连接 Project Host 或渲染器。`);
}
function renderFineResources() {
  const root = $('#fineResourceCards'); if (!root) return;
  root.replaceChildren();
  const visible = FINE_RESOURCES.filter(resource => activeFineResourceTab === 'media'
    ? !['effect', 'transition'].includes(resource.kind)
    : resource.kind === (activeFineResourceTab === 'effects' ? 'effect' : 'transition'));
  for (const resource of visible) {
    const card = document.createElement('button'); card.type = 'button'; card.className = 'fine-resource-card';
    const canDrag = resource.kind === 'effect' ? Boolean(resource.effect?.engineKind)
      : resource.kind === 'transition' ? resource.transitionKind === 'cross_dissolve'
        : true;
    card.draggable = canDrag;
    card.dataset.resourceId = resource.id; card.dataset.resourceKind = resource.kind;
    const targetName = resource.kind === 'transition' ? '相邻视频片段的剪辑点' : resource.kind === 'effect' ? '视频片段或特效轨道' : `${OPTIONAL_TRACKS[resourceTrackId(resource)]?.label || '视频'}轨道`;
    card.setAttribute('aria-label', `${canDrag ? '拖动' : '不可拖入'}${resource.name}到${targetName}`);
    if (!canDrag) {
      card.classList.add('unavailable-resource'); card.setAttribute('aria-disabled', 'true');
      card.title = resource.kind === 'effect' ? '仓库没有此效果的注册映射，暂不可应用' : '片段边界淡入淡出由片段属性表达，不是两个镜头之间的转场';
    }
    if (selectedFineResource === resource.id) card.classList.add('selected');
    const art = document.createElement('i'); art.className = `fine-resource-art ${resource.art}`; art.setAttribute('aria-hidden', 'true');
    if (resource.kind === 'audio' || resource.kind === 'sfx') art.textContent = '♫';
    if (resource.kind === 'caption') art.textContent = '文';
    if (resource.kind === 'text') art.textContent = 'T';
    if (resource.kind === 'transition') art.textContent = '↔';
    const name = document.createElement('strong'); name.textContent = resource.name;
    const details = document.createElement('small'); details.textContent = resource.details;
    card.append(art, name, details);
    card.addEventListener('click', () => {
      selectedFineResource = resource.id;
      $$('.fine-resource-card').forEach(item => item.classList.toggle('selected', item === card));
      if (!canDrag) return notify(resource.kind === 'effect'
        ? `“${resource.name}”没有仓库渲染映射，目前不能应用。`
        : '片段边界淡入淡出通过片段属性表达，不是剪辑点转场；本 demo 暂未提供该属性操作。', true);
      notify(resource.kind === 'transition'
        ? `拖动“${resource.name}”到主视频轨相邻片段的剪辑点。`
        : `已选择“${resource.name}”，拖到适用的视频或对应轨道。`);
    });
    card.addEventListener('dragstart', event => {
      if (!canDrag) { event.preventDefault(); return; }
      selectedFineResource = resource.id;
      draggingFineResourceId = resource.id;
      showResourceDropPreview(resource);
      event.dataTransfer.effectAllowed = 'copy';
      event.dataTransfer.setData('application/x-ave-demo-resource', resource.id);
      event.dataTransfer.setData('text/plain', resource.id);
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', () => {
      draggingFineResourceId = null;
      resourceDropPreviewRow?.remove(); resourceDropPreviewRow = null;
      card.classList.remove('dragging');
      $$('.track-lane').forEach(lane => lane.classList.remove('resource-drop-target', 'resource-drop-invalid'));
      clearTransitionDropPreview(); setSnapGuide(null);
    });
    root.append(card);
  }
}
$$('[data-fine-resource-tab]').forEach(tab => tab.addEventListener('click', () => {
  activeFineResourceTab = tab.dataset.fineResourceTab;
  $$('[data-fine-resource-tab]').forEach(item => item.classList.toggle('selected', item === tab));
  renderFineResources();
}));
$$('[data-media-source]').forEach(button => button.addEventListener('click', () => {
  $$('[data-media-source]').forEach(item => item.classList.toggle('selected', item === button));
  const audio = button.dataset.mediaSource === 'audio-catalog';
  $('#mediaTitle').textContent = '素材';
  $('#mediaDescription').textContent = '管理当前作品素材；时间线使用请进入“精修轨道”。';
  $('#importMedia2').hidden = false;
  $('.source-tabs').hidden = false;
  $('.media-content').hidden = audio;
  $('#audioCatalog').hidden = !audio;
  $('#mediaSearch').placeholder = audio ? '搜索音频名称' : '搜索素材名称';
  $('.media-toolbar .state-label').hidden = audio;
  $('.thumb-size.inline').hidden = audio;
}));
$$('.catalog-tabs button').forEach((button, index) => button.addEventListener('click', () => {
  $$('.catalog-tabs button').forEach(item => item.classList.toggle('selected', item === button));
  const kind = ['all', 'music', 'sfx'][index];
  $$('.catalog-card').forEach(card => { card.hidden = kind !== 'all' && card.dataset.kind !== kind; });
}));
$$('.catalog-preview').forEach(button => button.onclick = () => notify('音频试听为界面示意；没有播放真实音频。'));
$('#importMedia').onclick = $('#importMedia2').onclick = $('#emptyImport').onclick = () => {
  $('#stateSelect').value = 'imported';
  $('#stateSelect').dispatchEvent(new Event('change'));
  notify('已模拟导入到素材库；未打开文件或写入项目。进入精修轨道后可使用项目素材。');
};

const deepCopy = value => JSON.parse(JSON.stringify(value));
function timelineEndFrame(excludedClipId = null) {
  return tracks.reduce((end, track) => track.clips.reduce((trackEnd, clip) => clip.id === excludedClipId ? trackEnd : Math.max(trackEnd, clip.start + clip.duration), end), Math.max(0, playheadFrame));
}
function formatDuration(frame) {
  const totalSeconds = Math.ceil(frame / FPS);
  const hours = Math.floor(totalSeconds / 3600), minutes = Math.floor(totalSeconds / 60) % 60, seconds = totalSeconds % 60;
  return hours ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}` : `${String(Math.floor(totalSeconds / 60)).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
function frameLabel(frame) {
  const f = Math.max(0, Math.round(frame));
  const totalSeconds = Math.floor(f / FPS), hours = Math.floor(totalSeconds / 3600), minutes = Math.floor(totalSeconds / 60) % 60, seconds = totalSeconds % 60, ff = f % FPS;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(ff).padStart(2, '0')}`;
}
function selectedRecord() {
  const track = tracks.find(item => item.id === selected.trackId);
  return { track, clip: track?.clips.find(item => item.id === selected.clipId) };
}
function currentScopeLabel() {
  if (chatScope === 'project') return '整部作品';
  if ($('#screen-fine').classList.contains('active')) {
    const { track, clip } = selectedRecord();
    return clip ? `${track.label} · ${clip.name} · ${frameLabel(clip.start)}–${frameLabel(clip.start + clip.duration)}` : '未选中镜头或片段';
  }
  return selectedShot ? `镜头 ${selectedShot}` : '未选中镜头或片段';
}
function setChatScope(scope) {
  chatScope = scope === 'current' ? 'current' : 'project';
  updateChatContext();
}
function updateChatContext() {
  const context = currentScopeLabel();
  $('#inputContext').textContent = context;
  $('#fineChatContext').textContent = context;
  $('#oneInput').placeholder = chatScope === 'project'
    ? '描述整部作品的调整要求；可与待发送批注一起提交…'
    : '描述当前镜头或片段的调整要求；可与待发送批注一起提交…';
  $$('[data-chat-scope]').forEach(button => {
    const selectedScope = button.dataset.chatScope === chatScope;
    button.classList.toggle('selected', selectedScope);
    button.setAttribute('aria-pressed', String(selectedScope));
  });
  $$('[data-shot-scope]').forEach(button => {
    const selectedScope = chatScope === 'project';
    button.classList.toggle('active', selectedScope);
    button.setAttribute('aria-pressed', String(selectedScope));
  });
}
function timelineTickStep() {
  return [1, 2, 3, 5, 10, 15, 30, 60, 90, 120, 150, 300, 600].find(step => step / FPS * pixelsPerSecond >= 76) || 600;
}
function renderTimelineRuler(endFrame = renderedTimelineEndFrame) {
  const ruler = $('#timelineRuler'), viewport = $('#timelineViewport');
  if (!ruler || !viewport) return;
  ruler.replaceChildren();
  const step = timelineTickStep();
  const startPixel = Math.max(0, viewport.scrollLeft - TRACK_LABEL_WIDTH);
  const endPixel = Math.max(startPixel, viewport.scrollLeft + viewport.clientWidth - TRACK_LABEL_WIDTH);
  const first = Math.max(0, Math.floor(startPixel / pixelsPerSecond * FPS / step) * step - step);
  const last = Math.min(endFrame, Math.ceil(endPixel / pixelsPerSecond * FPS / step) * step + step);
  for (let frame = first; frame <= last; frame += step) {
    const tick = document.createElement('span');
    tick.textContent = step < FPS ? `${String(Math.floor(frame / FPS)).padStart(2, '0')}:${String(frame % FPS).padStart(2, '0')}` : frameLabel(frame).slice(3, 8);
    tick.title = `${frameLabel(frame)}（${frame} 帧）`;
    tick.style.left = `${TRACK_LABEL_WIDTH + frame / FPS * pixelsPerSecond}px`;
    ruler.append(tick);
  }
}
$('#timelineViewport').addEventListener('scroll', () => renderTimelineRuler(), { passive: true });
function captionClip() { return tracks.find(track => track.id === 'captions')?.clips.find(clip => playheadFrame >= clip.start && playheadFrame < clip.start + clip.duration) || null; }
function applyCaptionStyle(clip, node) {
  const style = clip?.captionStyle || {};
  node.style.fontFamily = style.fontFamily || 'system-ui, sans-serif';
  node.style.fontSize = `${style.fontSize || 18}px`;
  node.style.color = style.color || '#ffffff';
  node.style.fontWeight = style.bold ? '700' : '500';
}
function renderCaptionText() {
  const clip = captionClip(), text = clip?.name || '';
  $$('.caption').forEach(node => {
    if (node !== document.activeElement) node.textContent = text;
    node.dataset.clipId = clip?.id || '';
    applyCaptionStyle(clip, node);
  });
  const context = $('#captionInspectorContext');
  if (context) context.textContent = clip ? `当前字幕：${clip.name}` : '当前时间没有字幕片段';
  if (clip) syncCaptionInspector(clip);
}
function syncCaptionInspector(clip = captionClip()) {
  if (!clip) return;
  const style = clip.captionStyle || {};
  $('#captionFont').value = style.fontFamily || 'system-ui, sans-serif';
  $('#captionSize').value = String(style.fontSize || 18);
  $('#captionSizeValue').value = $('#captionSizeValue').textContent = String(style.fontSize || 18);
  $('#captionColor').value = style.color || '#ffffff';
  $('#captionBold').checked = Boolean(style.bold);
}
function renderInspectorEffect(effectId) {
  const art = $('#fineVideoFrame .demo-landscape');
  if (!art) return;
  art.style.filter = ['grayscale', 'blackwhite'].includes(effectId) ? 'grayscale(1)' : effectId === 'blur' ? 'blur(4px)' : '';
  $('#fineVideoFrame').classList.remove('preview-vignette');
}
function refreshInspectorFromTimeline() {
  const current = tracks.find(track => track.id === 'video')?.clips.find(clip => playheadFrame >= clip.start && playheadFrame < clip.start + clip.duration);
  const effect = tracks.find(track => track.id === 'effects')?.clips.find(item => item.targetClipId === current?.id && playheadFrame >= item.start && playheadFrame < item.start + item.duration);
  if (!effect) { renderInspectorEffect('none', 0); return; }
  const mapping = ['grayscale', 'blackwhite', 'blur'].includes(effect.effectId) ? effect.effectId : 'none';
  $('#previewEffect').value = mapping;
  renderInspectorEffect(mapping);
}
function commitCaptionEdit(editor) {
  const clip = tracks.find(track => track.id === 'captions')?.clips.find(item => item.id === editor.dataset.clipId);
  if (!clip) { editor.textContent = ''; return notify('字幕轨道已删除；重新添加字幕轨道后才能编辑。', true); }
  const value = editor.textContent.trim();
  if (!value) { editor.textContent = clip.name; return notify('字幕不能为空。', true); }
  if (value === clip.name) return;
  recordEdit('修改字幕', () => { clip.name = value; selected = { trackId: 'captions', clipId: clip.id }; });
}
$$('[data-edit-caption]').forEach(editor => {
  editor.addEventListener('input', () => {
    const text = editor.textContent;
    $$('.caption').forEach(node => { if (node !== editor) node.textContent = text; });
  });
  editor.addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); editor.blur(); }
    if (event.key === 'Escape') { event.preventDefault(); editor.textContent = captionClip()?.name || ''; editor.blur(); }
  });
  editor.addEventListener('blur', () => commitCaptionEdit(editor));
});
function saveCaptionStyle(patch, label) {
  const clip = captionClip();
  if (!clip) return notify('当前播放头没有字幕；请先在字幕轨道添加一条字幕。', true);
  recordEdit(label, () => { clip.captionStyle = { ...(clip.captionStyle || {}), ...patch }; selected = { trackId: 'captions', clipId: clip.id }; });
}
$('#toggleInspector').addEventListener('click', event => {
  const inspector = $('#previewInspector'), content = $('.fine-preview-content');
  const collapsed = inspector.classList.toggle('collapsed');
  content.classList.toggle('inspector-collapsed', collapsed);
  event.currentTarget.setAttribute('aria-expanded', String(!collapsed));
  event.currentTarget.setAttribute('aria-label', collapsed ? '展开画面设置' : '收起画面设置');
  event.currentTarget.lastElementChild.textContent = collapsed ? '›' : '‹';
});
$('#toggleFineResources').addEventListener('click', event => {
  const content = $('.fine-preview-content'), collapsed = content.classList.toggle('resources-collapsed');
  event.currentTarget.setAttribute('aria-expanded', String(!collapsed));
  event.currentTarget.setAttribute('aria-label', collapsed ? '展开资源栏' : '收起资源栏');
  event.currentTarget.textContent = collapsed ? '›' : '‹';
});
function setFineResourceWidth(width) {
  const content = $('.fine-preview-content'), bounds = content.getBoundingClientRect();
  const inspectorWidth = Number(content.dataset.inspectorWidth) || 220;
  const maxWidth = Math.max(130, bounds.width - inspectorWidth - 330);
  const clamped = Math.max(130, Math.min(maxWidth, width));
  content.style.setProperty('--fine-resource-width', `${clamped}px`);
  content.dataset.resourceWidth = String(clamped);
  if (!content.classList.contains('resources-collapsed')) content.style.gridTemplateColumns = `${clamped}px 7px minmax(0, 1fr) 8px ${inspectorWidth}px`;
}
const resourceGrip = $('#fineResourceGrip');
function resizeResourcesAt(clientX) { setFineResourceWidth(clientX - $('.fine-preview-content').getBoundingClientRect().left); }
resourceGrip.addEventListener('pointerdown', event => {
  if (event.button !== 0 || $('.fine-preview-content').classList.contains('resources-collapsed')) return;
  resourceGrip.setPointerCapture(event.pointerId); resourceGrip.classList.add('dragging'); resizeResourcesAt(event.clientX);
});
resourceGrip.addEventListener('pointermove', event => { if (resourceGrip.hasPointerCapture(event.pointerId)) resizeResourcesAt(event.clientX); });
function finishResourceResize(event) {
  if (resourceGrip.hasPointerCapture(event.pointerId)) resourceGrip.releasePointerCapture(event.pointerId);
  resourceGrip.classList.remove('dragging');
}
resourceGrip.addEventListener('pointerup', finishResourceResize);
resourceGrip.addEventListener('pointercancel', finishResourceResize);
resourceGrip.addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  event.preventDefault();
  const current = Number($('.fine-preview-content').dataset.resourceWidth) || 200;
  setFineResourceWidth(current + (event.key === 'ArrowRight' ? 16 : -16));
});
const inspectorGrip = $('#previewInspectorGrip');
function setInspectorWidth(width) {
  const content = $('.fine-preview-content'), bounds = content.getBoundingClientRect();
  const minPreview = 180, minInspector = 150;
  const resourceWidth = content.classList.contains('resources-collapsed') ? 0 : Number(content.dataset.resourceWidth) || 210;
  const maxInspector = Math.max(minInspector, bounds.width - resourceWidth - 15 - minPreview);
  const clamped = Math.max(minInspector, Math.min(maxInspector, width));
  const resourceColumns = content.classList.contains('resources-collapsed') ? '0 0' : `${content.dataset.resourceWidth || 200}px 7px`;
  content.style.gridTemplateColumns = `${resourceColumns} minmax(0, 1fr) 8px ${clamped}px`;
  content.dataset.inspectorWidth = String(clamped);
}
function resizeInspectorAt(clientX) {
  const bounds = $('.fine-preview-content').getBoundingClientRect();
  setInspectorWidth(bounds.right - clientX - inspectorGrip.offsetWidth / 2);
}
inspectorGrip.addEventListener('pointerdown', event => {
  if (event.button !== 0 || $('#previewInspector').classList.contains('collapsed')) return;
  inspectorGrip.setPointerCapture(event.pointerId);
  inspectorGrip.classList.add('dragging');
  resizeInspectorAt(event.clientX);
});
inspectorGrip.addEventListener('pointermove', event => {
  if (inspectorGrip.hasPointerCapture(event.pointerId)) resizeInspectorAt(event.clientX);
});
function finishInspectorResize(event) {
  if (inspectorGrip.hasPointerCapture(event.pointerId)) inspectorGrip.releasePointerCapture(event.pointerId);
  inspectorGrip.classList.remove('dragging');
}
inspectorGrip.addEventListener('pointerup', finishInspectorResize);
inspectorGrip.addEventListener('pointercancel', finishInspectorResize);
inspectorGrip.addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  event.preventDefault();
  const current = Number($('.fine-preview-content').dataset.inspectorWidth) || $('#previewInspector').getBoundingClientRect().width;
  setInspectorWidth(current + (event.key === 'ArrowLeft' ? 16 : -16));
});
$$('[data-inspector-tab]').forEach(tab => tab.addEventListener('click', () => {
  $$('[data-inspector-tab]').forEach(item => { const active = item === tab; item.classList.toggle('selected', active); item.setAttribute('aria-selected', String(active)); });
  $$('[data-inspector-panel]').forEach(panel => { panel.hidden = panel.dataset.inspectorPanel !== tab.dataset.inspectorTab; });
}));
$('#captionFont').addEventListener('change', event => saveCaptionStyle({ fontFamily: event.target.value }, '修改字幕字体'));
$('#captionColor').addEventListener('change', event => saveCaptionStyle({ color: event.target.value }, '修改字幕颜色'));
$('#captionBold').addEventListener('change', event => saveCaptionStyle({ bold: event.target.checked }, '修改字幕字重'));
$('#captionSize').addEventListener('input', event => {
  $('#captionSizeValue').value = $('#captionSizeValue').textContent = event.target.value;
  const clip = captionClip(); if (clip) applyCaptionStyle(clip, $('[data-edit-caption]'));
});
$('#captionSize').addEventListener('change', event => saveCaptionStyle({ fontSize: Number(event.target.value) }, '修改字幕字号'));
$('#previewEffect').addEventListener('change', event => renderInspectorEffect(event.target.value));
$('#applyPreviewEffect').addEventListener('click', () => {
  const key = $('#previewEffect').value;
  if (key === 'none') return notify('先选择一个效果。', true);
  const effect = EFFECT_PRESETS.find(item => item.id === key);
  addEffectToTimeline(effect);
});
function renderTimeline() {
  const canvas = $('#timelineCanvas');
  const tracksRoot = $('#timelineTracks');
  const labelWidth = TRACK_LABEL_WIDTH;
  const endFrame = timelineEndFrame();
  // Only unresolved annotations belong on the active editing surface. Sent
  // annotations remain attached to chat history, but should not keep marking
  // the timeline after the demo response has handled them.
  const timelineAnnotations = pendingAnnotations;
  const tickFrames = timelineTickStep();
  const rulerEndFrame = Math.ceil((endFrame + TIMELINE_TAIL_FRAMES) / tickFrames) * tickFrames;
  renderedTimelineEndFrame = rulerEndFrame;
  const width = Math.max($('#timelineViewport').clientWidth - labelWidth, Math.ceil(rulerEndFrame / FPS * pixelsPerSecond) + 24);
  canvas.style.width = `${width + labelWidth}px`;
  canvas.style.setProperty('--label-width', `${labelWidth}px`);
  canvas.style.setProperty('--timeline-width', `${width}px`);
  canvas.style.setProperty('--pixels-per-second', `${pixelsPerSecond}px`);
  tracksRoot.replaceChildren();
  for (const track of tracks) {
    if (!track.clips.length && !track.keepEmpty) continue;
    const row = document.createElement('div'); row.className = 'track-row'; row.dataset.trackId = track.id;
    row.dataset.trackType = track.type;
    row.dataset.empty = String(track.clips.length === 0);
    const head = document.createElement('div'); head.className = 'track-head';
    const icon = document.createElement('span'); icon.className = 'track-icon'; icon.textContent = track.icon;
    const name = document.createElement('b'); name.textContent = track.label; head.append(icon, name);
    if (track.id !== 'video') {
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'track-delete';
      remove.textContent = '×'; remove.title = `删除${track.label}轨道及其片段`; remove.setAttribute('aria-label', remove.title);
      remove.onclick = event => { event.stopPropagation(); deleteTrack(track.id); };
      head.append(remove);
    }
    row.append(head);
    const lane = document.createElement('div'); lane.className = 'track-lane'; lane.dataset.trackId = track.id; row.append(lane);
    lane.style.backgroundSize = `${pixelsPerSecond}px 100%`;
    if (!track.clips.length) {
      const add = document.createElement('button'); add.type = 'button'; add.className = 'lane-add';
      add.textContent = track.id.startsWith('pip-') ? '＋ 将所选视频放到此画中画轨道' : `＋ 添加${track.label}`;
      add.onclick = () => addTrackClip(track.id); lane.append(add);
    }
    for (const item of [...track.clips].sort((a, b) => a.start - b.start)) {
      const clip = document.createElement('button'); clip.type = 'button'; clip.className = `clip ${item.style}${selected.clipId === item.id ? ' selected' : ''}`;
      clip.dataset.clipId = item.id; clip.dataset.clip = item.name; clip.dataset.trackId = track.id; clip.dataset.trackType = track.type;
      clip.style.left = `${item.start / FPS * pixelsPerSecond}px`; clip.style.width = `${Math.max(4, item.duration / FPS * pixelsPerSecond)}px`;
      const left = document.createElement('i'); left.className = 'trim-handle left';
      const label = document.createElement('span'); label.className = 'clip-label';
      const wholeSeconds = Math.floor(item.duration / FPS), remainingFrames = item.duration % FPS;
      label.textContent = `${item.name}　${wholeSeconds}秒${remainingFrames ? `${String(remainingFrames).padStart(2, '0')}帧` : ''}`;
      const right = document.createElement('i'); right.className = 'trim-handle right';
      clip.append(left, label, right); lane.append(clip);
      const clipAnnotations = timelineAnnotations.map((annotation, index) => ({ annotation, number: index + 1 }))
        .filter(entry => entry.annotation.metadata.targetKind !== 'preview' && entry.annotation.metadata.clipId === item.id);
      clipAnnotations.forEach((entry, index) => addAnnotationMarker(clip, entry.number, index, entry.annotation.body.commentText));
    }
    renderTransitionMarkers(track, lane);
    timelineAnnotations.map((annotation, index) => ({ annotation, number: index + 1 }))
      .filter(entry => entry.annotation.metadata.targetKind !== 'preview' && !entry.annotation.metadata.clipId && entry.annotation.metadata.trackId === track.id)
      .forEach((entry, index) => addTrackAnnotationMarker(lane, entry.annotation, entry.number, index));
    tracksRoot.append(row);
  }
  renderTimelineRuler(rulerEndFrame);
  drawPlayhead(); updateChatContext(); renderCaptionText(); wireRenderedClips();
}
function adjacentVideoCuts() {
  const video = tracks.find(track => track.id === 'video');
  if (!video) return [];
  const clips = [...video.clips].sort((a, b) => a.start - b.start);
  return clips.slice(1).flatMap((right, index) => {
    const left = clips[index];
    return left.start + left.duration === right.start ? [{ frame: right.start, leftClipId: left.id, rightClipId: right.id }] : [];
  });
}
function pruneTimelineTransitions() {
  const cuts = new Set(adjacentVideoCuts().map(cut => `${cut.leftClipId}:${cut.rightClipId}`));
  timelineTransitions = timelineTransitions.filter(transition => cuts.has(`${transition.leftClipId}:${transition.rightClipId}`));
  if (!timelineTransitions.some(transition => transition.id === selectedTransitionId)) selectedTransitionId = null;
}
function renderTransitionMarkers(track, lane) {
  if (track.id !== 'video') return;
  const clipById = new Map(track.clips.map(clip => [clip.id, clip]));
  for (const transition of timelineTransitions) {
    const left = clipById.get(transition.leftClipId), right = clipById.get(transition.rightClipId);
    if (!left || !right || left.start + left.duration !== right.start) continue;
    const marker = document.createElement('button');
    marker.type = 'button'; marker.className = `transition-marker${transition.id === selectedTransitionId ? ' selected' : ''}`;
    marker.textContent = '↔'; marker.style.left = `${right.start / FPS * pixelsPerSecond}px`;
    marker.title = `${transition.name} · 剪辑点放置示意，不改变演示画面`;
    marker.setAttribute('aria-label', `${transition.name}转场落点；当前为交互示意，不改变演示画面`);
    marker.addEventListener('pointerdown', event => event.stopPropagation());
    marker.addEventListener('click', event => {
      event.stopPropagation(); selectedTransitionId = transition.id;
      selected = { trackId: 'video', clipId: left.id };
      selectedClip = left.name;
      $$('.transition-marker').forEach(item => item.classList.toggle('selected', item === marker));
      $$('.clip').forEach(item => item.classList.toggle('selected', item.dataset.clipId === left.id));
      notify(`${transition.name}已选中。当前页面只演示剪辑点位置，不生成转场画面。`);
    });
    lane.append(marker);
  }
}
function drawPlayhead() {
  const playhead = $('#finePlayhead'); if (!playhead) return;
  playhead.style.left = `${TRACK_LABEL_WIDTH + playheadFrame / FPS * pixelsPerSecond}px`;
  const time = frameLabel(playheadFrame);
  const duration = timelineEndFrame();
  $('#fineTimeLabel').textContent = `${time} / ${frameLabel(duration)}`;
  $('#playbackTime').textContent = `${time.slice(3, 8)} / ${formatDuration(duration)}`;
  $('.timecode').textContent = `${time.slice(6, 8)}:${time.slice(9, 11)} / ${formatDuration(duration)}`;
  $('#previewPosition').value = String(playheadFrame / FPS);
  $('#previewPosition').max = String(Math.max(1, duration / FPS));
  if (playheadFrame + TIMELINE_TAIL_FRAMES / 2 > renderedTimelineEndFrame) requestAnimationFrame(renderTimeline);
  renderCaptionText();
  renderPipPreviews();
  renderPreviewAnnotationMarkers();
  refreshInspectorFromTimeline();
}
function renderPreviewAnnotationMarkers() {
  const root = $('#previewAnnotationMarkers');
  if (!root) return;
  root.replaceChildren();
  pendingAnnotations.map((annotation, index) => ({ annotation, number: index + 1 }))
    .filter(entry => entry.annotation.metadata.targetKind === 'preview' && entry.annotation.metadata.position.value === playheadFrame)
    .forEach(entry => {
      const point = entry.annotation.metadata.previewPoint || { x: 0.5, y: 0.5 };
      const marker = document.createElement('span'); marker.className = 'preview-annotation-marker'; marker.textContent = String(entry.number);
      marker.style.left = `${point.x * 100}%`; marker.style.top = `${point.y * 100}%`;
      marker.title = entry.annotation.body.commentText; marker.setAttribute('aria-label', `批注 ${entry.number}：${entry.annotation.body.commentText}`);
      root.append(marker);
    });
}
function renderPipPreviews() {
  const layer = $('#pipPreviewLayer');
  if (!layer) return;
  layer.replaceChildren();
  const active = tracks.filter(track => track.id.startsWith('pip-'))
    .flatMap(track => track.clips.filter(clip => playheadFrame >= clip.start && playheadFrame < clip.start + clip.duration).map(clip => ({ track, clip })))
    .slice(0, 4);
  active.forEach(({ track, clip }, index) => {
    const frame = document.createElement('div'); frame.className = `preview-pip preview-pip-${index + 1}`;
    frame.setAttribute('aria-label', `${track.label}：${clip.name}`); frame.title = `${track.label} · ${clip.name}`;
    const label = document.createElement('span'); label.textContent = `${track.label} · ${clip.name}`; frame.append(label); layer.append(frame);
  });
}
function recordEdit(label, mutate) {
  const before = deepCopy(tracks), beforeTransitions = deepCopy(timelineTransitions), oldSelected = { ...selected }, oldSelectedTransition = selectedTransitionId, oldFrame = playheadFrame;
  selectedTransitionId = null; mutate(); pruneTimelineTransitions(); timelineRevision += 1;
  undoStack.push({ label, before, after: deepCopy(tracks), beforeTransitions, afterTransitions: deepCopy(timelineTransitions), beforeSelected: oldSelected, afterSelected: { ...selected }, beforeSelectedTransition: oldSelectedTransition, afterSelectedTransition: selectedTransitionId, beforeFrame: oldFrame, afterFrame: playheadFrame });
  redoStack = []; renderTimeline(); notify(`${label}（本页演示，可撤销）。`);
}
function restoreEdit(snapshot, selection, frame, transitionSnapshot, selectedTransition) { tracks.splice(0, tracks.length, ...deepCopy(snapshot)); timelineTransitions = deepCopy(transitionSnapshot || []); selected = { ...selection }; selectedTransitionId = selectedTransition || null; playheadFrame = frame; timelineRevision += 1; renderTimeline(); }
function selectClip(clip, announce = true) {
  if (!clip) return;
  selectedTransitionId = null;
  selected = { trackId: clip.dataset.trackId, clipId: clip.dataset.clipId };
  const { clip: item } = selectedRecord(); selectedClip = item?.name || clip.dataset.clip;
  $$('.clip').forEach(node => node.classList.toggle('selected', node.dataset.clipId === selected.clipId));
  $$('.transition-marker').forEach(node => node.classList.remove('selected'));
  updateChatContext();
  if (announce) notify(`已选中${selectedClip}轨道对象。`);
}
function wireRenderedClips() {
  $$('.clip').forEach(clip => {
    clip.addEventListener('click', event => {
      if (event.target.closest('.trim-handle')) return;
      selectClip(clip);
    });
    clip.addEventListener('contextmenu', event => { event.preventDefault(); selectClip(clip, false); openTimelineMenu(event, clip); });
    clip.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      event.preventDefault(); selectClip(clip, false);
      const sourceTrack = tracks.find(item => item.id === clip.dataset.trackId), item = sourceTrack.clips.find(value => value.id === clip.dataset.clipId);
      const startX = event.clientX, startY = event.clientY, original = { start: item.start, duration: item.duration };
      const grabFrames = Math.max(0, (event.clientX - clip.getBoundingClientRect().left) / pixelsPerSecond * FPS);
      const handleSide = event.target.closest('.trim-handle')?.classList.contains('left') ? 'left' : event.target.closest('.trim-handle')?.classList.contains('right') ? 'right' : null;
      let targetTrack = sourceTrack, final = original, didDrag = false, dropValid = true, temporaryPipRow = null, createPipOnDrop = false;
      const temporaryPipTrack = { id: 'pip-temp', label: '画中画', type: 'video', clips: [] };
      let lastPointerX = startX, lastPointerY = startY;
      const removeTemporaryPip = () => { temporaryPipRow?.remove(); temporaryPipRow = null; createPipOnDrop = false; };
      clip.setPointerCapture(event.pointerId);
      const move = moveEvent => {
        if (!clip.hasPointerCapture(moveEvent.pointerId)) return;
        lastPointerX = moveEvent.clientX; lastPointerY = moveEvent.clientY;
        setSnapGuide(null);
        if (Math.abs(moveEvent.clientX - startX) + Math.abs(moveEvent.clientY - startY) > 4) didDrag = true;
        let delta = Math.round((moveEvent.clientX - startX) / pixelsPerSecond * FPS);
        if (!handleSide) {
          let hit = trackRowAtPoint(moveEvent.clientX, moveEvent.clientY);
          let candidateTrack = tracks.find(track => track.id === hit?.dataset.trackId);
          let sourceRow = $(`.track-row[data-track-id="${sourceTrack.id}"]`);
          const viewportRect = $('#timelineViewport').getBoundingClientRect();
          const insideTimeline = moveEvent.clientX >= viewportRect.left && moveEvent.clientX <= viewportRect.right
            && moveEvent.clientY >= viewportRect.top && moveEvent.clientY <= viewportRect.bottom;
          const pipRows = [...$('#timelineTracks').querySelectorAll('.track-row[data-track-id^="pip-"]')];
          const topPipRow = pipRows[0] || sourceRow;
          const draggingAboveMain = insideTimeline && sourceTrack.id === 'video' && moveEvent.clientY < topPipRow.getBoundingClientRect().top;
          if (draggingAboveMain) {
            if (!temporaryPipRow) temporaryPipRow = createTemporaryPipRow(topPipRow);
            sourceRow = $(`.track-row[data-track-id="${sourceTrack.id}"]`);
            // Inserting the temporary row shifts the lanes. Hit-test again
            // after layout so the visible row under the pointer is the row
            // that receives the drop.
            hit = trackRowAtPoint(moveEvent.clientX, moveEvent.clientY);
            candidateTrack = tracks.find(track => track.id === hit?.dataset.trackId);
            const overTemporary = hit?.dataset.trackId === 'temporary-pip-preview';
            if (overTemporary) {
              targetTrack = temporaryPipTrack;
              createPipOnDrop = true;
              dropValid = true;
              const canvasRect = $('#timelineCanvas').getBoundingClientRect();
              const rawWantedStart = (moveEvent.clientX - canvasRect.left - TRACK_LABEL_WIDTH) / pixelsPerSecond * FPS - grabFrames;
              let wantedStart = magnetEnabled ? snapFrame(item, rawWantedStart, original.duration) : Math.max(0, Math.round(rawWantedStart));
              final = resolvePlacement(targetTrack, item, original, wantedStart - original.start, null);
              $('.track-row.drop-target')?.classList.remove('drop-target');
              temporaryPipRow.classList.add('drop-target');
            } else if (candidateTrack && canDropClip(sourceTrack, candidateTrack)) {
              targetTrack = candidateTrack;
              createPipOnDrop = false;
              const canvasRect = $('#timelineCanvas').getBoundingClientRect();
              const rawWantedStart = (moveEvent.clientX - canvasRect.left - TRACK_LABEL_WIDTH) / pixelsPerSecond * FPS - grabFrames;
              let wantedStart = magnetEnabled ? snapFrame(item, rawWantedStart, original.duration) : Math.max(0, Math.round(rawWantedStart));
              const candidate = resolvePlacement(candidateTrack, item, original, wantedStart - original.start, null);
              dropValid = fitsTrack(candidateTrack, item, candidate);
              final = dropValid ? candidate : original;
              $('.track-row.drop-target')?.classList.remove('drop-target');
              if (dropValid && targetTrack !== sourceTrack) hit.classList.add('drop-target');
            } else {
              // Keep the dragged clip aligned with the visible temporary lane
              // as soon as it is created. Requiring the pointer to be inside
              // that 36px row before moving the preview makes it jump down to
              // the shifted source row and then snap back up.
              targetTrack = temporaryPipTrack;
              createPipOnDrop = false;
              dropValid = false;
              const canvasRect = $('#timelineCanvas').getBoundingClientRect();
              const rawWantedStart = (moveEvent.clientX - canvasRect.left - TRACK_LABEL_WIDTH) / pixelsPerSecond * FPS - grabFrames;
              let wantedStart = magnetEnabled ? snapFrame(item, rawWantedStart, original.duration) : Math.max(0, Math.round(rawWantedStart));
              final = resolvePlacement(temporaryPipTrack, item, original, wantedStart - original.start, null);
              $('.track-row.drop-target')?.classList.remove('drop-target');
            }
          } else if (candidateTrack && canDropClip(sourceTrack, candidateTrack)) {
            sourceRow = $(`.track-row[data-track-id="${sourceTrack.id}"]`);
            createPipOnDrop = false;
            const canvasRect = $('#timelineCanvas').getBoundingClientRect();
            const rawWantedStart = (moveEvent.clientX - canvasRect.left - TRACK_LABEL_WIDTH) / pixelsPerSecond * FPS - grabFrames;
            let wantedStart = magnetEnabled ? snapFrame(item, rawWantedStart, original.duration) : Math.max(0, Math.round(rawWantedStart));
            if (sourceTrack.id === 'video' && candidateTrack.id === 'video') {
              targetTrack = sourceTrack;
              dropValid = true;
              final = { start: Math.max(0, wantedStart), duration: original.duration };
            } else {
              const candidate = resolvePlacement(candidateTrack, item, original, wantedStart - original.start, null);
              if (fitsTrack(candidateTrack, item, candidate)) { targetTrack = candidateTrack; dropValid = true; }
              else { targetTrack = sourceTrack; dropValid = false; }
              final = targetTrack === candidateTrack ? candidate : resolvePlacement(sourceTrack, item, original, wantedStart - original.start, null);
            }
            $('.track-row.drop-target')?.classList.remove('drop-target');
            if (targetTrack !== sourceTrack) hit.classList.add('drop-target');
          } else {
            targetTrack = sourceTrack;
            final = original;
            dropValid = false;
            $('.track-row.drop-target')?.classList.remove('drop-target');
          }
        } else {
          const edgeFrame = handleSide === 'left' ? original.start + delta : original.start + original.duration + delta;
          if (magnetEnabled) {
            const snapped = snapFrame(item, edgeFrame);
            delta = handleSide === 'left' ? snapped - original.start : snapped - original.start - original.duration;
          }
          final = resolvePlacement(sourceTrack, item, original, delta, handleSide);
        }
        clip.style.left = `${final.start / FPS * pixelsPerSecond}px`; clip.style.width = `${final.duration / FPS * pixelsPerSecond}px`;
        const targetRow = targetTrack.id === 'pip-temp' ? temporaryPipRow : $(`.track-row[data-track-id="${targetTrack.id}"]`);
        clip.style.transform = targetTrack === sourceTrack ? '' : targetRow ? `translateY(${targetRow.getBoundingClientRect().top - clip.parentElement.getBoundingClientRect().top}px)` : `translateY(-${sourceRow.offsetHeight}px)`;
        clip.classList.toggle('dragging', didDrag);
      };
      const finish = upEvent => {
        // Hit-testing can see the transformed clip in its drop lane on
        // pointerup. Preserve the last pointermove decision when the cursor
        // has not moved; reconcile only a genuinely new release position.
        if (upEvent.clientX !== lastPointerX || upEvent.clientY !== lastPointerY) move(upEvent);
        clip.removeEventListener('pointermove', move);
        if (clip.hasPointerCapture(upEvent.pointerId)) clip.releasePointerCapture(upEvent.pointerId);
        $('.track-row.drop-target')?.classList.remove('drop-target');
        if (!didDrag) { renderTimeline(); return; }
        if (!dropValid) { renderTimeline(); return; }
        const droppedInTemporaryPip = createPipOnDrop && targetTrack.id === 'pip-temp';
        removeTemporaryPip();
        setSnapGuide(null);
        if (!handleSide && targetTrack === sourceTrack && sourceTrack.id === 'video') {
          const start = Math.max(0, Math.round(final.start));
          if (start === original.start) { renderTimeline(); return; }
          const dropFrame = exactFrameAtPointer(upEvent);
          const insertionStart = mainVideoInsertionFrame(sourceTrack, dropFrame, item.id, start);
          const willRipple = sourceTrack.clips.some(other => other.id !== item.id && other.start >= insertionStart);
          recordEdit(willRipple ? `重新排列“${item.name}”并顺延后续片段` : `移动“${item.name}”到新位置`, () => {
            moveMainVideoClip(sourceTrack, item, start, dropFrame);
            selected = { trackId: sourceTrack.id, clipId: item.id };
          });
          return;
        }
        if (targetTrack !== sourceTrack && !droppedInTemporaryPip && !fitsTrack(targetTrack, item, final)) { renderTimeline(); return; }
        if (targetTrack !== sourceTrack || final.start !== original.start || final.duration !== original.duration) {
          recordEdit(targetTrack === sourceTrack ? `调整“${item.name}”时间范围` : `将“${item.name}”移到${targetTrack.label}`, () => {
            if (droppedInTemporaryPip) targetTrack = createOverlayTrack();
            if (targetTrack !== sourceTrack) sourceTrack.clips.splice(sourceTrack.clips.indexOf(item), 1);
            Object.assign(item, final);
            if (targetTrack !== sourceTrack) targetTrack.clips.push(item);
            if (targetTrack !== sourceTrack && sourceTrack.id.startsWith('pip-') && sourceTrack.clips.length === 0) tracks.splice(tracks.indexOf(sourceTrack), 1);
            selected = { trackId: targetTrack.id, clipId: item.id };
          });
        } else renderTimeline();
      };
      clip.addEventListener('pointermove', move);
      clip.addEventListener('pointerup', finish, { once: true });
      clip.addEventListener('pointercancel', cancel => {
        clip.removeEventListener('pointermove', move);
        if (clip.hasPointerCapture(cancel.pointerId)) clip.releasePointerCapture(cancel.pointerId);
        removeTemporaryPip();
        setSnapGuide(null);
        $('.track-row.drop-target')?.classList.remove('drop-target');
        renderTimeline();
      }, { once: true });
    });
  });
}
function canDropClip(source, target) {
  if (!source || !target) return false;
  if (source === target) return true;
  if (source.type === 'video' || target.type === 'video') return source.type === 'video' && target.type === 'video';
  if (source.type === 'audio' || target.type === 'audio') return source.type === 'audio' && target.type === 'audio';
  if (source.type === 'caption' || target.type === 'caption') return source.type === 'caption' && target.type === 'caption';
  return source.type === 'overlay' && target.type === 'overlay';
}
function fitsTrack(track, clip, placement) {
  return track.clips.every(other => other.id === clip.id || placement.start + placement.duration <= other.start || other.start + other.duration <= placement.start);
}
function snapDistanceFrames(pixelTolerance = SNAP_THRESHOLD_PX) {
  return Math.max(0, pixelTolerance) * FPS / Math.max(1, pixelsPerSecond);
}
function snapFrame(clip, frame, duration = null) {
  const points = new Set([0, timelineEndFrame(clip?.id), playheadFrame]);
  for (const item of tracks.flatMap(value => value.clips)) {
    if (item.id === clip.id) continue;
    points.add(item.start); points.add(item.start + item.duration);
  }
  const choices = [...points].flatMap(point => duration === null
    ? [{ point, result: point, distance: Math.abs(point - frame) }]
    : [{ point, result: point, distance: Math.abs(point - frame) }, { point, result: point - duration, distance: Math.abs(point - (frame + duration)) }])
    .filter(choice => choice.result >= 0);
  const nearest = choices.sort((a, b) => a.distance - b.distance || a.point - b.point)[0];
  if (nearest && nearest.distance <= snapDistanceFrames()) { setSnapGuide(nearest.point); return nearest.result; }
  setSnapGuide(null); return Math.max(0, Math.round(frame));
}
function nearestTransitionCut(frame) {
  const nearest = adjacentVideoCuts().map(cut => ({ ...cut, distance: Math.abs(cut.frame - frame) }))
    .sort((a, b) => a.distance - b.distance || a.frame - b.frame)[0];
  return nearest && nearest.distance <= snapDistanceFrames(TRANSITION_DROP_RADIUS_PX) ? nearest : null;
}
function showTransitionDropPreview(cut, lane, pointerFrame) {
  clearTransitionDropPreview();
  if (!lane) return;
  const marker = document.createElement('span');
  marker.className = `transition-drop-preview${cut ? ' valid' : ' invalid'}`;
  marker.textContent = cut ? '↔' : '×';
  marker.style.left = `${(cut?.frame ?? pointerFrame) / FPS * pixelsPerSecond}px`;
  marker.title = cut ? '可放置在此剪辑点' : '转场必须放在两个相邻视频片段之间';
  lane.append(marker); transitionDropPreviewElement = marker;
}
function clearTransitionDropPreview() {
  transitionDropPreviewElement?.remove(); transitionDropPreviewElement = null;
}
function setSnapGuide(frame) {
  const canvas = $('#timelineCanvas');
  let guide = $('#snapGuide');
  if (!guide && frame === null) return;
  if (!guide) { guide = document.createElement('div'); guide.id = 'snapGuide'; guide.className = 'snap-guide'; guide.setAttribute('aria-hidden', 'true'); canvas.append(guide); }
  guide.hidden = frame === null || !magnetEnabled;
  if (!guide.hidden) guide.style.left = `${TRACK_LABEL_WIDTH + frame / FPS * pixelsPerSecond}px`;
}
function resolvePlacement(track, clip, original, delta, edge) {
  if (track.type !== 'video') {
    const start = edge === 'left' ? Math.max(0, Math.min(original.start + original.duration - 1, original.start + delta)) : original.start;
    const duration = edge === 'left' ? original.duration + original.start - start : edge === 'right' ? Math.max(1, original.duration + delta) : original.duration;
    return { start: edge ? start : Math.max(0, original.start + delta), duration };
  }
  const others = track.clips.filter(other => other.id !== clip.id).sort((a, b) => a.start - b.start);
  if (edge === 'left') {
    const wanted = Math.max(0, Math.min(original.start + original.duration - 1, original.start + delta));
    const end = original.start + original.duration;
    const lowerBound = others.reduce((bound, other) => other.start < end && other.start + other.duration <= end ? Math.max(bound, other.start + other.duration) : bound, 0);
    const start = Math.max(lowerBound, Math.min(end - 1, wanted));
    return { start, duration: end - start };
  }
  if (edge === 'right') {
    const wanted = Math.max(1, original.duration + delta);
    const nextStart = others.reduce((start, other) => other.start >= original.start + original.duration ? Math.min(start, other.start) : start, Infinity);
    const maxDuration = Number.isFinite(nextStart) ? nextStart - original.start : Infinity;
    return { start: original.start, duration: Math.max(1, Math.min(maxDuration, wanted)) };
  }
  const wanted = Math.max(0, original.start + delta);
  const intervals = [];
  let lower = 0;
  for (const other of others) {
    const upper = other.start - original.duration;
    if (upper >= lower) intervals.push([lower, upper]);
    lower = Math.max(lower, other.start + other.duration);
  }
  intervals.push([lower, Infinity]);
  const start = intervals.map(([min, max]) => Math.max(min, Math.min(max, wanted)))
    .sort((a, b) => Math.abs(a - wanted) - Math.abs(b - wanted))[0];
  return { start, duration: original.duration };
}
function frameAtPointer(event) {
  return Math.round(exactFrameAtPointer(event));
}
function exactFrameAtPointer(event) {
  const canvasRect = $('#timelineCanvas').getBoundingClientRect();
  return Math.max(0, (event.clientX - canvasRect.left - TRACK_LABEL_WIDTH) / pixelsPerSecond * FPS);
}
function openTimelineMenu(event, clip = null) {
  const row = event.target.closest('.track-row'); if (!row) return;
  const track = tracks.find(item => item.id === row.dataset.trackId);
  playheadFrame = frameAtPointer(event);
  const anchoredClip = clip && track?.clips.find(item => item.id === clip.dataset.clipId);
  if (anchoredClip) playheadFrame = Math.max(anchoredClip.start, Math.min(anchoredClip.start + anchoredClip.duration - 1, playheadFrame));
  drawPlayhead();
  contextTarget = { schema: 'timeline.annotation.v1', targetKind: 'timeline', surfaceLabel: '时间线', timelineVersion: timelineRevision, trackId: row.dataset.trackId,
    trackLabel: track?.label || row.querySelector('b').textContent, clipId: anchoredClip?.id || null, clipLabel: anchoredClip?.name || null,
    clipOffsetFrames: anchoredClip ? playheadFrame - anchoredClip.start : null,
    position: { value: playheadFrame, timescale: FPS }, frame: playheadFrame, timecode: frameLabel(playheadFrame) };
  const menu = $('#timelineContextMenu'); menu.hidden = false;
  $$('[data-context-action]', menu).forEach(action => { action.hidden = !clip && action.dataset.contextAction !== 'annotate'; });
  menu.style.left = `${Math.min(event.clientX, innerWidth - 205)}px`; menu.style.top = `${Math.min(event.clientY, innerHeight - 165)}px`;
}
function openPreviewAnnotationMenu(event) {
  event.preventDefault();
  const bounds = $('#fineVideoFrame').getBoundingClientRect();
  const x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
  const y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
  let active = null;
  for (const track of [...tracks].reverse()) {
    if (track.type !== 'video') continue;
    active = track.clips.find(clip => playheadFrame >= clip.start && playheadFrame < clip.start + clip.duration);
    if (active) { active = { track, clip: active }; break; }
  }
  const track = active?.track || tracks.find(item => item.id === selected.trackId) || tracks.find(item => item.id === 'video');
  const clip = active?.clip || null;
  contextTarget = { schema: 'timeline.annotation.v1', targetKind: 'preview', surfaceLabel: '预览画面', timelineVersion: timelineRevision,
    trackId: track?.id || 'video', trackLabel: track?.label || '当前画面', clipId: clip?.id || null, clipLabel: clip?.name || null,
    clipOffsetFrames: clip ? playheadFrame - clip.start : null, previewPoint: { x, y },
    position: { value: playheadFrame, timescale: FPS }, frame: playheadFrame, timecode: frameLabel(playheadFrame) };
  const menu = $('#timelineContextMenu'); menu.hidden = false;
  $$('[data-context-action]', menu).forEach(action => { action.hidden = action.dataset.contextAction !== 'annotate'; });
  menu.style.left = `${Math.min(event.clientX, innerWidth - 205)}px`; menu.style.top = `${Math.min(event.clientY, innerHeight - 165)}px`;
}
function addAnnotationMarker(clip, number, stackIndex = 0, commentText = '') {
  const marker = document.createElement('span'); marker.className = 'timeline-comment-marker'; marker.textContent = String(number);
  marker.style.right = `${5 + stackIndex * 20}px`; marker.title = commentText;
  marker.setAttribute('aria-label', `批注 ${number}：${commentText}`); clip.append(marker);
}
function addTrackAnnotationMarker(lane, annotation, number, stackIndex = 0) {
  const marker = document.createElement('span'); marker.className = 'timeline-comment-marker track-comment-marker'; marker.textContent = String(number);
  marker.style.left = `${annotation.metadata.position.value / FPS * pixelsPerSecond + stackIndex * 20}px`;
  marker.title = annotation.body.commentText; marker.setAttribute('aria-label', `批注 ${number}：${annotation.body.commentText}`);
  lane.append(marker);
}
function beginAnnotation() {
  if (!contextTarget) return;
  annotationEditingId = null;
  pendingAnnotationEditingId = null;
  annotationDraft = deepCopy(contextTarget);
  const clip = contextTarget.clipLabel ? ` · ${contextTarget.clipLabel}` : '';
  $('#annotationDialogTitle').textContent = '添加页面批注';
  $('#sendAnnotation').textContent = '加入批注';
  $('#annotationAnchor').textContent = `${annotationDraft.surfaceLabel ? `${annotationDraft.surfaceLabel} · ` : ''}${annotationDraft.trackLabel}${clip} · ${frameLabel(annotationDraft.frame)}`;
  $('#annotationRevision').textContent = `v${annotationDraft.timelineVersion}`;
  $('#annotationInput').value = '';
  openAnnotationDialog();
}
$('#sendAnnotation').onclick = () => {
  const body = $('#annotationInput').value.trim();
  if (!body) { notify('请填写这条批注的内容。', true); $('#annotationInput').focus(); return; }
  if (annotationEditingId) {
    const existing = chatHistory.find(item => item.kind === 'annotation' && item.annotationId === annotationEditingId);
    if (!existing) { notify('这条批注已不存在，请重新打开后再编辑。', true); return; }
    existing.body.commentText = body;
    persistChatHistory(); renderChatHistory();
    $('#annotationDialog').close(); annotationDraft = null; annotationEditingId = null;
    $('#fineChatPopover').hidden = false; $('#toggleFineChat').setAttribute('aria-expanded', 'true');
    return notify('批注内容已更新，锚点保持不变。');
  }
  const currentTrack = tracks.find(track => track.id === annotationDraft.trackId);
  const currentClipTrack = annotationDraft.clipId && tracks.find(track => track.clips.some(clip => clip.id === annotationDraft.clipId));
  const currentClip = currentClipTrack?.clips.find(clip => clip.id === annotationDraft.clipId);
  if (annotationDraft.clipId && !currentClip) { notify('批注目标片段已删除，请重新右键定位锚点。', true); return; }
  if (!annotationDraft.clipId && !currentTrack) { notify('批注目标轨道已删除，请重新定位锚点。', true); return; }
  const anchorTrack = currentClipTrack || currentTrack;
  const offset = annotationDraft.clipOffsetFrames;
  if (currentClip && offset >= currentClip.duration) { notify('目标片段已修剪，原批注位置已不存在，请重新定位。', true); return; }
  const resolvedFrame = currentClip ? currentClip.start + offset : annotationDraft.frame;
  const annotation = pendingAnnotationEditingId
    ? pendingAnnotations.find(item => item.annotationId === pendingAnnotationEditingId)
    : null;
  if (pendingAnnotationEditingId && !annotation) { notify('这条待发送批注已不存在，请重新添加。', true); return; }
  if (annotation) {
    annotation.body.commentText = body;
    annotation.metadata.timelineVersion = timelineRevision;
    annotation.metadata.trackId = anchorTrack.id; annotation.metadata.trackLabel = anchorTrack.label;
    annotation.metadata.clipId = currentClip?.id || null; annotation.metadata.clipLabel = currentClip?.name || null;
    annotation.metadata.clipOffsetFrames = currentClip ? offset : null;
    annotation.metadata.position = { value: resolvedFrame, timescale: FPS }; annotation.metadata.timecode = frameLabel(resolvedFrame);
  } else {
    pendingAnnotations.push({ type: 'timeline.annotation.v1', annotationId: `demo-annotation-${Date.now()}-${++annotationSequence}`,
      kind: 'annotation', metadata: { targetKind: annotationDraft.targetKind || 'timeline', surfaceLabel: annotationDraft.surfaceLabel || '时间线',
        previewPoint: annotationDraft.previewPoint ? { ...annotationDraft.previewPoint } : null,
        sourceTimelineVersion: annotationDraft.timelineVersion, timelineVersion: timelineRevision,
        trackId: anchorTrack.id, trackLabel: anchorTrack.label, clipId: currentClip?.id || null,
        clipLabel: currentClip?.name || null, clipOffsetFrames: currentClip ? offset : null,
        position: { value: resolvedFrame, timescale: FPS }, timecode: frameLabel(resolvedFrame) }, body: { commentText: body } });
  }
  persistPendingAnnotations(); renderPendingAnnotations();
  $('#annotationDialog').close(); annotationDraft = null; pendingAnnotationEditingId = null; renderTimeline();
  $('#fineChatPopover').hidden = false; $('#toggleFineChat').setAttribute('aria-expanded', 'true');
  notify(annotation ? '批注已更新，仍在待发送列表中。' : '已加入待发送批注；写好整体要求后再统一发送。');
};
$('#cancelAnnotation').onclick = $('#closeAnnotation').onclick = () => { $('#annotationDialog').close(); annotationDraft = null; annotationEditingId = null; pendingAnnotationEditingId = null; };
$('#annotationForm').addEventListener('submit', event => event.preventDefault());
$('#annotationDialog').addEventListener('close', () => { annotationDraft = null; annotationEditingId = null; pendingAnnotationEditingId = null; });
$('#annotationInput').addEventListener('keydown', event => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); $('#sendAnnotation').click(); } });
function splitSelectedClip() {
  if (selectedTransitionId) return notify('先选中视频或音频片段，再执行分割。', true);
  const { track, clip } = selectedRecord(); if (!clip) return notify('先选择时间线片段。', true);
  if (playheadFrame <= clip.start || playheadFrame >= clip.start + clip.duration) return notify('播放头必须位于选中片段内部才能分割。', true);
  const cut = playheadFrame, first = clip.duration, newId = `${clip.id}-split-${Date.now()}`;
  recordEdit(`在 ${frameLabel(cut)} 分割“${clip.name}”`, () => { clip.duration = cut - clip.start; track.clips.push({ ...clip, id: newId, name: `${clip.name}（后段）`, start: cut, duration: first - clip.duration, annotationCount: 0 }); selected.clipId = newId; }, () => {});
}
function deleteSelectedClip() {
  if (selectedTransitionId) {
    const transition = timelineTransitions.find(item => item.id === selectedTransitionId);
    if (!transition) { selectedTransitionId = null; return notify('转场标记已不存在。', true); }
    return recordEdit(`移除转场“${transition.name}”`, () => { timelineTransitions = timelineTransitions.filter(item => item.id !== transition.id); selectedTransitionId = null; });
  }
  const { track, clip } = selectedRecord(); if (!clip) return notify('先选择时间线片段。', true);
  const index = track.clips.indexOf(clip); recordEdit(`删除“${clip.name}”`, () => { track.clips.splice(index, 1); if (track.id.startsWith('pip-') && !track.clips.length) tracks.splice(tracks.indexOf(track), 1); selected = { trackId: 'video', clipId: tracks.find(item => item.id === 'video')?.clips[0]?.id || '' }; }, () => {});
}
function deleteTrack(trackId) {
  const index = tracks.findIndex(track => track.id === trackId);
  if (index < 0 || trackId === 'video') return;
  const [track] = tracks.slice(index, index + 1);
  recordEdit(`删除${track.label}轨道`, () => {
    tracks.splice(index, 1);
    selected = { trackId: 'video', clipId: tracks.find(item => item.id === 'video')?.clips[0]?.id || '' };
  });
}
function duplicateSelectedClip() {
  if (selectedTransitionId) return notify('先选中视频片段，再复制到画中画轨道。', true);
  const { track, clip } = selectedRecord(); if (!clip) return notify('先选择时间线片段。', true);
  if (track.type !== 'video') return notify('画中画复制目前只适用于视频片段。', true);
  let target = tracks.find(item => item.id.startsWith('pip-') && !item.clips.some(other => clip.start < other.start + other.duration && other.start < clip.start + clip.duration));
  const needsTrack = !target;
  const copy = { ...clip, id: `${clip.id}-pip-${++timelineItemSequence}`, name: clip.name, style: 'overlay-clip', annotationCount: 0 };
  recordEdit(`将“${clip.name}”复制到画中画轨道`, () => {
    if (needsTrack) target = createOverlayTrack();
    target.clips.push(copy); selected = { trackId: target.id, clipId: copy.id };
  }, () => {});
}
function createOverlayTrack() {
  for (let index = tracks.length - 1; index >= 0; index--) if (tracks[index].id.startsWith('pip-') && tracks[index].clips.length === 0) tracks.splice(index, 1);
  let number = 1; while (tracks.some(track => track.id === `pip-${number}`)) number += 1;
  const track = { id: `pip-${number}`, label: `画中画 ${number}`, type: 'video', icon: '▣', clips: [] };
  const mainIndex = tracks.findIndex(item => item.id === 'video'); tracks.splice(mainIndex < 0 ? 0 : mainIndex, 0, track);
  return track;
}
const OPTIONAL_TRACKS = {
  'text-sticker': { id: 'text-sticker', label: '文字 / 贴纸', type: 'overlay', icon: 'T' },
  effects: { id: 'effects', label: '特效', type: 'overlay', icon: '✧' },
  captions: { id: 'captions', label: '字幕', type: 'caption', icon: '文' },
  music: { id: 'music', label: '配乐', type: 'audio', icon: '♫' },
  sfx: { id: 'sfx', label: '音效', type: 'audio', icon: '♪' }
};
function insertOptionalTrack(track) {
  if (tracks.some(item => item.id === track.id)) return tracks.find(item => item.id === track.id);
  let index = tracks.findIndex(item => item.id === 'video');
  if (index < 0) index = tracks.length;
  const firstPip = tracks.findIndex(item => item.id.startsWith('pip-'));
  const visualInsertionPoint = firstPip >= 0 ? firstPip : index;
  if (track.id === 'text-sticker' || track.id === 'effects') {
    const order = ['text-sticker', 'effects'];
    const wanted = order.indexOf(track.id);
    const later = tracks.findIndex(item => order.indexOf(item.id) > wanted);
    index = later >= 0 ? later : visualInsertionPoint;
  } else if (track.type === 'caption') {
    const firstAudio = tracks.findIndex(item => item.type === 'audio');
    index = firstAudio >= 0 ? firstAudio : tracks.length;
  } else if (track.id === 'music') {
    const sfx = tracks.findIndex(item => item.id === 'sfx');
    index = sfx >= 0 ? sfx : tracks.length;
  } else index = tracks.length;
  tracks.splice(index, 0, track);
  return track;
}
function makeOptionalTrack(id, keepEmpty = false) {
  const definition = OPTIONAL_TRACKS[id];
  if (!definition) throw new Error(`Unknown demo track: ${id}`);
  return { ...definition, clips: [], keepEmpty };
}
function createEmptyTrack(id) {
  if (!OPTIONAL_TRACKS[id]) return;
  if (tracks.some(track => track.id === id)) return notify(`${OPTIONAL_TRACKS[id].label}轨道已经存在。`, true);
  const track = makeOptionalTrack(id, true);
  recordEdit(`创建${track.label}轨道`, () => { insertOptionalTrack(track); selected = { trackId: track.id, clipId: '' }; });
}
function createTemporaryPipRow(beforeRow) {
  const row = document.createElement('div'); row.className = 'track-row temporary-pip-track';
  // Keep the transient drop target outside the `pip-*` real-track namespace.
  // Real PiP discovery relies on that prefix to find the top committed lane.
  row.dataset.trackId = 'temporary-pip-preview'; row.dataset.trackType = 'video';
  const head = document.createElement('div'); head.className = 'track-head';
  const icon = document.createElement('span'); icon.className = 'track-icon'; icon.textContent = '▣';
  const label = document.createElement('b'); label.textContent = '画中画（临时）';
  head.append(icon, label);
  const lane = document.createElement('div'); lane.className = 'track-lane temporary-pip-lane'; lane.textContent = '松开鼠标，将片段放入新轨道';
  lane.style.backgroundSize = `${pixelsPerSecond}px 100%`;
  row.append(head, lane); beforeRow.before(row);
  return row;
}
function trackRowAtPoint(x, y) {
  return [...$('#timelineTracks').querySelectorAll('.track-row')].find(row => {
    const lane = row.querySelector('.track-lane');
    if (!lane) return false;
    const rect = lane.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  }) || null;
}
function addTrackClip(trackId) {
  const target = tracks.find(item => item.id === trackId); if (!target) return;
  if (target.type === 'video') {
    const { track, clip } = selectedRecord();
    if (!clip || track.type !== 'video' || track.id.startsWith('pip-')) return notify('先选中主视频片段，再放入画中画轨道。', true);
    const copy = { ...clip, id: `${clip.id}-pip-${++timelineItemSequence}`, style: 'overlay-clip', annotationCount: 0 };
    recordEdit(`添加到${target.label}`, () => { target.clips.push(copy); selected = { trackId: target.id, clipId: copy.id }; }, () => {});
    return;
  }
  const item = { id: `${target.id}-item-${++timelineItemSequence}`, name: target.type === 'caption' ? '新字幕' : target.type === 'audio' ? '新增音效' : target.label, start: playheadFrame, duration: FPS * 2, style: target.type === 'caption' ? 'subtitle-clip' : target.type === 'audio' ? 'sfx-clip' : 'overlay-clip' };
  recordEdit(`添加${target.label}`, () => { target.clips.push(item); selected = { trackId: target.id, clipId: item.id }; }, () => {});
}
function resourceTrackId(resource) {
  return ({ audio: 'music', sfx: 'sfx', caption: 'captions', text: 'text-sticker', effect: 'effects' })[resource.kind] || null;
}
function showResourceDropPreview(resource) {
  const trackId = resourceTrackId(resource);
  if (!trackId || $(`.track-row[data-track-id="${trackId}"]`)) return;
  const definition = OPTIONAL_TRACKS[trackId];
  const row = document.createElement('div'); row.className = 'track-row resource-drop-preview';
  row.dataset.trackId = trackId; row.dataset.trackType = definition.type;
  const head = document.createElement('div'); head.className = 'track-head';
  const icon = document.createElement('span'); icon.className = 'track-icon'; icon.textContent = definition.icon;
  const label = document.createElement('b'); label.textContent = `${definition.label}（临时落点）`;
  head.append(icon, label);
  const lane = document.createElement('div'); lane.className = 'track-lane resource-drop-preview-lane';
  lane.dataset.trackId = trackId; lane.dataset.trackType = definition.type;
  lane.textContent = `把“${resource.name}”放到${definition.label}轨道`;
  lane.style.backgroundSize = `${pixelsPerSecond}px 100%`;
  row.append(head, lane);
  const rows = [...timelineTracksRoot.querySelectorAll('.track-row')];
  const nextRow = trackId === 'text-sticker' || trackId === 'effects'
    ? rows.find(item => item.dataset.trackId === 'video' || item.dataset.trackId.startsWith('pip-'))
    : trackId === 'captions'
      ? rows.find(item => item.dataset.trackType === 'audio')
      : trackId === 'music'
        ? rows.find(item => item.dataset.trackId === 'sfx')
        : null;
  if (nextRow) nextRow.before(row); else timelineTracksRoot.append(row);
  resourceDropPreviewRow = row;
}
function fineResourceAllowed(resource, track) {
  if (!track) return false;
  if (resource.kind === 'video' || resource.kind === 'image') return track.type === 'video';
  if (resource.kind === 'effect') return Boolean(resource.effect?.engineKind) && (track.id === 'effects' || track.id === 'video');
  if (resource.kind === 'transition') return resource.transitionKind === 'cross_dissolve' && track.id === 'video';
  return resourceTrackId(resource) === track.id;
}
function mainVideoInsertionFrame(track, pointerFrame, excludedClipId, fallbackFrame = pointerFrame) {
  const targetFrame = Math.max(0, Math.round(pointerFrame));
  const target = track.clips
    .filter(item => item.id !== excludedClipId)
    .sort((a, b) => a.start - b.start)
    .find(item => targetFrame >= item.start && targetFrame <= item.start + item.duration);
  if (!target) return Math.max(0, Math.round(fallbackFrame));
  const midpoint = target.start + target.duration / 2;
  return targetFrame < midpoint ? target.start : target.start + target.duration;
}
function insertMainVideoClipContents(track, clip, frame, pointerFrame = frame) {
  const start = mainVideoInsertionFrame(track, pointerFrame, clip.id, frame);
  const downstream = track.clips
    .filter(existing => existing.id !== clip.id && existing.start >= start)
    .sort((a, b) => a.start - b.start);
  for (const existing of downstream) existing.start += clip.duration;
  clip.start = start;
  track.clips.push(clip);
  return { start, shiftedClipCount: downstream.length };
}
function moveMainVideoClip(track, clip, frame, pointerFrame = frame) {
  const originalOrder = [...track.clips].sort((a, b) => a.start - b.start);
  const baseStart = originalOrder[0]?.start || 0;
  const others = originalOrder.filter(item => item.id !== clip.id);
  const insertionStart = mainVideoInsertionFrame(track, pointerFrame, clip.id, frame);
  const insertAt = others.findIndex(item => item.start >= insertionStart);
  others.splice(insertAt < 0 ? others.length : insertAt, 0, clip);
  let cursor = baseStart;
  let changed = false;
  for (const item of others) {
    if (item.start !== cursor) changed = true;
    item.start = cursor;
    cursor += item.duration;
  }
  track.clips.splice(0, track.clips.length, ...others);
  return changed;
}
function insertMainVideoClip(track, clip, frame) {
  const start = Math.max(0, Math.round(frame));
  const insertionStart = mainVideoInsertionFrame(track, start, clip.id, start);
  recordEdit(`在 ${frameLabel(insertionStart)} 插入“${clip.name}”并顺延后续片段`, () => {
    insertMainVideoClipContents(track, clip, start, start);
    selected = { trackId: track.id, clipId: clip.id }; selectedTransitionId = null;
  });
}
function placeTransitionAtCut(resource, cut) {
  const existing = timelineTransitions.find(item => item.leftClipId === cut.leftClipId && item.rightClipId === cut.rightClipId);
  const transition = { id: existing?.id || `${resource.id}-${++timelineItemSequence}`, name: resource.name, kind: resource.transitionKind, duration: resource.duration, leftClipId: cut.leftClipId, rightClipId: cut.rightClipId };
  recordEdit(`${existing ? '替换' : '放置'}转场“${resource.name}”`, () => {
    if (existing) Object.assign(existing, transition);
    else timelineTransitions.push(transition);
    selectedTransitionId = transition.id;
  });
  notify(`已在相邻片段剪辑点放置“${resource.name}”示意；本页不连接 Project Host 或转场渲染。`);
}
function insertFineResource(resource, targetTrack, frame) {
  if (!fineResourceAllowed(resource, targetTrack)) return notify(`“${resource.name}”不能放到${targetTrack.label}轨道。`, true);
  if (resource.kind === 'video' || resource.kind === 'image') {
    const duration = resource.duration || FPS * 3;
    const draft = { id: `${resource.id}-${++timelineItemSequence}`, start: frame, duration };
    const start = magnetEnabled ? snapFrame(draft, frame, duration) : Math.max(0, Math.round(frame));
    const clip = { ...draft, name: resource.name, style: targetTrack.id.startsWith('pip-') ? 'overlay-clip' : resource.style || 'clip-a' };
    if (targetTrack.id === 'video') insertMainVideoClip(targetTrack, clip, start);
    else {
      const placement = resolvePlacement(targetTrack, draft, draft, start - frame, null);
      if (!fitsTrack(targetTrack, draft, placement)) return notify(`“${resource.name}”落点与${targetTrack.label}已有片段重叠，请拖到空白时段。`, true);
      Object.assign(clip, placement);
      recordEdit(`添加素材“${resource.name}”`, () => { targetTrack.clips.push(clip); selected = { trackId: targetTrack.id, clipId: clip.id }; });
    }
    return;
  }
  if (resource.kind === 'audio' || resource.kind === 'sfx' || resource.kind === 'caption' || resource.kind === 'text') {
    const targetId = resource.kind === 'audio' ? 'music' : resource.kind === 'sfx' ? 'sfx' : resource.kind === 'caption' ? 'captions' : 'text-sticker';
    let track = targetTrack.id === targetId ? targetTrack : tracks.find(item => item.id === targetId);
    const createTrack = !tracks.includes(track);
    if (createTrack) track = makeOptionalTrack(targetId);
    const duration = resource.duration || FPS * 3;
    const draft = { id: `${resource.id}-${++timelineItemSequence}`, start: frame, duration };
    const start = magnetEnabled ? snapFrame(draft, frame, duration) : Math.max(0, Math.round(frame));
    const clip = { ...draft, name: resource.name, start, style: resource.style || 'overlay-clip' };
    recordEdit(`添加${track.label}“${resource.name}”`, () => { if (createTrack) insertOptionalTrack(track); track.clips.push(clip); selected = { trackId: track.id, clipId: clip.id }; });
    return;
  }
  if (resource.kind === 'effect') {
    const videoTrack = tracks.find(track => track.id === 'video');
    const targetVideo = videoTrack?.clips.find(clip => frame >= clip.start && frame < clip.start + clip.duration);
    if (!targetVideo) return notify('请把特效放到有视频画面的时间位置。', true);
    const effect = EFFECT_PRESETS.find(item => item.id === resource.effectId);
    addEffectToTimeline(effect, targetVideo);
    return;
  }
  const cut = nearestTransitionCut(frame);
  if (!cut) return notify('转场必须落在两个相邻视频片段的剪辑点上。', true);
  placeTransitionAtCut(resource, cut);
}
const timelineTracksRoot = $('#timelineTracks');
timelineTracksRoot.addEventListener('dragover', event => {
  const lane = event.target.closest('.track-lane');
  const resource = FINE_RESOURCES.find(item => item.id === draggingFineResourceId);
  if (!lane || !resource) return;
  $$('.track-lane').forEach(item => item.classList.remove('resource-drop-target', 'resource-drop-invalid'));
  if (resource.kind === 'transition') {
    if (!fineResourceAllowed(resource, tracks.find(track => track.id === 'video')) || lane.dataset.trackId !== 'video') { clearTransitionDropPreview(); lane.classList.add('resource-drop-invalid'); return; }
    event.preventDefault(); event.dataTransfer.dropEffect = 'copy';
    const frame = exactFrameAtPointer(event), cut = nearestTransitionCut(frame);
    lane.classList.toggle('resource-drop-target', Boolean(cut));
    lane.classList.toggle('resource-drop-invalid', !cut);
    showTransitionDropPreview(cut, lane, frame);
    return;
  }
  clearTransitionDropPreview();
  const track = tracks.find(item => item.id === lane.dataset.trackId)
    || (lane.dataset.trackId === resourceTrackId(resource) ? makeOptionalTrack(lane.dataset.trackId) : null);
  if (!track || !fineResourceAllowed(resource, track)) { lane.classList.add('resource-drop-invalid'); return; }
  event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; lane.classList.add('resource-drop-target');
});
timelineTracksRoot.addEventListener('dragleave', event => {
  const lane = event.target.closest('.track-lane');
  if (lane && !lane.contains(event.relatedTarget)) {
    lane.classList.remove('resource-drop-target', 'resource-drop-invalid');
    if (lane.dataset.trackId === 'video') clearTransitionDropPreview();
  }
});
timelineTracksRoot.addEventListener('drop', event => {
  const lane = event.target.closest('.track-lane'); if (!lane) return;
  event.preventDefault(); lane.classList.remove('resource-drop-target', 'resource-drop-invalid');
  const resourceId = event.dataTransfer.getData('application/x-ave-demo-resource') || event.dataTransfer.getData('text/plain') || draggingFineResourceId;
  const resource = FINE_RESOURCES.find(item => item.id === resourceId);
  if (!resource) { clearTransitionDropPreview(); return notify('素材或目標軌道已不存在，请重新拖动。', true); }
  if (resource.kind === 'transition') {
    clearTransitionDropPreview();
    if (!fineResourceAllowed(resource, tracks.find(track => track.id === 'video'))) return notify('此转场类型当前不可用于剪辑点拖放。', true);
    if (lane.dataset.trackId !== 'video') return notify('转场只能放在主视频轨的剪辑点，不属于独立轨道。', true);
    const cut = nearestTransitionCut(exactFrameAtPointer(event));
    if (!cut) return notify('转场必须落在两个相邻视频片段的剪辑点上。', true);
    return placeTransitionAtCut(resource, cut);
  }
  const track = tracks.find(item => item.id === lane.dataset.trackId)
    || (lane.dataset.trackId === resourceTrackId(resource) ? makeOptionalTrack(lane.dataset.trackId) : null);
  if (!track || !fineResourceAllowed(resource, track)) return notify(`“${resource.name}”不能放到此轨道。`, true);
  resourceDropPreviewRow?.remove(); resourceDropPreviewRow = null;
  insertFineResource(resource, track, exactFrameAtPointer(event));
});
$('#addTrackType').addEventListener('change', event => {
  const id = event.target.value; event.target.value = '';
  if (id) createEmptyTrack(id);
});
$('#splitClip').onclick = $('#splitSelected').onclick = splitSelectedClip;
$('#deleteClip').onclick = deleteSelectedClip;
$('#fineUndo').onclick = () => { if (!undoStack.length) return notify('没有可撤销的精修操作。', true); const action = undoStack.pop(); restoreEdit(action.before, action.beforeSelected, action.beforeFrame, action.beforeTransitions, action.beforeSelectedTransition); redoStack.push(action); notify(`已撤销：${action.label}。`); };
$('#fineRedo').onclick = () => { if (!redoStack.length) return notify('没有可重做的精修操作。', true); const action = redoStack.pop(); restoreEdit(action.after, action.afterSelected, action.afterFrame, action.afterTransitions, action.afterSelectedTransition); undoStack.push(action); notify(`已重做：${action.label}。`); };
$('#timelineContextMenu').addEventListener('click', event => {
  const action = event.target.closest('[data-context-action]')?.dataset.contextAction; $('#timelineContextMenu').hidden = true;
  if (action === 'annotate') beginAnnotation();
  if (action === 'split') splitSelectedClip();
  if (action === 'duplicate') duplicateSelectedClip();
  if (action === 'delete') deleteSelectedClip();
});
document.addEventListener('click', event => { if (!event.target.closest('#timelineContextMenu')) $('#timelineContextMenu').hidden = true; });
function applyZoom(value, anchorX = null) {
  const viewport = $('#timelineViewport'), old = pixelsPerSecond;
  const ratio = anchorX === null ? viewport.clientWidth / 2 / old : Math.max(0, (anchorX - viewport.getBoundingClientRect().left + viewport.scrollLeft - TRACK_LABEL_WIDTH) / old);
  pixelsPerSecond = 42 + (Number(value) - 1) * 24;
  renderTimeline(); viewport.scrollLeft = Math.max(0, TRACK_LABEL_WIDTH + ratio * pixelsPerSecond - (anchorX === null ? viewport.clientWidth / 2 : anchorX - viewport.getBoundingClientRect().left));
}
document.addEventListener('wheel', event => {
  const viewport = event.target.closest('#timelineViewport');
  if (!viewport) return;
  if (event.altKey || event.shiftKey) {
    event.preventDefault();
    if (event.altKey) viewport.scrollLeft += event.deltaY || event.deltaX;
    else viewport.scrollTop += event.deltaY;
    return;
  }
  event.preventDefault();
  const slider = $('#timelineZoom');
  const next = Math.max(1, Math.min(12, Number(slider.value) + (event.deltaY < 0 ? 1 : -1)));
  slider.value = String(next);
  applyZoom(slider.value, event.clientX);
}, { passive: false });
$('#timelineZoom').addEventListener('input', event => applyZoom(event.target.value));
$('#snapToggle').onclick = event => {
  magnetEnabled = !magnetEnabled;
  event.currentTarget.classList.toggle('selected-tool', magnetEnabled);
  event.currentTarget.setAttribute('aria-pressed', String(magnetEnabled));
  notify(magnetEnabled ? '时间线吸附已开启：片段边缘会对齐到剪辑边界和播放头。' : '时间线吸附已关闭：片段仍按帧定位。');
};
$$('[data-tool="select"]').forEach(button => button.addEventListener('click', () => { $$('[data-tool="select"]').forEach(item => item.classList.toggle('selected-tool', item === button)); notify('已切换到选择工具（演示）。'); }));
$('#timelineCanvas').addEventListener('pointerdown', event => {
  if (event.target.closest('.clip') || event.target.closest('#timelineRuler')) return;
  selectedTransitionId = null;
  $$('.transition-marker').forEach(node => node.classList.remove('selected'));
  playheadFrame = frameAtPointer(event); drawPlayhead();
});
$('#timelineRuler').addEventListener('pointerdown', event => { selectedTransitionId = null; $$('.transition-marker').forEach(node => node.classList.remove('selected')); playheadFrame = frameAtPointer(event); drawPlayhead(); });
$('#timelineCanvas').addEventListener('contextmenu', event => {
  if (event.target.closest('.clip')) return; event.preventDefault(); openTimelineMenu(event);
});
$('#fineVideoFrame').addEventListener('contextmenu', openPreviewAnnotationMenu);
function updateChatPlacement() {
  const bubble = $('#globalChat').getBoundingClientRect();
  const panelHeight = Math.min(500, innerHeight * .68), panelWidth = Math.min(410, innerWidth - 36);
  $('#globalChat').dataset.chatPlacement = bubble.top > panelHeight + 20 ? 'above' : 'below';
  $('#globalChat').dataset.chatAlignment = bubble.left + panelWidth <= innerWidth ? 'left' : 'right';
}
function clampChatPosition(x, y) {
  const bubble = $('#toggleFineChat'), width = bubble.offsetWidth, height = bubble.offsetHeight;
  return { x: Math.max(8, Math.min(innerWidth - width - 8, x)), y: Math.max(8, Math.min(innerHeight - height - 8, y)) };
}
function saveChatPosition(x, y) {
  try { localStorage.setItem('ave-p4-chat-position', JSON.stringify({ x, y })); }
  catch { notify('对话气泡位置无法写入浏览器偏好；本次页面仍可拖动。', true); }
}
function restoreChatPosition() {
  try {
    const stored = JSON.parse(localStorage.getItem('ave-p4-chat-position') || 'null');
    if (!stored || !Number.isFinite(stored.x) || !Number.isFinite(stored.y)) return;
    const position = clampChatPosition(stored.x, stored.y), chat = $('#globalChat');
    chat.style.left = `${position.x}px`; chat.style.top = `${position.y}px`; chat.style.right = 'auto'; chat.style.bottom = 'auto';
  } catch { /* Invalid local display preference is ignored. */ }
}
function installChatBubbleDrag() {
  const bubble = $('#toggleFineChat'), chat = $('#globalChat');
  bubble.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    const startX = event.clientX, startY = event.clientY, startRect = chat.getBoundingClientRect();
    let moved = false;
    bubble.setPointerCapture(event.pointerId);
    const move = moveEvent => {
      if (!bubble.hasPointerCapture(moveEvent.pointerId)) return;
      if (Math.abs(moveEvent.clientX - startX) + Math.abs(moveEvent.clientY - startY) > 5) moved = true;
      if (!moved) return;
      const position = clampChatPosition(startRect.left + moveEvent.clientX - startX, startRect.top + moveEvent.clientY - startY);
      chat.style.left = `${position.x}px`; chat.style.top = `${position.y}px`; chat.style.right = 'auto'; chat.style.bottom = 'auto';
      updateChatPlacement();
    };
    const finish = finishEvent => {
      bubble.removeEventListener('pointermove', move);
      if (bubble.hasPointerCapture(finishEvent.pointerId)) bubble.releasePointerCapture(finishEvent.pointerId);
      if (moved) {
        const rect = chat.getBoundingClientRect(); saveChatPosition(rect.left, rect.top); skipChatToggleClick = true;
        setTimeout(() => { skipChatToggleClick = false; }, 0);
      }
      updateChatPlacement();
    };
    bubble.addEventListener('pointermove', move);
    bubble.addEventListener('pointerup', finish, { once: true });
    bubble.addEventListener('pointercancel', finish, { once: true });
  });
}
restoreChatPosition(); installChatBubbleDrag(); updateChatPlacement();
window.addEventListener('resize', () => {
  const chat = $('#globalChat');
  if (chat.style.left) { const position = clampChatPosition(parseFloat(chat.style.left), parseFloat(chat.style.top)); chat.style.left = `${position.x}px`; chat.style.top = `${position.y}px`; }
  updateChatPlacement();
});
$('#toggleFineChat').onclick = () => {
  if (skipChatToggleClick) return;
  const opening = $('#fineChatPopover').hidden; $('#fineChatPopover').hidden = !opening;
  $('#toggleFineChat').setAttribute('aria-expanded', String(opening)); updateChatPlacement(); if (opening) $('#oneInput').focus();
};
renderFineResources();
renderTimeline();
$('#fineResizeGrip').addEventListener('pointerdown', event => {
  if (innerWidth <= 900) return;
  event.preventDefault();
  const layout = $('.fine-layout');
  const bounds = layout.getBoundingClientRect();
  const grip = event.currentTarget;
  grip.setPointerCapture(event.pointerId);
  const move = moveEvent => {
    if (!grip.hasPointerCapture(moveEvent.pointerId)) return;
    const first = Math.max(220, Math.min(bounds.height - 240, moveEvent.clientY - bounds.top));
    const rest = Math.max(220, bounds.height - first - 6);
    layout.style.gridTemplateRows = `${first}px 6px ${rest}px`;
  };
  const finish = upEvent => {
    if (grip.hasPointerCapture(upEvent.pointerId)) grip.releasePointerCapture(upEvent.pointerId);
    grip.removeEventListener('pointermove', move);
  };
  grip.addEventListener('pointermove', move);
  grip.addEventListener('pointerup', finish, { once: true });
  grip.addEventListener('pointercancel', finish, { once: true });
});
$('#fineResizeGrip').addEventListener('keydown', event => {
  if (!['ArrowUp', 'ArrowDown'].includes(event.key)) return;
  event.preventDefault();
  const layout = $('.fine-layout');
  const bounds = layout.getBoundingClientRect();
  const current = layout.querySelector('.fine-preview').getBoundingClientRect().height;
  const first = Math.max(220, Math.min(bounds.height - 240, current + (event.key === 'ArrowDown' ? 24 : -24)));
  layout.style.gridTemplateRows = `${first}px 6px ${Math.max(220, bounds.height - first - 6)}px`;
});
document.addEventListener('keydown', event => {
  if (!$('#screen-fine').classList.contains('active')) return;
  const editingText = event.target.matches('input,textarea,select,[contenteditable=true]');
  if (editingText) return;
  if (event.code === 'Space') { event.preventDefault(); togglePlay(); }
  else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); playheadFrame = Math.max(0, playheadFrame + (event.key === 'ArrowRight' ? 1 : -1)); drawPlayhead(); }
  else if (!event.ctrlKey && event.key.toLowerCase() === 'a') { event.preventDefault(); $('[data-tool="select"]').click(); }
  else if (event.ctrlKey && event.key.toLowerCase() === 'b') { event.preventDefault(); splitSelectedClip(); }
  else if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'z') { event.preventDefault(); $('#fineRedo').click(); }
  else if (event.ctrlKey && event.key.toLowerCase() === 'z') { event.preventDefault(); $('#fineUndo').click(); }
  else if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); deleteSelectedClip(); }
});
$('#saveFine').onclick = () => {
  $('#saveState').textContent = '已保存 · 演示数据';
  notify('精修修改已保存（演示）。');
};

$$('.version-open').forEach(button => button.addEventListener('click', () => {
  $$('.version-row').forEach(row => row.classList.toggle('current', row === button.closest('.version-row')));
  const version = button.closest('.version-row').querySelector('.version-info strong').textContent;
  notify(`已切换到 ${version} 预览（演示）；没有更改采用状态。`);
}));
$$('.adopt-version').forEach(button => button.addEventListener('click', () => {
  const version = button.closest('.version-row').querySelector('.version-info strong').textContent;
  notify(`已模拟采用 ${version}。`);
}));

$$('[data-toast]').forEach(button => button.addEventListener('click', () => notify(button.dataset.toast, button.dataset.error === 'true')));
$('#refreshIssues').onclick = () => notify('问题记录已刷新（演示），已关闭的问题仍保留。');
const trashConfirm = $('#trashConfirm');
let pendingTrashAction = null;
function updateTrashCount() {
  $('#trashCount').textContent = $$('.trash-card').length;
}
function askTrashConfirmation(title, text, action) {
  $('#trashConfirmTitle').textContent = title;
  $('#trashConfirmText').textContent = text;
  pendingTrashAction = action;
  trashConfirm.hidden = false;
  $('#confirmTrashAction').focus();
}
$('#moveToTrash').onclick = () => moveProjectToTrash($('#activeProject'), '春日漫步');
function moveProjectToTrash(project, projectTitle) {
  if (!project) return notify('当前作品已经移入回收站。', true);
  const card = document.createElement('article');
  card.className = 'trash-card';
  card.dataset.project = projectTitle;
  card.innerHTML = `<span class="project-icon">${projectTitle.slice(0,1)}</span><div class="project-info"><strong>${projectTitle}</strong><span>刚刚移入回收站</span><small>包含 3 个版本和 4 项素材（演示数据）</small></div><button class="button restore-one">恢复</button><button class="button danger delete-one">彻底删除</button>`;
  $('#trashList').prepend(card);
  project.remove();
  updateTrashCount();
  bindTrashCard(card);
  notify('作品已移入回收站（演示）；可在回收站恢复。');
  showScreen('trash');
}
function bindTrashCard(card) {
  $('.restore-one', card).onclick = () => {
    const title = $('.project-info strong', card).textContent;
    card.remove();
    addActiveProject(title);
    updateTrashCount();
    notify(`已恢复“${title}”（演示）。`);
  };
  $('.delete-one', card).onclick = () => askTrashConfirmation('彻底删除此作品？', `“${$('.project-info strong', card).textContent}”将从演示回收站移除。此页面不会删除任何真实数据。`, () => {
    card.remove(); updateTrashCount(); notify('已从演示回收站彻底移除该条目。');
  });
}
function addActiveProject(title) {
  if ($$('.project-card .project-info strong').some(item => item.textContent === title)) return;
  const restored = document.createElement('article');
  restored.className = 'project-card';
  restored.innerHTML = `<span class="project-icon">${title.slice(0,1)}</span><div class="project-info"><strong>${title}</strong><span>已从回收站恢复（演示）</span><small>演示数据 · 没有读写真实作品</small></div><button class="button open-restored">打开作品</button><button class="button danger move-restored">移入回收站</button>`;
  $('#projectList').append(restored);
  $('.open-restored', restored).onclick = () => showScreen('create');
  $('.move-restored', restored).onclick = () => moveProjectToTrash(restored, title);
}
$$('.trash-card').forEach(bindTrashCard);
$('#restoreAll').onclick = () => {
  const cards = $$('.trash-card');
  if (!cards.length) return notify('回收站目前没有可恢复的作品。', true);
  cards.forEach(card => { const title = $('.project-info strong', card).textContent; card.remove(); addActiveProject(title); }); updateTrashCount();
  notify(`已恢复 ${cards.length} 项演示作品。`);
};
$('#deleteAll').onclick = () => {
  if (!$$('.trash-card').length) return notify('回收站目前为空。', true);
  askTrashConfirmation('彻底删除回收站全部作品？', '这会移除回收站中的所有演示条目。真实产品必须再次确认，并遵守项目数据清理边界。', () => {
    $('#trashList').replaceChildren(); updateTrashCount(); notify('已清空演示回收站；没有删除任何真实数据。');
  });
};
$('#cancelTrashAction').onclick = () => { trashConfirm.hidden = true; pendingTrashAction = null; notify('已取消操作；演示条目保持不变。'); };
$('#confirmTrashAction').onclick = () => {
  const action = pendingTrashAction; pendingTrashAction = null; trashConfirm.hidden = true; action?.();
};
$('#startExport').onclick = () => notify('导出演示完成：没有创建文件，也没有启动下载。');

const resizerWidths = new WeakMap();
function getResizerWidths(grid) {
  if (!resizerWidths.has(grid)) {
    resizerWidths.set(grid, {
      assets: $('.asset-panel', grid).getBoundingClientRect().width,
      dialogue: $('.dialogue-panel', grid).getBoundingClientRect().width
    });
  }
  return resizerWidths.get(grid);
}
function applyCreateWidths(grid, changed, targetWidth) {
  const widths = getResizerWidths(grid);
  const bounds = grid.getBoundingClientRect();
  const gripSpace = 14;
  const previewMin = matchMedia('(max-width: 1100px)').matches ? 300 : 380;
  const otherWidth = changed === 'assets' ? widths.dialogue : widths.assets;
  const maxWidth = Math.max(220, bounds.width - gripSpace - previewMin - otherWidth);
  widths[changed] = Math.max(changed === 'assets' ? 200 : 260, Math.min(changed === 'assets' ? 440 : 460, maxWidth, targetWidth));
  grid.style.gridTemplateColumns = `${widths.assets}px 7px minmax(${previewMin}px,1fr) 7px ${widths.dialogue}px`;
}
function installResizer(grip) {
  const panelName = grip.dataset.grip;
  const grid = grip.parentElement;
  if (!grid.matches('.resizable, .resizable-gallery')) return;
  const onMove = event => {
    const bounds = grid.getBoundingClientRect();
    if (panelName === 'assets') {
      applyCreateWidths(grid, 'assets', event.clientX - bounds.left);
    } else if (panelName === 'dialogue') {
      applyCreateWidths(grid, 'dialogue', bounds.right - event.clientX);
    } else if (panelName === 'categories') {
      const width = Math.max(160, Math.min(340, event.clientX - bounds.left));
      grid.style.gridTemplateColumns = `${width}px 7px minmax(0,1fr)`;
    }
  };
  grip.addEventListener('pointerdown', event => {
    if (matchMedia('(max-width: 1100px)').matches && panelName !== 'categories') return;
    grip.setPointerCapture(event.pointerId);
    grip.classList.add('dragging');
    onMove(event);
  });
  grip.addEventListener('pointermove', event => {
    if (grip.hasPointerCapture(event.pointerId)) onMove(event);
  });
  const stop = event => {
    if (grip.hasPointerCapture(event.pointerId)) grip.releasePointerCapture(event.pointerId);
    grip.classList.remove('dragging');
  };
  grip.addEventListener('pointerup', stop);
  grip.addEventListener('pointercancel', stop);
}
$$('.resize-grip').forEach(installResizer);
$$('.resize-grip').forEach(grip => grip.addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  event.preventDefault();
  const panelName = grip.dataset.grip;
  const grid = grip.parentElement;
  const direction = event.key === 'ArrowRight' ? 12 : -12;
  if (panelName === 'assets') applyCreateWidths(grid, 'assets', getResizerWidths(grid).assets + direction);
  if (panelName === 'dialogue') applyCreateWidths(grid, 'dialogue', getResizerWidths(grid).dialogue - direction);
  const panel = grip.previousElementSibling;
  const width = panel.getBoundingClientRect().width + direction;
  if (panelName === 'categories') grid.style.gridTemplateColumns = `${Math.max(160, Math.min(340, width))}px 7px minmax(0,1fr)`;
}));

window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', event => {
  if (event.matches) notify('已响应系统的减少动态效果设置。');
});

