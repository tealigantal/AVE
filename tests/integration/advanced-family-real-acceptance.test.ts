import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";
import { validateAutomationCurve } from "../../packages/core/timeline-core/src/automation.js";
import { validateTimeline, type TimelineCommand, type Track } from "../../packages/core/timeline-core/src/public.js";
import type { AssetId } from "../../packages/core/media-identity/src/public.js";

type Manifest = Readonly<{ schema_version: 1; originals: readonly Readonly<{ path: string; attribution?: string }>[] }>;
type Stream = Readonly<{ codec_type?: string; time_base?: string; duration_ts?: string | number }>;
type Imported = Readonly<{ asset_id: string; location_ref: string; probe: { streams?: readonly Stream[] } }>;
type RenderOutput = Readonly<{ kind?: string; path?: string; hash?: string }>;
type RenderResult = Readonly<{ outputs: readonly RenderOutput[]; metrics: Readonly<Record<string, unknown>> }>;
type RenderManifestEntry = Readonly<{ manifest_type: string; value: Readonly<{ semantic_graph_hash: string }> }>;
type CaseContext = Readonly<{ asset: AssetId; scale: bigint; audioAsset: AssetId; audioScale: bigint; secondAsset: AssetId; lutPath: string; lutHash: string }>;
type AcceptanceCase = Readonly<{ id: string; name: string; expected: string; tracks: (context: CaseContext) => readonly Track[]; commands: (context: CaseContext) => readonly TimelineCommand[]; markers: readonly string[] }>;

const manifestPath = process.env.AVE_REAL_MEDIA_MANIFEST;
const suiteRoot = process.env.AVE_ADVANCED_FAMILY_REVIEW_ROOT;
if (!manifestPath || !suiteRoot) throw new Error("AVE_REAL_MEDIA_MANIFEST and AVE_ADVANCED_FAMILY_REVIEW_ROOT are required");
try { await access(suiteRoot); throw new Error("advanced family review root must not already exist"); } catch (error) { if (error instanceof Error && error.message.includes("must not")) throw error; }
const manifestBytes = await readFile(manifestPath);
const manifest = JSON.parse(manifestBytes.toString("utf8")) as Manifest;
assert.equal(manifest.schema_version, 1);
const fixtureRoot = dirname(manifest.originals[0]!.path);
const primaryPath = manifest.originals[0]!.path;
const secondPath = resolve(fixtureRoot, "rick-video-186s-b-tts-6s.mp4");
const narrationPath = resolve(fixtureRoot, "narration-zh.wav");
const musicPath = resolve(fixtureRoot, "rick-music-12s.m4a");
for (const path of [primaryPath, secondPath, narrationPath, musicPath]) await access(path);
await mkdir(suiteRoot, { recursive: true });
const lutPath = resolve(suiteRoot, "warm-curve.cube");
const lutBytes = Buffer.from("TITLE \"AVE warm curve\"\nLUT_3D_SIZE 2\nDOMAIN_MIN 0 0 0\nDOMAIN_MAX 1 1 1\n0.02 0 0\n0.08 0 0.10\n0 0.05 0\n0.12 0.06 0.14\n0.05 0 0.85\n0.18 0 0.95\n0.95 0.88 0.05\n1 0.96 0.92\n");
await writeFile(lutPath, lutBytes);
const lutHash = createHash("sha256").update(lutBytes).digest("hex");

const timebase = (stream: Stream | undefined): bigint => {
  const match = stream?.time_base?.match(/^1\/(\d+)$/);
  if (!match) throw new Error("fixture requires integer reciprocal timebase");
  return BigInt(match[1]);
};
const source = (asset: AssetId, scale: bigint, start: bigint, end: bigint) => ({ asset_id: asset, start_pts: start, end_pts: end, timescale: scale });
const clip = (id: string, context: CaseContext, start = 0n, duration = 6n, extra: Record<string, unknown> = {}) => ({ clip_id: id, source: source(context.asset, context.scale, start * context.scale, (start + duration) * context.scale), timeline_start: 0n, timeline_duration: duration * context.scale, media_kind: "video" as const, ...extra });
const gradeContext = { input_space: "rec709" as const, working_space: "rec709" as const, output_space: "rec709" as const, bit_depth: 8 as const, range: "limited" as const };

