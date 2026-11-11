const clipEnd = clip => clip.timeline_start + clip.timeline_duration;
const sortedClips = track => [...track.clips].sort((left, right) => left.timeline_start < right.timeline_start ? -1 : left.timeline_start > right.timeline_start ? 1 : left.clip_id.localeCompare(right.clip_id));
const fail = message => { throw new Error(message); };
const gcd = (left, right) => { let a = left < 0n ? -left : left, b = right < 0n ? -right : right; while (b) [a, b] = [b, a % b]; return a; };
const lcm = (left, right) => left / gcd(left, right) * right;

function timebaseOf(timeline) {
  const timebase = timeline?.sequence?.timebase;
  if (!timebase || typeof timebase.value !== "bigint" || typeof timebase.timescale !== "bigint" || timebase.value <= 0n || timebase.timescale <= 0n) fail("作品缺少有效的精确帧时基");
  return timebase;
}

function mainVideoTrack(timeline) {
  timebaseOf(timeline);
  const tracks = (timeline.tracks ?? []).filter(track => track.kind === "video" && track.enabled !== false);
  const explicit = tracks.find(track => track.track_id === "video-main");
  const occupied = tracks.filter(track => track.clips.length > 0 && !isPictureInPictureTrack(track));
  const main = explicit ?? (occupied.length === 1 ? occupied[0] : null);
  if (!main) fail("无法唯一识别主视频轨；未修改作品");
  if (main.locked) fail("主视频轨已锁定，未修改作品");
  return main;
}

function editableVideoClipTrack(timeline, clipId) {
  timebaseOf(timeline);
  const videoTracks=(timeline.tracks??[]).filter(track=>track.kind==="video"&&track.enabled!==false);
  const main=videoTracks.find(track=>track.track_id==="video-main")??(()=>{const occupied=videoTracks.filter(track=>track.clips.length>0&&!isPictureInPictureTrack(track));return occupied.length===1?occupied[0]:null;})();
  if(!main)fail("无法唯一识别主视频轨；未修改作品");
  const matches=timeline.tracks.flatMap(track=>track.kind==="video"?track.clips.filter(clip=>clip.clip_id===clipId).map(clip=>({track,clip})):[]);
  if(matches.length!==1)fail("视频片段身份缺失或重复");
  const {track,clip}=matches[0];
  if(track.track_id!==main.track_id&&!isPictureInPictureTrack(track))fail("普通修剪与分割只支持主视频和画中画轨");
  if(track.enabled===false)fail(`轨道 ${track.track_id} 已停用，未修改作品`);
  if(track.locked)fail(`轨道 ${track.track_id} 已锁定，未修改作品`);
  return {track,clip};
}

export function isPictureInPictureTrack(track) {
  return track?.kind === "video" && (track.track_id.startsWith("video-pip-") || track.semantic_sidecar?.labels?.includes("picture-in-picture") === true);
}

export function mainVideoTrackId(timeline) { return mainVideoTrack(timeline).track_id; }

function assertNoRangeLock(track, start, end) {
  if ((track.locks ?? []).some(lock => lock.start < end && lock.end > start)) fail("操作范围与受保护的锁定区间重叠，未修改作品");
}

function replacement(track, next) { return { type: "restore_track", track_id: track.track_id, track: next }; }

export function sourceSpanClip(span, timebase, clipId) {
  if (!span || typeof span.asset_id !== "string" || !span.asset_id || typeof span.span_id !== "string" || !span.span_id) fail("请选择当前创作请求中获准的素材片段");
  if (span.media_kind !== "video") fail("此处只支持已获准的视频片段；图片和音频需使用对应素材轨道");
  const start = span.start, end = span.end;
  if (![start?.value, start?.timescale, end?.value, end?.timescale].every(Number.isSafeInteger) || start.value < 0 || end.value <= 0 || start.timescale <= 0 || end.timescale <= 0) fail("获准素材片段缺少有效源时间范围");
  const scale = lcm(BigInt(start.timescale), BigInt(end.timescale));
  const sourceStart = BigInt(start.value) * (scale / BigInt(start.timescale));
  const sourceEnd = BigInt(end.value) * (scale / BigInt(end.timescale));
  if (sourceEnd <= sourceStart) fail("获准素材片段时长必须大于零");
  const durationNumerator = (sourceEnd - sourceStart) * timebase.timescale;
  const durationDenominator = scale * timebase.value;
  if (durationNumerator % durationDenominator !== 0n) fail("素材片段时长未对齐作品帧边界，不能插入");
  const duration = durationNumerator / durationDenominator;
  if (duration <= 0n) fail("素材片段不足一帧，不能插入");
  return {
    clip_id: clipId,
    source: { asset_id: span.asset_id, start_pts: sourceStart, end_pts: sourceEnd, timescale: scale },
    timeline_start: 0n,
    timeline_duration: duration,
    media_kind: "video",
    kind: "media",
  };
}

function shiftTrackAt(track, at, delta) {
  let changed = false;
  if (track.locked && [...track.clips, ...(track.captions ?? []), ...(track.gaps ?? []), ...(track.transitions ?? [])].some(item => (item.timeline_start ?? item.start) >= at)) fail(`轨道 ${track.track_id} 已锁定，未修改作品`);
  assertNoRangeLock(track, at, 1n << 120n);
  const clips = track.clips.map(clip => {
    const end = clipEnd(clip);
    if (clip.timeline_start < at && end > at) fail(`轨道 ${track.track_id} 有片段跨过落点，无法安全顺延`);
    if (clip.timeline_start < at) return clip;
    changed = true;
    const timeline_start = clip.timeline_start + delta;
    if (timeline_start < 0n) fail("顺延会把片段移到作品起点之前");
    return { ...clip, timeline_start };
  });
  const captions = (track.captions ?? []).map(caption => {
    const end = caption.timeline_start + caption.timeline_duration;
    if (caption.timeline_start < at && end > at) fail(`轨道 ${track.track_id} 有字幕跨过落点，无法安全顺延`);
    if (caption.timeline_start < at) return caption;
    changed = true;
    return { ...caption, timeline_start: caption.timeline_start + delta };
  });
  const gaps = (track.gaps ?? []).map(gap => {
    const end = gap.timeline_start + gap.timeline_duration;
    if (gap.timeline_start < at && end > at) fail(`轨道 ${track.track_id} 有间隙跨过落点，无法安全顺延`);
    if (gap.timeline_start < at) return gap;
    changed = true;
    return { ...gap, timeline_start: gap.timeline_start + delta };
  });
  const transitions = (track.transitions ?? []).map(transition => {
    const end = transition.timeline_start + transition.timeline_duration;
    if (transition.timeline_start < at && end > at) fail(`轨道 ${track.track_id} 有转场跨过落点，无法安全顺延`);
    if (transition.timeline_start < at) return transition;
    changed = true;
    return { ...transition, timeline_start: transition.timeline_start + delta };
  });
  return changed ? { ...track, clips: sortedClips({ clips }), captions, gaps, transitions } : track;
}