const cases: readonly AcceptanceCase[] = [
  { id: "ACC-001", name: "三层 PiP 与贝塞尔运动", expected: "三层画面按层级叠加；两个小画面沿不同曲线移动。", markers: ["overlay=", "if(lt(t"], tracks: () => [{ track_id: "base-track", kind: "video", muted: true, clips: [] }, { track_id: "pip-a-track", kind: "video", z_index: 2, muted: true, clips: [] }, { track_id: "pip-b-track", kind: "video", z_index: 3, muted: true, clips: [] }], commands: (c) => [
    { type: "add_clip", track_id: "base-track", clip: clip("base", c, 0n, 6n, { transform: { fit: "fill" } }) },
    { type: "add_clip", track_id: "pip-a-track", clip: clip("pip-a", c, 0n, 6n, { transform: { scale_x: 0.38, scale_y: 0.38, x: 12, y: 50 } }) },
    { type: "add_clip", track_id: "pip-b-track", clip: clip("pip-b", c, 0n, 6n, { transform: { scale_x: 0.3, scale_y: 0.3, x: 220, y: 360 } }) },
    { type: "set_automation_curve", track_id: "pip-a-track", curve: { curve_id: "a-x", target_id: "pip-a", property_path: "transform.x", value_kind: "number", keyframes: [{ keyframe_id: "a0", time: 0n, value: 12, interpolation: "bezier", out_tangent: { time: 1, value: 80 } }, { keyframe_id: "a1", time: 6n * c.scale, value: 205, in_tangent: { time: 1, value: 50 } }] } },
    { type: "set_automation_curve", track_id: "pip-b-track", curve: { curve_id: "b-y", target_id: "pip-b", property_path: "transform.y", value_kind: "number", keyframes: [{ keyframe_id: "b0", time: 0n, value: 360, interpolation: "bezier", out_tangent: { time: 1, value: -80 } }, { keyframe_id: "b1", time: 6n * c.scale, value: 80, in_tangent: { time: 1, value: -30 } }] } }
  ] },
  { id: "ACC-002", name: "横屏转竖屏虚化背景", expected: "横屏主体完整居中，背后铺满同源虚化背景。", markers: ["boxblur=20:2", "force_original_aspect_ratio=decrease"], tracks: () => [{ track_id: "video", kind: "video", muted: true, clips: [] }], commands: (c) => [{ type: "add_clip", track_id: "video", clip: clip("reframe", c, 0n, 6n, { static_reframe: { schema_version: 1, mode: "blurred_background", focal_x: 0.5, focal_y: 0.48 } }) }] },
  { id: "ACC-003", name: "Whip / Zoom / Dissolve / Luma 转场", expected: "四个一秒双输入转场依次出现。", markers: ["transition=smoothleft", "transition=zoomin", "transition=fade", "transition=pixelize"], tracks: () => [{ track_id: "video", kind: "video", muted: true, clips: [] }], commands: (c) => {
    const starts = [0n, 2n, 4n, 6n, 8n], kinds = ["whip", "zoom", "cross_dissolve", "luma"];
    const commands: TimelineCommand[] = starts.map((at, i) => ({ type: "add_clip", track_id: "video", clip: { ...clip(`t${i}`, c, BigInt(i % 3), 3n, { transform: { fit: "fill" } }), timeline_start: at * c.scale } }));
    for (let i = 0; i < 4; i += 1) commands.push({ type: "add_transition", track_id: "video", transition: { transition_id: `tr${i}`, kind: kinds[i]!, from_clip_id: `t${i}`, to_clip_id: `t${i + 1}`, timeline_start: starts[i + 1]! * c.scale, timeline_duration: c.scale } });
    return commands;
  } },
  { id: "ACC-004", name: "变速 / 冻结 / 倒放与音频同步", expected: "先慢放、再冻结、后倒放；独立音频保持连续并同步收尾。", markers: ["loop=loop=-1:size=1", "reverse", "areverse"], tracks: () => [{ track_id: "video", kind: "video", muted: true, clips: [] }, { track_id: "audio", kind: "audio", clips: [], audio_routing: [] }], commands: (c) => {
    const map = { map_id: "remap", pitch_policy: "preserve" as const, segments: [
      { segment_id: "slow", timeline_start: 0n, timeline_end: 4n * c.scale, source_start: 0n, source_end: 2n * c.scale, mode: "speed" as const, speed_numerator: 1n, speed_denominator: 2n },
      { segment_id: "hold", timeline_start: 4n * c.scale, timeline_end: 6n * c.scale, source_start: 2n * c.scale, source_end: 2n * c.scale, mode: "hold" as const },
      { segment_id: "reverse", timeline_start: 6n * c.scale, timeline_end: 10n * c.scale, source_start: 2n * c.scale, source_end: 6n * c.scale, mode: "reverse" as const }
    ] };
    return [{ type: "add_clip", track_id: "video", clip: { ...clip("remap-v", c, 0n, 6n, { time_map: map }), timeline_duration: 10n * c.scale } }, { type: "add_clip", track_id: "audio", clip: { clip_id: "remap-a", source: source(c.asset, c.scale, 0n, 6n * c.scale), timeline_start: 0n, timeline_duration: 10n * c.scale, media_kind: "audio", time_map: map } }];
  } },
  { id: "ACC-005", name: "跟踪马赛克与人工修正", expected: "马赛克区域持续移动，后半段采用人工修正点。", markers: ["flags=neighbor", "eval=frame"], tracks: () => [{ track_id: "video", kind: "video", muted: true, clips: [] }], commands: (c) => [{ type: "add_clip", track_id: "video", clip: clip("tracking", c, 0n, 6n, { transform: { fit: "fill" }, mask: { mask_id: "tracking-mask", shape: "rectangle", mode: "mosaic", x: 0.08, y: 0.12, width: 0.3, height: 0.25, lost_frame_policy: "hold", tracking_samples: [{ time: 0n, x: 0.08, y: 0.12, width: 0.3, height: 0.25, confidence: 0.96 }, { time: 3n * c.scale, x: 0.35, y: 0.28, width: 0.3, height: 0.25, confidence: 0.82 }, { time: 6n * c.scale, x: 0.58, y: 0.48, width: 0.3, height: 0.25, confidence: 0.99, corrected: true }] } }) }] },
  { id: "ACC-006", name: "主体遮罩合成", expected: "前景中央区域保留为主体层，背景层经过虚化并可从外围看到。", markers: ["geq=lum", "overlay=shortest=0"], tracks: () => [{ track_id: "background-track", kind: "video", muted: true, clips: [] }, { track_id: "subject-track", kind: "video", z_index: 2, muted: true, clips: [] }], commands: (c) => [{ type: "add_clip", track_id: "background-track", clip: clip("background", c, 0n, 6n, { transform: { fit: "fill" }, effects: [{ effect_id: "background-blur", clip_id: "background", kind: "blur" }] }) }, { type: "add_clip", track_id: "subject-track", clip: clip("subject", c, 0n, 6n, { transform: { fit: "fill" }, mask: { mask_id: "subject-alpha", shape: "rectangle", mode: "alpha", x: 0.2, y: 0.08, width: 0.6, height: 0.84, feather: 0, lost_frame_policy: "block" } }) }] },
  { id: "ACC-007", name: "中英双语逐词字幕", expected: "安全区内逐词黄色高亮；白色整句与高亮互斥不重叠。", markers: ["fontcolor=yellow", "not(between(t"], tracks: () => [{ track_id: "video", kind: "video", muted: true, clips: [] }], commands: (c) => [{ type: "add_clip", track_id: "video", clip: clip("caption-video", c, 0n, 6n, { transform: { fit: "fill" } }) }, { type: "add_caption", track_id: "video", caption: { caption_id: "bilingual", text: "高级剪辑 Advanced Edit", language: "zh-en", timeline_start: 0n, timeline_duration: 6n * c.scale, style: { safe_y_ratio: 0.65 }, words: [{ text: "高级剪辑", timeline_start: c.scale, timeline_duration: 2n * c.scale }, { text: "Advanced Edit", timeline_start: 3n * c.scale, timeline_duration: 2n * c.scale }] } }] },
  { id: "ACC-008", name: "Logo / Sticker / Location / CTA 图形包", expected: "四个图形信息按时间顺序清楚出现，不互相遮挡。", markers: ["drawtext=", "fontcolor=yellow"], tracks: () => [{ track_id: "video", kind: "video", muted: true, clips: [] }], commands: (c) => [{ type: "add_clip", track_id: "video", clip: clip("graphic-video", c, 0n, 6n, { transform: { fit: "fill" }, semantic_sidecar: { semantic_id: "graphic-scene", labels: ["logo", "sticker", "location", "cta"], evidence_refs: ["ACC-008"] } }) }, { type: "add_caption", track_id: "video", caption: { caption_id: "graphic-scene", text: "AVE  ✦  SHANGHAI  →  FOLLOW", timeline_start: 0n, timeline_duration: 6n * c.scale, language: "en", style: { safe_y_ratio: 0.22 }, words: [{ text: "AVE LOGO", timeline_start: 0n, timeline_duration: c.scale }, { text: "★ STICKER", timeline_start: c.scale, timeline_duration: c.scale }, { text: "上海 LOCATION", timeline_start: 2n * c.scale, timeline_duration: 2n * c.scale }, { text: "关注 FOLLOW", timeline_start: 4n * c.scale, timeline_duration: 2n * c.scale }] } }] },
  { id: "ACC-009", name: "LUT / 曝光 / 色温观感 / 曲线 / SDR 输出", expected: "暖色 LUT、曝光和 gamma 曲线形成明确高对比外观，输出保持标准 SDR Rec.709。", markers: ["eq=", "lut3d=file="], tracks: () => [{ track_id: "video", kind: "video", muted: true, clips: [] }], commands: (c) => [{ type: "add_clip", track_id: "video", clip: clip("color", c, 0n, 6n, { transform: { fit: "fill" }, grade: { grade_id: "full-grade", exposure: 0.08, brightness: 0.03, contrast: 1.18, saturation: 1.25, gamma: 1.06, lut_path: c.lutPath, lut_sha256: c.lutHash, context: gradeContext } }) }] },
  { id: "ACC-010", name: "Dialogue / Music / SFX 混音与响度", expected: "中文旁白出现时音乐自动压低；短促 SFX 可辨认；整体响度受控。", markers: ["sidechaincompress=", "amix=inputs=3"], tracks: () => [{ track_id: "video-track", kind: "video", muted: true, clips: [] }, { track_id: "dialogue-track", kind: "audio", clips: [], audio_routing: [] }, { track_id: "music-track", kind: "audio", clips: [], audio_routing: [] }, { track_id: "sfx-track", kind: "audio", clips: [], audio_routing: [] }], commands: (c) => [{ type: "add_clip", track_id: "video-track", clip: clip("mix-video", c, 0n, 6n, { transform: { fit: "fill" } }) }, { type: "add_clip", track_id: "dialogue-track", clip: { clip_id: "dialogue", source: source(c.audioAsset, c.audioScale, 0n, 6n * c.audioScale), timeline_start: 0n, timeline_duration: 6n * c.scale, media_kind: "audio", gain_db: 2 } }, { type: "set_track_properties", track_id: "dialogue-track", properties: { audio_routing: [{ routing_id: "dialogue-route", source_clip_id: "dialogue", bus: "dialogue" }] } }, { type: "add_clip", track_id: "music-track", clip: { clip_id: "music", source: source(c.secondAsset, c.scale, 0n, 6n * c.scale), timeline_start: 0n, timeline_duration: 6n * c.scale, media_kind: "audio", gain_db: -9 } }, { type: "set_track_properties", track_id: "music-track", properties: { audio_routing: [{ routing_id: "music-route", source_clip_id: "music", bus: "music" }] } }, { type: "add_clip", track_id: "sfx-track", clip: { clip_id: "sfx", source: source(c.asset, c.scale, 0n, c.scale), timeline_start: 4n * c.scale, timeline_duration: c.scale, media_kind: "audio", gain_db: -15 } }, { type: "set_track_properties", track_id: "sfx-track", properties: { audio_routing: [{ routing_id: "sfx-route", source_clip_id: "sfx", bus: "embedded" }] } }, { type: "set_dialogue_music_ducking", ducking: { schema_version: 1, enabled: true, threshold_db: -30, ratio: 8, attack_ms: 20, release_ms: 300, max_reduction_db: 12 } }, { type: "set_master_loudness", normalization: { schema_version: 1, enabled: true, target_lufs: -14, true_peak_db: -1, tolerance_lufs: 1.5 } }] },
  { id: "ACC-011", name: "Nested / Adjustment / Compound 结构", expected: "嵌套、调整与复合语义在同一提交中持久化，成片保留三层合成和统一调色。", markers: ["overlay=", "eq="], tracks: () => [{ track_id: "base", kind: "video", muted: true, clips: [] }, { track_id: "nested-layer", kind: "video", z_index: 2, muted: true, clips: [] }, { track_id: "compound-layer", kind: "video", z_index: 3, muted: true, clips: [] }], commands: (c) => [{ type: "add_clip", track_id: "base", clip: clip("adjustment-base", c, 0n, 6n, { kind: "adjustment", transform: { fit: "fill" }, grade: { grade_id: "adjustment-grade", brightness: 0.03, contrast: 1.12, saturation: 1.12, context: gradeContext }, semantic_sidecar: { semantic_id: "adjustment", labels: ["adjustment-layer"], evidence_refs: ["ACC-011"] } }) }, { type: "add_sequence", sequence: { sequence_id: "nested-sequence", tracks: [] } }, { type: "add_clip", track_id: "nested-layer", clip: clip("nested", c, 0n, 6n, { kind: "nested", transform: { scale_x: 0.42, scale_y: 0.42, x: 15, y: 70 }, nested_sequence_id: "nested-sequence" }) }, { type: "add_clip", track_id: "compound-layer", clip: { ...clip("compound-child-a", c, 0n, 6n, { transform: { scale_x: 0.28, scale_y: 0.28, x: 245, y: 390 } }), timeline_start: 6n * c.scale } }, { type: "add_clip", track_id: "compound-layer", clip: { ...clip("compound-child-b", c, 0n, 6n, { transform: { scale_x: 0.28, scale_y: 0.28, x: 245, y: 70 } }), timeline_start: 12n * c.scale } }, { type: "add_clip", track_id: "compound-layer", clip: clip("compound", c, 0n, 6n, { kind: "compound", transform: { scale_x: 0.3, scale_y: 0.3, x: 220, y: 230 }, compound_clip_ids: ["compound-child-a", "compound-child-b"] }) }] }
];