export function insertVideoClip(timeline, clip, anchorClipId, side) {
  const target = mainVideoTrack(timeline), anchor = target.clips.find(item => item.clip_id === anchorClipId);
  if (!anchor || !["before", "after"].includes(side)) fail("请选择主视频轨中的片段，并指定插入到前面或后面");
  if (clip.timeline_duration <= 0n || !clip.clip_id || timeline.tracks.some(track => track.clips.some(item => item.clip_id === clip.clip_id))) fail("待插入片段身份或时长无效");
  const at = side === "before" ? anchor.timeline_start : clipEnd(anchor);
  const commands = [];
  for (const track of timeline.tracks) {
    const shifted = shiftTrackAt(track, at, clip.timeline_duration);
    if (track.track_id === target.track_id) {
      const inserted = { ...clip, timeline_start: at };
      commands.push(replacement(track, { ...shifted, clips: sortedClips({ clips: [...shifted.clips, inserted] }) }));
    } else if (shifted !== track) commands.push(replacement(track, shifted));
  }
  return commands;
}

function assertSimpleSequence(timeline, track) {
  if ((track.transitions ?? []).length || (track.gaps ?? []).length || (track.captions ?? []).length || (track.keyframes ?? []).length || (track.automation_curves ?? []).length || (track.locks ?? []).length) fail("此操作遇到字幕、转场、间隙或锁定语义；请先在专用控件中处理");
  for (const clip of track.clips) if ((clip.keyframes ?? []).length || (clip.automation_curves ?? []).length || clip.time_map || clip.speed && (clip.speed.numerator !== clip.speed.denominator)) fail(`片段 ${clip.clip_id} 含复杂时间或动画语义，未修改作品`);
  const clips = sortedClips(track);
  for (let index = 1; index < clips.length; index++) if (clips[index].timeline_start !== clipEnd(clips[index - 1])) fail("重排仅适用于连续主视频片段；当前时间线含间隙或重叠");
  return clips;
}

export function reorderVideoClip(timeline, clipId, anchorClipId, side) {
  const track = mainVideoTrack(timeline), clips = assertSimpleSequence(timeline, track);
  if (clipId === anchorClipId || !["before", "after"].includes(side)) fail("重排目标无效");
  const sourceIndex = clips.findIndex(item => item.clip_id === clipId), anchorIndex = clips.findIndex(item => item.clip_id === anchorClipId);
  if (sourceIndex < 0 || anchorIndex < 0) fail("重排目标已不在当前主视频轨中");
  const ordered = [...clips], [moving] = ordered.splice(sourceIndex, 1), updatedAnchor = ordered.findIndex(item => item.clip_id === anchorClipId);
  ordered.splice(updatedAnchor + (side === "after" ? 1 : 0), 0, moving);
  let cursor = clips[0].timeline_start;
  const moved = ordered.map(clip => { const result = { ...clip, timeline_start: cursor }; cursor += clip.timeline_duration; return result; });
  return [replacement(track, { ...track, clips: moved })];
}

function sourcePosition(clip, tick) {
  if (clip.time_map || clip.speed && clip.speed.numerator !== clip.speed.denominator) fail("此片段使用变速或时间映射，不能用普通边缘修剪");
  const offset = tick - clip.timeline_start, width = clip.source.end_pts - clip.source.start_pts;
  if (width <= 0n || clip.timeline_duration <= 0n) fail("片段源范围无效，未修改作品");
  const numerator = offset * width;
  if (numerator % clip.timeline_duration !== 0n) fail("播放头没有落在该片段可精确映射的源帧上，未修改作品");
  return clip.source.start_pts + numerator / clip.timeline_duration;
}

export function trimVideoClipToPlayhead(timeline, clipId, edge, tick) {
  const {track,clip}=editableVideoClipTrack(timeline,clipId);
  if (!clip || !["start", "end"].includes(edge)) fail("修剪对象或边缘无效");
  if (track.transitions?.some(item => item.from_clip_id === clipId || item.to_clip_id === clipId)) fail("片段绑定了转场；请先移除或调整转场，再修剪");
  const start = clip.timeline_start, end = clipEnd(clip);
  assertNoRangeLock(track, start, end);
  if (edge === "start" ? tick <= start || tick >= end : tick <= start || tick >= end) fail("播放头必须位于所选片段内部");
  const duration = edge === "start" ? end - tick : tick - start;
  if (duration <= 0n) fail("修剪后片段必须至少保留一帧");
  if(clip.kind==="image"){
    if(clip.time_map||clip.speed&&clip.speed.numerator!==clip.speed.denominator)fail("图片含变速或时间映射，不能用普通边缘修剪");
    const updated={...clip,...(edge==="start"?{timeline_start:tick}:{}),timeline_duration:duration};
    return [replacement(track,{...track,clips:track.clips.map(item=>item.clip_id===clipId?updated:item)})];
  }
  const sourceTick = sourcePosition(clip, tick);
  const updated = edge === "start"
    ? { ...clip, source: { ...clip.source, start_pts: sourceTick }, timeline_start: tick, timeline_duration: duration }
    : { ...clip, source: { ...clip.source, end_pts: sourceTick }, timeline_duration: duration };
  return [replacement(track, { ...track, clips: track.clips.map(item => item.clip_id === clipId ? updated : item) })];
}

export function trimTimelineClipToPlayhead(timeline, clipId, edge, tick) {
  const matches=timeline.tracks.flatMap(track=>track.clips.filter(item=>item.clip_id===clipId).map(clip=>({track,clip})));
  if(matches.length!==1)fail("修剪片段身份缺失或重复");
  const {track,clip}=matches[0];
  if(track.kind==="video")return trimVideoClipToPlayhead(timeline,clipId,edge,tick);
  if(track.kind!=="audio"||!clip||!['start','end'].includes(edge))fail("修剪对象或边缘无效");
  if(track.locked||track.enabled===false)fail(`轨道 ${track.track_id} 已锁定或停用，未修改作品`);
  const start=clip.timeline_start,end=clipEnd(clip);
  if(typeof tick!=="bigint"||tick<=start||tick>=end)fail("播放头必须位于所选音频片段内部");
  assertNoRangeLock(track,start,end);
  const sourceTick=sourcePosition(clip,tick),duration=edge==="start"?end-tick:tick-start;
  if(duration<=0n)fail("修剪后音频片段必须至少保留一帧");
  const fades={...(clip.boundary_fades??{})};
  delete fades[edge==="start"?"audio_fade_in":"audio_fade_out"];
  const next={...clip,source:{...clip.source,...(edge==="start"?{start_pts:sourceTick}:{end_pts:sourceTick})},...(edge==="start"?{timeline_start:tick}:{}),timeline_duration:duration};
  if(Object.keys(fades).length>1)next.boundary_fades=fades;else delete next.boundary_fades;
  return [replacement(track,{...track,clips:track.clips.map(item=>item.clip_id===clipId?next:item)})];
}

export function removeTimelineClip(timeline, trackId, clipId) {
  const matches = timeline.tracks.flatMap(track => track.clips.filter(clip => clip.clip_id === clipId).map(clip => ({ track, clip })));
  if (matches.length !== 1 || matches[0].track.track_id !== trackId) fail("所选片段身份缺失、重复或已移到其他轨道");
  const { track, clip } = matches[0];
  if (track.locked) fail(`轨道 ${track.track_id} 已锁定，未修改作品`);
  if ((track.transitions ?? []).some(item => item.from_clip_id === clipId || item.to_clip_id === clipId)) fail("片段绑定了剪辑点转场；请先移除转场再删除");
  assertNoRangeLock(track, clip.timeline_start, clipEnd(clip));
  const commands = [];
  for (const current of timeline.tracks) {
    const effects = (current.effects ?? []).filter(effect => effect.clip_id !== clipId);
    const audio_routing = (current.audio_routing ?? []).filter(route => route.source_clip_id !== clipId);
    if (current.track_id === trackId) {
      commands.push(replacement(current, { ...current, clips: current.clips.filter(item => item.clip_id !== clipId), effects, audio_routing }));
    } else if (effects.length !== (current.effects ?? []).length || audio_routing.length !== (current.audio_routing ?? []).length) {
      commands.push(replacement(current, { ...current, effects, audio_routing }));
    }
  }
  return commands;
}

export function duplicateVideoClipToPip(timeline, clipId, targetTrackId, at, newClipId) {
  if (typeof at !== "bigint" || at < 0n || !newClipId || timeline.tracks.some(track => track.clips.some(clip => clip.clip_id === newClipId))) fail("画中画副本身份或落点无效");
  const matches = timeline.tracks.flatMap(track => track.clips.filter(clip => clip.clip_id === clipId).map(clip => ({ track, clip })));
  if (matches.length !== 1 || matches[0].track.kind !== "video") fail("只能复制当前 Timeline 中唯一的视频或图片片段");
  const { track: sourceTrack, clip: sourceClip } = matches[0];
  if (["compound", "nested"].includes(sourceClip.kind) || sourceClip.time_map || sourceClip.speed && sourceClip.speed.numerator !== sourceClip.speed.denominator || sourceClip.static_reframe || sourceClip.effects?.length || sourceClip.keyframes?.length || sourceClip.automation_curves?.length || sourceClip.grade || sourceClip.mask) fail("片段含暂不支持无损复制的复合、变速、构图、效果或动画语义");
  const target = timeline.tracks.find(track => track.track_id === targetTrackId);
  if (!target || !isPictureInPictureTrack(target)) fail("副本必须放在画中画轨");
  const original = isPictureInPictureTrack(sourceTrack) ? restorePipTransform(sourceClip) : sourceClip;
  const copied = p4PipTransform({ ...original, clip_id: newClipId, timeline_start: at });
  validateDrop(timeline, target, copied, at);
  const copiedEffects = (sourceTrack.effects ?? []).filter(effect => effect.clip_id === clipId).map(effect => {
    if (!["grayscale", "blackwhite", "blur"].includes(effect.kind)) fail("片段含未注册效果，不能安全复制到画中画");
    return { ...effect, effect_id: `p4-duplicate-effect:${crypto.randomUUID()}`, clip_id: newClipId };
  });
  return [replacement(target, { ...target, clips: sortedClips({ clips: [...target.clips, copied] }), effects: [...(target.effects ?? []), ...copiedEffects] })];
}

export function splitVideoClipAtPlayhead(timeline, clipId, tick, newClipId) {
  const {track,clip}=editableVideoClipTrack(timeline,clipId);
  if (!clip || !newClipId || timeline.tracks.some(item => item.clips.some(existing => existing.clip_id === newClipId))) fail("分割对象或新片段身份无效");
  const start = clip.timeline_start, end = clipEnd(clip);
  if (tick <= start || tick >= end) fail("播放头必须位于所选片段内部才能分割");
  if (track.transitions?.some(item => item.from_clip_id === clipId || item.to_clip_id === clipId) || track.effects?.some(item => item.clip_id === clipId) || clip.effects?.length || clip.keyframes?.length || clip.automation_curves?.length) fail("片段含绑定转场、效果或动画语义，无法无损分割");
  assertNoRangeLock(track, start, end);
  const leftDuration = tick - start, rightDuration = end - tick;
  if(clip.kind==="image"){
    if(clip.time_map||clip.speed&&clip.speed.numerator!==clip.speed.denominator)fail("图片含变速或时间映射，不能普通分割");
    if(clip.boundary_fades)fail("图片含淡化语义；请先移除淡化再分割，以免在分割点重复淡入淡出");
    const left={...clip,timeline_duration:leftDuration};
    const right={...clip,clip_id:newClipId,timeline_start:tick,timeline_duration:rightDuration,...(clip.semantic_sidecar?{semantic_sidecar:{...clip.semantic_sidecar,semantic_id:newClipId}}:{})};
    return [replacement(track,{...track,clips:sortedClips({clips:track.clips.flatMap(item=>item.clip_id===clipId?[left,right]:[item])})})];
  }
  const sourceTick = sourcePosition(clip, tick);
  if (sourceTick <= clip.source.start_pts || sourceTick >= clip.source.end_pts) fail("分割点未对应有效源片帧");
  const left = { ...clip, source: { ...clip.source, end_pts: sourceTick }, timeline_duration: leftDuration };
  const right = { ...clip, clip_id: newClipId, source: { ...clip.source, start_pts: sourceTick }, timeline_start: tick, timeline_duration: rightDuration };
  return [replacement(track, { ...track, clips: sortedClips({ clips: track.clips.flatMap(item => item.clip_id === clipId ? [left, right] : [item]) }) })];
}

export function splitTimelineClipAtPlayhead(timeline,clipId,tick,newClipId) {
  const matches=timeline.tracks.flatMap(track=>track.clips.filter(item=>item.clip_id===clipId).map(clip=>({track,clip})));
  if(matches.length!==1)fail("分割对象身份缺失或重复");
  const {track,clip}=matches[0];
  if(track.kind==="video")return splitVideoClipAtPlayhead(timeline,clipId,tick,newClipId);
  if(track.kind!=="audio"||!clip||!newClipId||timeline.tracks.some(item=>item.clips.some(existing=>existing.clip_id===newClipId)))fail("音频分割对象或新片段身份无效");
  if(track.locked||track.enabled===false)fail(`轨道 ${track.track_id} 已锁定或停用，未修改作品`);
  const start=clip.timeline_start,end=clipEnd(clip);
  if(typeof tick!=="bigint"||tick<=start||tick>=end)fail("播放头必须位于所选音频片段内部才能分割");
  if(clip.boundary_fades||clip.effects?.length||clip.keyframes?.length||clip.automation_curves?.length||(track.effects??[]).some(item=>item.clip_id===clipId)||(track.keyframes??[]).some(item=>item.target_id===clipId)||(track.automation_curves??[]).some(item=>item.target_id===clipId))fail("音频片段含淡化、效果或动画语义；请先处理这些语义，再分割以避免声音变化");
  assertNoRangeLock(track,start,end);
  const sourceTick=sourcePosition(clip,tick);
  if(sourceTick<=clip.source.start_pts||sourceTick>=clip.source.end_pts)fail("分割点未对应有效音频源采样");
  const left={...clip,source:{...clip.source,end_pts:sourceTick},timeline_duration:tick-start};
  const rightBase={...clip,clip_id:newClipId,source:{...clip.source,start_pts:sourceTick},timeline_start:tick,timeline_duration:end-tick};
  const right=clip.semantic_sidecar?{...rightBase,semantic_sidecar:{...clip.semantic_sidecar,semantic_id:newClipId}}:rightBase;
  const routes=(track.audio_routing??[]).filter(route=>route.source_clip_id===clipId);
  if(routes.length>1)fail("音频片段关联了多个路由，未分割以避免混音变化");
  const nextRoutes=routes.length?[...(track.audio_routing??[]),{...routes[0],routing_id:`routing:${newClipId}`,source_clip_id:newClipId}]:track.audio_routing;
  return [replacement(track,{...track,clips:sortedClips({clips:track.clips.flatMap(item=>item.clip_id===clipId?[left,right]:[item])}),...(nextRoutes?{audio_routing:nextRoutes}:{})})];
}