// Required negative boundaries independent of the retained positive projects.
assert.ok(validateAutomationCurve({ curve_id: "bad", target_id: "x", property_path: "transform.x", value_kind: "number", keyframes: [{ keyframe_id: "a", time: 0n, value: 0, interpolation: "bezier", out_tangent: { time: -1, value: 1 } }, { keyframe_id: "b", time: 1n, value: 1 }] }).length > 0);
assert.equal(validateTimeline({ version: 0, tracks: [], sequences: [{ sequence_id: "a", parent_sequence_id: "b", tracks: [] }, { sequence_id: "b", parent_sequence_id: "a", tracks: [] }] }).ok, false);

const report: Array<Record<string, unknown>> = [];
for (const item of cases) {
  const projectRoot = resolve(suiteRoot, "projects", item.id);
  const host = new ProjectHostSession();
  try {
    await host.create(projectRoot);
    const imported = await host.importMedia([primaryPath, secondPath, narrationPath, musicPath]) as readonly Imported[];
    const primary = imported[0]!, second = imported[1]!, narration = imported[2]!;
    const videoStream = primary.probe.streams?.find((stream) => stream.codec_type === "video");
    const narrationStream = narration.probe.streams?.find((stream) => stream.codec_type === "audio");
    const context: CaseContext = { asset: primary.asset_id as AssetId, scale: timebase(videoStream), secondAsset: second.asset_id as AssetId, audioAsset: narration.asset_id as AssetId, audioScale: timebase(narrationStream), lutPath, lutHash };
    const declaredTracks = item.tracks(context);
    const needsReferenceAudio = !declaredTracks.some((track) => track.kind === "audio");
    const initialTracks: readonly Track[] = needsReferenceAudio ? [...declaredTracks, { track_id: "reference-audio-track", kind: "audio", clips: [], audio_routing: [] }] : declaredTracks;
    host.initializeTimeline(initialTracks);
    const before = host.readTimelineSnapshot();
    const caseDuration = item.commands(context).reduce((maximum, command) => command.type === "add_clip" || command.type === "add_caption" ? (command.type === "add_clip" ? command.clip.timeline_start + command.clip.timeline_duration : command.caption.timeline_start + command.caption.timeline_duration) > maximum ? (command.type === "add_clip" ? command.clip.timeline_start + command.clip.timeline_duration : command.caption.timeline_start + command.caption.timeline_duration) : maximum : maximum, 6n * context.scale);
    const referenceAudio: readonly TimelineCommand[] = needsReferenceAudio ? [{ type: "add_clip", track_id: "reference-audio-track", clip: { clip_id: "reference-audio", source: source(context.asset, context.scale, 0n, 6n * context.scale), timeline_start: 0n, timeline_duration: caseDuration, media_kind: "audio", gain_db: -6, time_map: { map_id: "reference-audio-loop", pitch_policy: "preserve", segments: [{ segment_id: "reference-audio-stretch", timeline_start: 0n, timeline_end: caseDuration, source_start: 0n, source_end: 6n * context.scale, mode: "speed", speed_numerator: 6n * context.scale, speed_denominator: caseDuration }] } } }] : [];
    host.executeEdit({ intent_id: `${item.id}-real`, base_version: 0, actor: { actor_id: "user-advanced-family-review", producer: "manual" }, targets: initialTracks.map((track) => ({ track_id: track.track_id })), commands: [...item.commands(context), ...referenceAudio], semantic_refs: [item.id], preconditions: [{ kind: "timeline_version", version: 0 }], protected_refs: [], provenance: { source_id: "WP-ADV-002", source_version: 1 }, reason: item.name, expected_effects: [item.expected] });
    assert.equal((host.readTimelineSnapshot() as { version: number }).version, (before as { version: number }).version + 1);
    const sources = imported.map((media) => ({ asset_ref: media.asset_id, original_ref: media.location_ref, source_timescale: timebase(media.probe.streams?.find((stream) => stream.codec_type === "video") ?? media.probe.streams?.find((stream) => stream.codec_type === "audio")), has_audio: Boolean(media.probe.streams?.some((stream) => stream.codec_type === "audio")) }));
    const rendered = await host.renderTimeline({ sources, outputDirectory: resolve(projectRoot, "renders"), profile: { name: item.id, width: 360, height: 640 }, ...(item.id === "ACC-004" ? { qcRequirements: { planned_freeze: true, planned_silence: true } } : {}) });
    assert.equal(rendered.status.qc, "passed");
    const masterResult = rendered.master as RenderResult;
    const master = masterResult.outputs.find((output) => output.kind === "render");
    assert.ok(master?.path);
    assert.ok(master.hash);
    const filterGraph = String(masterResult.metrics.filter_complex ?? "");
    for (const marker of item.markers) assert.ok(filterGraph.includes(marker), `${item.id} missing ${marker}`);
    const output = resolve(suiteRoot, `${item.id}.mp4`);
    await copyFile(master.path, output);
    const manifests = host.listRenderManifests() as readonly RenderManifestEntry[];
    const plans = manifests.filter((entry) => entry.manifest_type === "execution_plan").map((entry) => entry.value);
    assert.equal(plans.length, 2); assert.equal(plans[0]!.semantic_graph_hash, plans[1]!.semantic_graph_hash);
    const projectId = host.status().project;
    await host.close(); await host.open(projectRoot);
    assert.equal(host.status().project, projectId); assert.equal((host.readTimelineSnapshot() as { version: number }).version, 1);
    report.push({ acceptance_id: item.id, name: item.name, file: basename(output), sha256: master.hash, semantic_graph_hash: plans[0]!.semantic_graph_hash, qc: rendered.status.qc, expected: item.expected, filter_markers: item.markers, human_acceptance: "pending" });
    console.log(`${item.id} encoded and verified`);
  } finally { await host.close(); }
}
const rows = report.map((entry) => `| ${entry.acceptance_id} | ${entry.name} | ${entry.file} | ${entry.expected} |`).join("\n");
await writeFile(resolve(suiteRoot, "INDEX.md"), `# AVE ACC-001～011 人工验收索引\n\n只需依次观看根目录的 11 条 MP4。机器已经验证编码、双目标语义一致、原片来源、QC、哈希和项目重开；画面与声音是否满意由你决定。\n\n| 验收项 | 名称 | 文件 | 重点看什么 |\n|---|---|---|---|\n${rows}\n\n素材归因：${manifest.originals[0]?.attribution ?? "见授权素材目录 ATTRIBUTION.md"}\n`);
await writeFile(resolve(suiteRoot, "acceptance-report.json"), JSON.stringify({ schema_version: 1, manifest_sha256: createHash("sha256").update(manifestBytes).digest("hex"), generated_at: new Date().toISOString(), human_acceptance: "pending", cases: report }, null, 2) + "\n");
console.log(`advanced family suite passed: ${suiteRoot}`);