export function replaceVideoEffect(timeline, clipId, kind, effectId) {
  const matches = timeline.tracks.filter(item => item.kind === "video" && item.clips.some(clip => clip.clip_id === clipId));
  if (matches.length !== 1) fail("所选视频片段身份缺失或重复");
  const track = matches[0], clip = track.clips.find(item => item.clip_id === clipId);
  if (track.locked) fail(`轨道 ${track.track_id} 已锁定，未修改作品`);
  assertNoRangeLock(track, clip.timeline_start, clipEnd(clip));
  if (!["grayscale", "blackwhite", "blur"].includes(kind)) fail("此效果尚未注册为 Preview 和 Master 均可执行的效果");
  if (clip.effects?.length) fail("片段含独立效果语义，不能安全替换");
  const current = (track.effects ?? []).filter(item => item.clip_id === clipId);
  if (current.length > 1 || current.some(item => !["grayscale", "blackwhite", "blur"].includes(item.kind))) fail("片段已有多个或不受支持的效果；为避免隐藏效果，未修改作品");
  const id = current[0]?.effect_id ?? effectId;
  if (!id) fail("效果缺少稳定身份");
  const effects = [...(track.effects ?? []).filter(item => item.clip_id !== clipId), { effect_id: id, clip_id: clipId, kind, enabled: true }];
  return [replacement(track, { ...track, effects })];
}

export function removeVideoEffect(timeline, clipId) {
  const matches = timeline.tracks.filter(item => item.kind === "video" && item.clips.some(clip => clip.clip_id === clipId));
  if (matches.length !== 1) fail("所选视频片段身份缺失或重复");
  const track = matches[0], clip = track.clips.find(item => item.clip_id === clipId);
  if (track.locked || track.enabled === false) fail(`轨道 ${track.track_id} 已锁定或停用`);
  assertNoRangeLock(track, clip.timeline_start, clipEnd(clip));
  if (clip.effects?.length) fail("片段含独立效果语义，不能安全清除轨道效果");
  const effects = (track.effects ?? []).filter(item => item.clip_id === clipId);
  if (!effects.length) fail("所选片段没有可移除的轨道效果");
  if (effects.length !== 1 || !["grayscale", "blackwhite", "blur"].includes(effects[0].kind)) fail("所选片段含多个或未注册效果；为避免隐藏效果，未修改作品");
  return [replacement(track, { ...track, effects: (track.effects ?? []).filter(item => item.clip_id !== clipId) })];
}

export function addCrossDissolve(timeline, fromClipId, overlap, transitionId) {
  const track = mainVideoTrack(timeline), clips = sortedClips(track), index = clips.findIndex(item => item.clip_id === fromClipId), from = clips[index], to = clips[index + 1];
  if (!from || !to || to.timeline_start !== clipEnd(from)) fail("请选择一个没有间隙的相邻剪辑点");
  if (typeof overlap !== "bigint" || overlap <= 0n || overlap >= from.timeline_duration || overlap >= to.timeline_duration) fail("转场时长必须小于剪辑点两侧的片段时长");
  if (!transitionId || timeline.tracks.some(item => item.transitions?.some(value => value.transition_id === transitionId)) || (track.transitions ?? []).some(item => item.from_clip_id === from.clip_id && item.to_clip_id === to.clip_id)) fail("剪辑点已有转场，或转场身份无效");
  const cut = to.timeline_start;
  const transitionStart = cut - overlap;
  const commands = [];
  for (const item of timeline.tracks) {
    if (item.locked && [...item.clips, ...(item.captions ?? []), ...(item.gaps ?? []), ...(item.transitions ?? [])].some(value => (value.timeline_start ?? 0n) >= cut)) fail(`轨道 ${item.track_id} 已锁定，不能安全缩短作品`);
    assertNoRangeLock(item, transitionStart, 1n << 120n);
    const clipsOnTrack = item.clips.map(clip => {
      const end = clipEnd(clip);
      if (clip.timeline_start < cut && end > cut) fail(`轨道 ${item.track_id} 有片段跨过剪辑点，不能安全缩短作品`);
      if (item.track_id !== track.track_id && clip.timeline_start >= transitionStart && clip.timeline_start < cut) fail(`轨道 ${item.track_id} 有片段落在转场压缩区，无法无损调整`);
      return clip.timeline_start >= cut ? { ...clip, timeline_start: clip.timeline_start - overlap } : clip;
    });
    const captions = (item.captions ?? []).map(caption => {
      const end = caption.timeline_start + caption.timeline_duration;
      if (caption.timeline_start < cut && end > cut) fail(`轨道 ${item.track_id} 有字幕跨过剪辑点，不能安全缩短作品`);
      if (caption.timeline_start >= transitionStart && caption.timeline_start < cut) fail(`轨道 ${item.track_id} 有字幕落在转场压缩区，无法无损调整`);
      return caption.timeline_start >= cut ? { ...caption, timeline_start: caption.timeline_start - overlap } : caption;
    });
    const gaps = (item.gaps ?? []).map(gap => {
      const end = gap.timeline_start + gap.timeline_duration;
      if (gap.timeline_start < cut && end > cut) fail(`轨道 ${item.track_id} 有间隙跨过剪辑点，不能安全缩短作品`);
      if (gap.timeline_start >= transitionStart && gap.timeline_start < cut) fail(`轨道 ${item.track_id} 有间隙落在转场压缩区，无法无损调整`);
      return gap.timeline_start >= cut ? { ...gap, timeline_start: gap.timeline_start - overlap } : gap;
    });
    const transitions = (item.transitions ?? []).map(value => {
      const end = value.timeline_start + value.timeline_duration;
      if (value.timeline_start < cut && end > cut) fail(`轨道 ${item.track_id} 的现有转场跨过剪辑点，无法安全缩短作品`);
      if (value.timeline_start >= transitionStart && value.timeline_start < cut) fail(`轨道 ${item.track_id} 的现有转场落在转场压缩区，无法无损调整`);
      return value.timeline_start >= cut ? { ...value, timeline_start: value.timeline_start - overlap } : value;
    });
    const added = item.track_id === track.track_id ? [{ transition_id: transitionId, kind: "cross_dissolve", from_clip_id: from.clip_id, to_clip_id: to.clip_id, timeline_start: transitionStart, timeline_duration: overlap }] : [];
    if (clipsOnTrack.some((value, index) => value !== item.clips[index]) || captions.some((value, index) => value !== item.captions?.[index]) || gaps.some((value, index) => value !== item.gaps?.[index]) || transitions.some((value, index) => value !== item.transitions?.[index]) || added.length) {
      commands.push(replacement(item, { ...item, clips: sortedClips({ clips: clipsOnTrack }), ...(item.captions ? { captions } : {}), ...(item.gaps ? { gaps } : {}), ...(item.transitions || added.length ? { transitions: [...transitions, ...added] } : {}) }));
    }
  }
  return commands;
}

export function removeCrossDissolve(timeline, transitionId) {
  const matches = timeline.tracks.flatMap(track => (track.transitions ?? []).filter(item => item.transition_id === transitionId).map(transition => ({ track, transition })));
  if (matches.length !== 1) fail("转场身份缺失或重复");
  const { track: transitionTrack, transition } = matches[0];
  if (transition.kind !== "cross_dissolve") fail("当前转场类型没有安全的移除映射");
  if (transitionTrack.track_id !== mainVideoTrackId(timeline)) fail("只有主视频轨上的交叉叠化可以移除");
  if (transitionTrack.locked || transitionTrack.enabled === false) fail(`轨道 ${transitionTrack.track_id} 已锁定或停用`);
  const start = transition.timeline_start, end = start + transition.timeline_duration;
  const commands = [];
  for (const item of timeline.tracks) {
    if (item.locked && [...item.clips, ...(item.captions ?? []), ...(item.gaps ?? []), ...(item.transitions ?? [])].some(value => (value.timeline_start ?? 0n) >= start)) fail(`轨道 ${item.track_id} 已锁定，不能还原转场时间`);
    assertNoRangeLock(item, start, 1n << 120n);
    const clips = item.clips.map(clip => clip.timeline_start >= start ? { ...clip, timeline_start: clip.timeline_start + transition.timeline_duration } : clip);
    const captions = (item.captions ?? []).map(caption => caption.timeline_start >= start ? { ...caption, timeline_start: caption.timeline_start + transition.timeline_duration } : caption);
    const gaps = (item.gaps ?? []).map(gap => gap.timeline_start >= start ? { ...gap, timeline_start: gap.timeline_start + transition.timeline_duration } : gap);
    const transitions = (item.transitions ?? []).filter(value => value.transition_id !== transitionId).map(value => value.timeline_start >= end ? { ...value, timeline_start: value.timeline_start + transition.timeline_duration } : value);
    if ((item.transitions ?? []).some(value => value.transition_id !== transitionId && value.timeline_start < end && value.timeline_start + value.timeline_duration > start)) fail(`轨道 ${item.track_id} 存在与该转场重叠的其他转场`);
    if (clips.some((value, index) => value !== item.clips[index]) || captions.some((value, index) => value !== item.captions?.[index]) || gaps.some((value, index) => value !== item.gaps?.[index]) || (item.transitions ?? []).some((value, index) => value !== transitions[index])) {
      commands.push(replacement(item, { ...item, clips: sortedClips({ clips }), ...(item.captions ? { captions } : {}), ...(item.gaps ? { gaps } : {}), ...(item.transitions ? { transitions } : {}) }));
    }
  }
  return commands;
}

function timelineAfterTrackReplacements(timeline, commands) {
  const replacements = new Map(commands.filter(command => command.type === "restore_track").map(command => [command.track_id, command.track]));
  return { ...timeline, tracks: timeline.tracks.map(track => replacements.get(track.track_id) ?? track) };
}

export function replaceCrossDissolve(timeline, transitionId, overlap) {
  const matches = timeline.tracks.flatMap(track => (track.transitions ?? []).filter(item => item.transition_id === transitionId).map(transition => ({ track, transition })));
  if (matches.length !== 1) fail("转场身份缺失或重复");
  const { transition } = matches[0];
  if (transition.kind !== "cross_dissolve") fail("当前转场类型没有安全的替换映射");
  const removeCommands = removeCrossDissolve(timeline, transitionId);
  const clearedTimeline = timelineAfterTrackReplacements(timeline, removeCommands);
  return [...removeCommands, ...addCrossDissolve(clearedTimeline, transition.from_clip_id, overlap, transitionId)];
}

function nextTrackId(timeline, prefix) {
  const used = new Set(timeline.tracks.map(track => track.track_id));
  for (let index = 1; index < 10000; index++) {
    const candidate = `${prefix}-${index}`;
    if (!used.has(candidate)) return candidate;
  }
  fail("可选轨道数量超出安全上限");
}

export function addWorkbenchTrack(timeline, kind, identity = crypto.randomUUID()) {
  timebaseOf(timeline);
  if (!identity || typeof identity !== "string") fail("轨道操作缺少唯一身份");
  const tracks = timeline.tracks ?? [];
  let track;
  let index;
  if (kind === "pip") {
    const main = mainVideoTrack(timeline);
    const track_id = nextTrackId(timeline, "video-pip");
    const z_index = Math.max(main.z_index ?? 0, ...tracks.filter(item => item.kind === "video").map(item => item.z_index ?? 0)) + 1;
    track = { track_id, kind: "video", clips: [], z_index, semantic_sidecar: { semantic_id: track_id, labels: ["p4", "picture-in-picture"], evidence_refs: [], metadata: { workbench_role: "picture-in-picture" } } };
    index = tracks.findIndex(item => item.track_id === main.track_id) + 1;
  } else if (kind === "captions" || kind === "text") {
    const main = mainVideoTrack(timeline);
    const track_id = nextTrackId(timeline, kind === "text" ? "video-text" : "video-captions");
    const z_index = Math.max(main.z_index ?? 0, ...tracks.filter(item => item.kind === "video").map(item => item.z_index ?? 0)) + 1;
    track = { track_id, kind: "video", clips: [], z_index, captions: [], semantic_sidecar: { semantic_id: track_id, labels: ["p4", kind], evidence_refs: [], metadata: { workbench_role: kind } } };
    index = tracks.length;
  } else if (["music", "sfx", "narration"].includes(kind)) {
    const track_id = nextTrackId(timeline, `audio-${kind}`);
    track = { track_id, kind: "audio", clips: [], semantic_sidecar: { semantic_id: track_id, labels: ["p4", "audio", kind], evidence_refs: [], metadata: { workbench_role: kind } } };
    index = tracks.length;
  } else fail("不支持的轨道类型");
  return { type: "add_track", track, index };
}

export function removeWorkbenchTrack(timeline, trackId) {
  const track = timeline.tracks.find(item => item.track_id === trackId);
  const role = track?.semantic_sidecar?.metadata?.workbench_role;
  if (!track || track.track_id === "video-main" || !["picture-in-picture", "captions", "text", "music", "sfx", "narration"].includes(role)) fail("只能移除工作台创建的可选轨道");
  if (track.locked) fail("轨道已锁定，请先解锁再删除");
  if ((track.locks ?? []).length) fail("轨道含有保护范围，移除保护后才能删除");
  return { type: "remove_track", track_id: trackId };
}

function p4PipTransform(clip) {
  if (clip.static_reframe) fail("当前片段含静态构图；请先清除构图后再放入画中画轨");
  const previous = JSON.stringify(clip.transform ?? null);
  const transform = clip.transform ?? {};
  return {
    ...clip,
    transform: {
      ...transform,
      position_mode: "normalized",
      x: 0.4,
      y: 0.08,
      scale_x: (transform.scale_x ?? 1) * 0.3,
      scale_y: (transform.scale_y ?? 1) * 0.3,
    },
    semantic_sidecar: {
      ...(clip.semantic_sidecar ?? { semantic_id: clip.clip_id, labels: [], evidence_refs: [] }),
      metadata: { ...(clip.semantic_sidecar?.metadata ?? {}), p4_workbench_previous_transform: previous },
    },
  };
}

function restorePipTransform(clip) {
  const marker = clip.semantic_sidecar?.metadata?.p4_workbench_previous_transform;
  if (typeof marker !== "string") fail("画中图片段缺少可逆变换记录，未移动");
  let transform;
  try { transform = JSON.parse(marker); } catch { fail("画中图片段变换记录损坏，未移动"); }
  const metadata = { ...(clip.semantic_sidecar?.metadata ?? {}) };
  delete metadata.p4_workbench_previous_transform;
  const semantic_sidecar = { ...clip.semantic_sidecar, metadata };
  if (!Object.keys(metadata).length) delete semantic_sidecar.metadata;
  return { ...clip, transform: transform ?? undefined, semantic_sidecar };
}

function validateDrop(timeline, track, clip, at) {
  if (typeof at !== "bigint" || at < 0n) fail("片段落点必须是非负精确帧");
  if (track.locked) fail(`轨道 ${track.track_id} 已锁定，未修改作品`);
  if (track.enabled === false) fail(`轨道 ${track.track_id} 已停用，未放入片段`);
  const end = at + clip.timeline_duration;
  assertNoRangeLock(track, at, end);
  if (track.clips.some(item => item.clip_id !== clip.clip_id && at < clipEnd(item) && item.timeline_start < end)) fail(`轨道 ${track.track_id} 的落点与已有片段重叠`);
}

export function moveVideoClipToTrack(timeline, clipId, targetTrackId, at) {
  timebaseOf(timeline);
  const sourceMatches = timeline.tracks.flatMap(track => track.clips.filter(clip => clip.clip_id === clipId).map(clip => ({ track, clip })));
  if (sourceMatches.length !== 1) fail("所选片段身份缺失或重复，未移动");
  const { track: sourceTrack, clip: sourceClip } = sourceMatches[0];
  const main = mainVideoTrack(timeline);
  if (sourceTrack.kind !== "video") fail("只有视频或图片片段可以放入画中画轨");
  if (sourceTrack.locked) fail(`轨道 ${sourceTrack.track_id} 已锁定，未修改作品`);
  if (sourceTrack.transitions?.some(item => item.from_clip_id === clipId || item.to_clip_id === clipId)) fail("片段绑定了剪辑点转场；请先移除转场再跨轨移动");
  const target = timeline.tracks.find(track => track.track_id === targetTrackId);
  if (!target || target.kind !== "video") fail("目标必须是当前 Timeline 中的视频轨");
  if (target.track_id !== main.track_id && !isPictureInPictureTrack(target)) fail("主视频片段只能移动到画中画轨，文字轨不接受视频片段");
  const adjusted = target.track_id === main.track_id && isPictureInPictureTrack(sourceTrack)
    ? restorePipTransform(sourceClip)
    : target.track_id !== main.track_id && !isPictureInPictureTrack(sourceTrack)
      ? p4PipTransform(sourceClip)
      : sourceClip;
  if (target.track_id === main.track_id && sourceTrack.track_id !== main.track_id) {
    if (sourceTrack.transitions?.some(item => item.from_clip_id === clipId || item.to_clip_id === clipId)) fail("片段绑定了剪辑点转场；请先移除转场再跨轨移动");
    const insertion = main.clips.find(item => at >= item.timeline_start && at < clipEnd(item));
    const insertionAt = insertion ? (at < insertion.timeline_start + insertion.timeline_duration / 2n ? insertion.timeline_start : clipEnd(insertion)) : at;
    const effectsToMove = (sourceTrack.effects ?? []).filter(effect => effect.clip_id === clipId);
    const withoutMovingClip = { ...timeline, tracks: timeline.tracks.map(track => track.track_id === sourceTrack.track_id ? { ...track, clips: track.clips.filter(item => item.clip_id !== clipId), effects: (track.effects ?? []).filter(item => item.clip_id !== clipId) } : track.track_id === main.track_id ? { ...track, effects: [...(track.effects ?? []), ...effectsToMove] } : track) };
    return insertClipAtTimeline(withoutMovingClip, main.track_id, adjusted, insertionAt, [sourceTrack.track_id]);
  }
  validateDrop(timeline, target, adjusted, at);
  if (sourceTrack.track_id === target.track_id) {
    return [{ type: "move_clip", track_id: sourceTrack.track_id, clip_id: clipId, timeline_start: at }];
  }
  const targetTrack = { ...target, clips: sortedClips({ clips: [...target.clips, { ...adjusted, timeline_start: at }] }), effects: [...(target.effects ?? []), ...(sourceTrack.effects ?? []).filter(effect => effect.clip_id === clipId)] };
  const nextSource = { ...sourceTrack, clips: sourceTrack.clips.filter(clip => clip.clip_id !== clipId), effects: (sourceTrack.effects ?? []).filter(effect => effect.clip_id !== clipId) };
  return [
    { type: "restore_track", track_id: sourceTrack.track_id, track: nextSource },
    { type: "restore_track", track_id: target.track_id, track: targetTrack },
  ];
}

export function moveAudioClipToTrack(timeline,clipId,targetTrackId,at) {
  timebaseOf(timeline);
  if(typeof at!=="bigint"||at<0n)fail("音频落点必须是非负精确帧");
  const matches=timeline.tracks.flatMap(track=>track.clips.filter(clip=>clip.clip_id===clipId).map(clip=>({track,clip})));
  if(matches.length!==1)fail("所选音频片段身份缺失或重复，未移动");
  const {track:sourceTrack,clip}=matches[0],target=timeline.tracks.find(track=>track.track_id===targetTrackId);
  if(sourceTrack.kind!=="audio"||target?.kind!=="audio")fail("音频片段只能放入音频轨");
  if(sourceTrack.locked||sourceTrack.enabled===false)fail(`来源轨道 ${sourceTrack.track_id} 已锁定或停用，未修改作品`);
  if(!target)fail("目标音频轨不存在");
  validateDrop(timeline,target,clip,at);
  if((sourceTrack.transitions??[]).some(item=>item.from_clip_id===clipId||item.to_clip_id===clipId))fail("音频片段绑定了转场，无法安全移动");
  assertNoRangeLock(sourceTrack,clip.timeline_start,clipEnd(clip));
  if(sourceTrack.track_id===target.track_id){
    if(at===clip.timeline_start)return [];
    return [{type:"move_clip",track_id:sourceTrack.track_id,clip_id:clipId,timeline_start:at}];
  }
  const routes=(sourceTrack.audio_routing??[]).filter(route=>route.source_clip_id===clipId);
  if(routes.length>1)fail("音频片段关联了多个路由，未移动以避免丢失混音设置");
  const route=routes[0];
  if(route&&(target.audio_routing??[]).some(item=>item.routing_id===route.routing_id||item.source_clip_id===clipId))fail("目标轨已有冲突的音频路由身份，未移动");
  const targetRole=target.semantic_sidecar?.metadata?.workbench_role;
  const movedRoute=route&&["music","sfx","narration"].includes(targetRole)?{...route,bus:targetRole}:route;
  const movingEffects=(sourceTrack.effects??[]).filter(effect=>effect.clip_id===clipId);
  const movingKeyframes=(sourceTrack.keyframes??[]).filter(keyframe=>keyframe.target_id===clipId);
  const movingCurves=(sourceTrack.automation_curves??[]).filter(curve=>curve.target_id===clipId);
  const nextSource={...sourceTrack,clips:sourceTrack.clips.filter(item=>item.clip_id!==clipId),audio_routing:(sourceTrack.audio_routing??[]).filter(item=>item.source_clip_id!==clipId),effects:(sourceTrack.effects??[]).filter(item=>item.clip_id!==clipId),keyframes:(sourceTrack.keyframes??[]).filter(item=>item.target_id!==clipId),automation_curves:(sourceTrack.automation_curves??[]).filter(item=>item.target_id!==clipId)};
  const nextTarget={...target,clips:sortedClips({clips:[...target.clips,{...clip,timeline_start:at}]}),...(movedRoute?{audio_routing:[...(target.audio_routing??[]),movedRoute]}:{}),effects:[...(target.effects??[]),...movingEffects],keyframes:[...(target.keyframes??[]),...movingKeyframes],automation_curves:[...(target.automation_curves??[]),...movingCurves]};
  return [replacement(sourceTrack,nextSource),replacement(target,nextTarget)];
}

function insertClipAtTimeline(timeline, targetTrackId, clip, at, forceReplaceTrackIds = []) {
  if (typeof at !== "bigint" || at < 0n || clip.timeline_duration <= 0n) fail("插入位置或片段时长无效");
  const target = timeline.tracks.find(track => track.track_id === targetTrackId);
  if (!target || target.kind !== "video") fail("插入目标必须是视频轨");
  if (target.locked) fail(`轨道 ${target.track_id} 已锁定，未修改作品`);
  assertNoRangeLock(target, at, at + clip.timeline_duration);
  if (timeline.tracks.some(track => track.clips.some(item => item.clip_id === clip.clip_id))) fail("片段身份已存在，未插入");
  const commands = [];
  for (const track of timeline.tracks) {
    const shifted = shiftTrackAt(track, at, clip.timeline_duration);
    if (track.track_id === targetTrackId) {
      const placed = { ...clip, timeline_start: at };
      commands.push(replacement(track, { ...shifted, clips: sortedClips({ clips: [...shifted.clips, placed] }) }));
    } else if (shifted !== track || forceReplaceTrackIds.includes(track.track_id)) commands.push(replacement(track, shifted));
  }
  return commands;
}

function sourceRange(span, timebase, kind) {
  const start = span?.start, end = span?.end;
  if (!span || typeof span.asset_id !== "string" || !span.asset_id || typeof span.span_id !== "string" || !span.span_id) fail("请选择当前创作请求中获准的素材片段");
  if (kind === "image") {
    const frameTicks = timebase.value;
    return { start_pts: 0n, end_pts: frameTicks, timescale: timebase.timescale };
  }
  if (![start?.value, start?.timescale, end?.value, end?.timescale].every(Number.isSafeInteger) || start.value < 0 || end.value <= start.value || start.timescale <= 0 || end.timescale <= 0) fail("获准素材片段缺少有效源时间范围");
  const scale = lcm(BigInt(start.timescale), BigInt(end.timescale));
  const sourceStart = BigInt(start.value) * (scale / BigInt(start.timescale));
  const sourceEnd = BigInt(end.value) * (scale / BigInt(end.timescale));
  if (sourceEnd <= sourceStart) fail("获准素材片段源范围无效");
  return { start_pts: sourceStart, end_pts: sourceEnd, timescale: scale };
}

export function audioPlacementRange(timeline, span) {
  if (span?.media_kind !== "audio") return null;
  const timebase = timebaseOf(timeline), range = sourceRange(span, timebase, "audio");
  const numerator = (range.end_pts - range.start_pts) * timebase.timescale;
  const denominator = range.timescale * timebase.value;
  if (numerator % denominator === 0n) return null;
  // Both the project frame grid and the source clock must map exactly.
  const quantum = timebase.timescale / gcd(denominator, timebase.timescale);
  const duration = numerator / denominator / quantum * quantum;
  if (duration <= 0n) fail("获准音频片段不足一个可精确映射的完整帧范围，请在精确编辑中选择其他源范围");
  const sourceDuration = duration * denominator / timebase.timescale;
  return { duration, sourceDuration, range, timebase, omitted: range.end_pts - range.start_pts - sourceDuration };
}

export function addAuthorizedMediaClip(timeline, span, trackId, at, clipId, requestedDuration = null) {
  const timebase = timebaseOf(timeline), track = timeline.tracks.find(item => item.track_id === trackId);
  if (!track || !clipId || timeline.tracks.some(item => item.clips.some(clip => clip.clip_id === clipId))) fail("素材或目标轨道身份无效");
  const kind = span?.media_kind;
  const role = track.semantic_sidecar?.metadata?.workbench_role;
  if (role === "captions" || role === "text") fail("字幕和文字轨只接受文字对象，不能接收媒体素材");
  if (role === "picture-in-picture" && kind !== "video" && kind !== "image") fail("画中画轨只接受视频或图片素材");
  if (["music", "sfx", "narration"].includes(role) && kind !== "audio") fail("配乐、音效和旁白轨只接受音频素材");
  let clip;
  if (kind === "video") {
    if (track.kind !== "video") fail("视频素材只能放入视频轨");
    clip = sourceSpanClip(span, timebase, clipId);
  } else if (kind === "image") {
    if (track.kind !== "video") fail("图片只能放入视频轨");
    const duration = typeof requestedDuration === "bigint" ? requestedDuration : (3n * timebase.timescale) / timebase.value;
    if (duration <= 0n) fail("图片展示时长不足一帧");
    clip = { clip_id: clipId, source: { asset_id: span.asset_id, ...sourceRange(span, timebase, "image") }, timeline_start: at, timeline_duration: duration, kind: "image" };
  } else if (kind === "audio") {
    if (track.kind !== "audio") fail("音频素材只能放入音频轨");
    const range = sourceRange(span, timebase, "audio"), numerator = (range.end_pts - range.start_pts) * timebase.timescale, denominator = range.timescale * timebase.value;
    if (requestedDuration === null && numerator % denominator !== 0n) fail("获准音频片段时长未对齐作品帧边界，不能静默截短");
    const duration = typeof requestedDuration === "bigint" ? requestedDuration : numerator / denominator;
    if (duration <= 0n) fail("获准音频片段不足一帧");
    const sourceNumerator = duration * timebase.value * range.timescale;
    if (sourceNumerator % timebase.timescale !== 0n) fail("音频落点不能精确映射到源采样范围");
    const sourceDuration = sourceNumerator / timebase.timescale;
    if (sourceDuration <= 0n || range.start_pts + sourceDuration > range.end_pts) fail("音频范围无法精确映射到作品帧");
    clip = { clip_id: clipId, source: { asset_id: span.asset_id, start_pts: range.start_pts, end_pts: range.start_pts + sourceDuration, timescale: range.timescale }, timeline_start: at, timeline_duration: duration, media_kind: "audio", kind: "media" };
  } else fail("当前获准素材类型不能直接放入时间线");
  clip = { ...clip, timeline_start: at };
  if (kind !== "audio" && isPictureInPictureTrack(track)) clip = p4PipTransform(clip);
  validateDrop(timeline, track, clip, at);
  const commands = [{ type: "add_clip", track_id: track.track_id, clip }];
  if (kind === "audio") {
    const role = track.semantic_sidecar?.metadata?.workbench_role;
    const bus = ["music", "sfx", "narration"].includes(role) ? role : "embedded";
    commands.push({ type: "set_track_properties", track_id: track.track_id, properties: { audio_routing: [...(track.audio_routing ?? []), { routing_id: `routing:${clipId}`, source_clip_id: clipId, bus }] } });
  }
  return commands;
}

export function insertAuthorizedMediaAt(timeline, span, pointerTick, clipId) {
  timebaseOf(timeline);
  const main = mainVideoTrack(timeline);
  if (!span || !["video", "image"].includes(span.media_kind)) fail("主视频轨只接受获准的视频或图片素材");
  if (typeof pointerTick !== "bigint" || pointerTick < 0n) fail("素材落点必须是非负精确帧");
  const isolated = { ...timeline, tracks: timeline.tracks.map(track => track.track_id === main.track_id ? { ...track, clips: [] } : track) };
  const [add] = addAuthorizedMediaClip(isolated, span, main.track_id, pointerTick, clipId);
  if (add?.type !== "add_clip") fail("主视频素材无法转换为时间线片段");
  const anchor = sortedClips(main).find(clip => pointerTick >= clip.timeline_start && pointerTick < clipEnd(clip));
  if (anchor) return insertVideoClip(timeline, add.clip, anchor.clip_id, pointerTick < anchor.timeline_start + anchor.timeline_duration / 2n ? "before" : "after");
  return insertClipAtTimeline(timeline, main.track_id, add.clip, pointerTick);
}


export function addTextCaption(timeline, trackId, at, duration, captionId, text, workbenchKind = "text") {
  timebaseOf(timeline);
  const track = timeline.tracks.find(item => item.track_id === trackId);
  if (!track || track.kind !== "video" || track.locked) fail("文字/字幕需要一个未锁定的视频轨");
  if (typeof at !== "bigint" || at < 0n || typeof duration !== "bigint" || duration <= 0n || !captionId || !String(text).trim()) fail("文字/字幕内容或时间范围无效");
  if (!["text", "caption"].includes(workbenchKind)) fail("文字对象类型无效");
  const caption = { caption_id: captionId, text: String(text), timeline_start: at, timeline_duration: duration, style: { layout_version: 1, font_family: "system", font_size_ratio: 0.045, font_color: "#ffffff", bold: false, safe_y_ratio: 0.78, workbench_kind: workbenchKind } };
  return { type: "add_caption", track_id: trackId, caption };
}

export function updateTextCaption(timeline, trackId, captionId, patch) {
  const track = timeline.tracks.find(item => item.track_id === trackId), caption = track?.captions?.find(item => item.caption_id === captionId);
  if (!track || track.kind !== "video" || !caption || track.locked) fail("所选文字/字幕不属于当前可编辑版本");
  const style = { ...(caption.style ?? {}), ...(patch.style ?? {}) };
  if (patch.text !== undefined && !String(patch.text).trim()) fail("文字/字幕内容不能为空");
  const next = { ...caption, ...patch, style };
  const captions = track.captions.map(item => item.caption_id === captionId ? next : item);
  return { type: "set_track_properties", track_id: trackId, properties: { captions } };
}

export function removeTextCaption(timeline, trackId, captionId) {
  const track = timeline.tracks.find(item => item.track_id === trackId);
  if (!track || track.kind !== "video" || track.locked || !track.captions?.some(item => item.caption_id === captionId)) fail("所选文字/字幕不属于当前可编辑版本");
  return { type: "set_track_properties", track_id: trackId, properties: { captions: track.captions.filter(item => item.caption_id !== captionId) } };
}

function captionOccurrence(timeline,captionId) {
  const matches=timeline.tracks.flatMap(track=>(track.captions??[]).filter(caption=>caption.caption_id===captionId).map(caption=>({track,caption})));
  if(matches.length!==1)fail("文字/字幕身份缺失或重复");
  return matches[0];
}

function validateCaptionDrop(track,caption,at,excludedId) {
  if(!track||track.kind!=="video")fail("文字/字幕只能放入视频文字轨");
  if(track.locked||track.enabled===false)fail(`轨道 ${track.track_id} 已锁定或停用，未修改作品`);
  if(typeof at!=="bigint"||at<0n)fail("文字/字幕落点必须是非负精确帧");
  const end=at+caption.timeline_duration;
  assertNoRangeLock(track,at,end);
  if((track.captions??[]).some(item=>item.caption_id!==excludedId&&at<item.timeline_start+item.timeline_duration&&item.timeline_start<end))fail(`轨道 ${track.track_id} 的落点与已有文字/字幕重叠`);
}

export function moveTimelineCaption(timeline,captionId,targetTrackId,at) {
  const {track:source,caption}=captionOccurrence(timeline,captionId),target=timeline.tracks.find(item=>item.track_id===targetTrackId);
  if(source.locked||source.enabled===false)fail(`来源轨道 ${source.track_id} 已锁定或停用，未修改作品`);
  validateCaptionDrop(target,caption,at,captionId);
  assertNoRangeLock(source,caption.timeline_start,caption.timeline_start+caption.timeline_duration);
  if(source.track_id===target.track_id&&at===caption.timeline_start)return [];
  const delta=at-caption.timeline_start;
  const moved={...caption,timeline_start:at,...(caption.words?{words:caption.words.map(word=>({...word,timeline_start:word.timeline_start+delta}))}:{})};
  if(source.track_id===target.track_id)return [replacement(source,{...source,captions:source.captions.map(item=>item.caption_id===captionId?moved:item)})];
  return [
    replacement(source,{...source,captions:source.captions.filter(item=>item.caption_id!==captionId)}),
    replacement(target,{...target,captions:[...(target.captions??[]),moved]}),
  ];
}

export function trimTimelineCaptionToPlayhead(timeline,captionId,edge,tick) {
  const {track,caption}=captionOccurrence(timeline,captionId);
  if(track.locked||track.enabled===false)fail(`轨道 ${track.track_id} 已锁定或停用，未修改作品`);
  if(!["start","end"].includes(edge)||typeof tick!=="bigint")fail("字幕修边边缘或播放头无效");
  const start=caption.timeline_start,end=start+caption.timeline_duration;
  const nextStart=edge==="start"?tick:start,nextEnd=edge==="end"?tick:end;
  if(nextStart<0n||nextStart>=end||nextEnd<=start)fail("文字/字幕修边后必须保留至少一帧");
  if(nextStart===start&&nextEnd===end)return [];
  if(caption.words?.length)fail("该字幕含词级时序，不能直接修边；请使用对应的字幕编辑入口");
  assertNoRangeLock(track,start,end);
  validateCaptionDrop(track,{...caption,timeline_duration:nextEnd-nextStart},nextStart,captionId);
  const updated={...caption,timeline_start:nextStart,timeline_duration:nextEnd-nextStart};
  return [replacement(track,{...track,captions:track.captions.map(item=>item.caption_id===captionId?updated:item)})];
}

export function splitTimelineCaptionAtPlayhead(timeline,captionId,tick,newCaptionId) {
  const {track,caption}=captionOccurrence(timeline,captionId),start=caption.timeline_start,end=start+caption.timeline_duration;
  if(track.locked||track.enabled===false)fail(`轨道 ${track.track_id} 已锁定或停用，未修改作品`);
  if(!newCaptionId||(timeline.tracks??[]).some(item=>(item.captions??[]).some(existing=>existing.caption_id===newCaptionId)))fail("字幕分割的新对象身份无效");
  if(typeof tick!=="bigint"||tick<=start||tick>=end)fail("播放头必须位于所选文字/字幕内部才能分割");
  if(caption.words?.length)fail("该字幕含词级时序，不能直接分割；请使用对应的字幕编辑入口");
  assertNoRangeLock(track,start,end);
  const left={...caption,timeline_duration:tick-start},rightBase={...caption,caption_id:newCaptionId,timeline_start:tick,timeline_duration:end-tick};
  const right=caption.semantic_sidecar?{...rightBase,semantic_sidecar:{...caption.semantic_sidecar,semantic_id:newCaptionId}}:rightBase;
  return [replacement(track,{...track,captions:track.captions.flatMap(item=>item.caption_id===captionId?[left,right]:[item])})];
}

export function nearestTimelineSnap(tick, boundaries, tolerance) {
  if (typeof tick !== "bigint" || typeof tolerance !== "bigint" || tolerance < 0n) fail("吸附位置无效");
  let result = tick, distance = tolerance + 1n;
  for (const boundary of boundaries) {
    if (typeof boundary !== "bigint") continue;
    const candidateDistance = boundary > tick ? boundary - tick : tick - boundary;
    if (candidateDistance <= tolerance && candidateDistance < distance) { result = boundary; distance = candidateDistance; }
  }
  return result;
}

export function snapTimelineTick(tick, boundaries, tolerance, enabled) { return enabled ? nearestTimelineSnap(tick, boundaries, tolerance) : tick; }
