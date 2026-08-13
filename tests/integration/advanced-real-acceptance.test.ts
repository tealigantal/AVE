import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";
import type { TimelineCommand } from "../../packages/core/timeline-core/src/public.js";
import type { AssetId } from "../../packages/core/media-identity/src/public.js";

type Manifest = Readonly<{ schema_version: 1; originals: readonly Readonly<{ path: string; attribution?: string }>[] }>;
type Imported = Readonly<{ asset_id: string; location_ref: string; probe: { streams?: readonly Readonly<{ codec_type?: string; time_base?: string; duration_ts?: string | number }>[] } }>;
const manifestPath = process.env.AVE_REAL_MEDIA_MANIFEST;
const projectRoot = process.env.AVE_ADVANCED_REVIEW_ROOT;
if (!manifestPath || !projectRoot) throw new Error("AVE_REAL_MEDIA_MANIFEST and AVE_ADVANCED_REVIEW_ROOT are required");
let reviewRootExists = true;
try { await access(projectRoot); } catch { reviewRootExists = false; }
assert.equal(reviewRootExists, false, "advanced review root must not already exist");
const manifestBytes = await readFile(manifestPath);
const manifest = JSON.parse(manifestBytes.toString("utf8")) as Manifest;
assert.equal(manifest.schema_version, 1);
assert.ok(manifest.originals[0]?.path);

const host = new ProjectHostSession();
try {
  await host.create(projectRoot);
  const [media] = await host.importMedia([manifest.originals[0].path]) as readonly Imported[];
  const video = media.probe.streams?.find((stream) => stream.codec_type === "video");
  const audio = media.probe.streams?.find((stream) => stream.codec_type === "audio");
  const videoMatch = video?.time_base?.match(/^1\/(\d+)$/), audioMatch = audio?.time_base?.match(/^1\/(\d+)$/);
  if (!videoMatch || !audioMatch || !video?.duration_ts || !audio?.duration_ts) throw new Error("advanced review requires real AV timing");
  const scale = BigInt(videoMatch[1]), audioScale = BigInt(audioMatch[1]);
  const s = (seconds: number): bigint => scale * BigInt(seconds);
  const a = (seconds: number): bigint => audioScale * BigInt(seconds);
  assert.ok(BigInt(String(video.duration_ts)) >= s(6));
  assert.ok(BigInt(String(audio.duration_ts)) >= a(6));

  host.initializeTimeline([
    { track_id: "main", kind: "video", muted: true, clips: [] },
    { track_id: "pip", kind: "video", z_index: 2, muted: true, clips: [] },
    { track_id: "sound", kind: "audio", clips: [], audio_routing: [] }
  ]);
  const asset = media.asset_id as AssetId;
  const commands: TimelineCommand[] = [
    { type: "add_clip", track_id: "main", clip: { clip_id: "opening", source: { asset_id: asset, start_pts: 0n, end_pts: s(3), timescale: scale }, timeline_start: 0n, timeline_duration: s(4), media_kind: "video", time_map: { map_id: "opening-ramp", pitch_policy: "preserve", segments: [
      { segment_id: "slow", timeline_start: 0n, timeline_end: s(2), source_start: 0n, source_end: s(1), mode: "speed", speed_numerator: 1n, speed_denominator: 2n },
      { segment_id: "normal", timeline_start: s(2), timeline_end: s(4), source_start: s(1), source_end: s(3), mode: "speed", speed_numerator: 1n, speed_denominator: 1n }
    ] }, grade: { grade_id: "warm-opening", brightness: 0.05, contrast: 1.12, saturation: 1.22, gamma: 1.04, context: { input_space: "rec709", working_space: "rec709", output_space: "rec709", bit_depth: 8, range: "limited" } } } },
    { type: "add_clip", track_id: "main", clip: { clip_id: "closing", source: { asset_id: asset, start_pts: s(3), end_pts: s(6), timescale: scale }, timeline_start: s(3), timeline_duration: s(3), media_kind: "video", transform: { fit: "fill", scale_x: 1.08, scale_y: 1.08 }, grade: { grade_id: "cool-closing", brightness: -0.03, contrast: 1.08, saturation: 0.88, gamma: 0.97, context: { input_space: "rec709", working_space: "rec709", output_space: "rec709", bit_depth: 8, range: "limited" } } } },
    { type: "add_clip", track_id: "main", clip: { clip_id: "reprise", source: { asset_id: asset, start_pts: 0n, end_pts: s(5) + s(1) / 2n, timescale: scale }, timeline_start: s(5), timeline_duration: s(5) + s(1) / 2n, media_kind: "video", transform: { fit: "fill", scale_x: 1.03, scale_y: 1.03 }, grade: { grade_id: "reprise-grade", brightness: 0.02, contrast: 1.06, saturation: 1.08, gamma: 1.01, context: { input_space: "rec709", working_space: "rec709", output_space: "rec709", bit_depth: 8, range: "limited" } } } },
    { type: "add_transition", track_id: "main", transition: { transition_id: "main-dissolve", kind: "cross_dissolve", from_clip_id: "opening", to_clip_id: "closing", timeline_start: s(3), timeline_duration: s(1) } },
    { type: "add_transition", track_id: "main", transition: { transition_id: "reprise-dissolve", kind: "cross_dissolve", from_clip_id: "closing", to_clip_id: "reprise", timeline_start: s(5), timeline_duration: s(1) } },
    { type: "add_clip", track_id: "pip", clip: { clip_id: "moving-pip", source: { asset_id: asset, start_pts: s(1), end_pts: s(6), timescale: scale }, timeline_start: 0n, timeline_duration: s(10), media_kind: "video", speed: { numerator: 1n, denominator: 2n }, transform: { scale_x: 0.34, scale_y: 0.34, x: 12, y: 84 }, mask: { mask_id: "tracked-mosaic", shape: "rectangle", mode: "mosaic", x: 0.12, y: 0.15, width: 0.3, height: 0.25, lost_frame_policy: "hold", tracking_samples: [
      { time: 0n, x: 0.12, y: 0.15, width: 0.3, height: 0.25, confidence: 0.98 },
      { time: s(5), x: 0.42, y: 0.7, width: 0.3, height: 0.25, confidence: 0.94 },
      { time: s(10), x: 0.55, y: 0.48, width: 0.3, height: 0.25, confidence: 0.96, corrected: true }
    ] } } },
    { type: "set_automation_curve", track_id: "pip", curve: { curve_id: "pip-x", target_id: "moving-pip", property_path: "transform.x", value_kind: "number", keyframes: [
      { keyframe_id: "pip-x-start", time: 0n, value: 12, interpolation: "bezier", out_tangent: { time: 1, value: 120 } },
      { keyframe_id: "pip-x-end", time: s(10), value: 210, in_tangent: { time: 2, value: 80 } }
    ] } },
    { type: "set_automation_curve", track_id: "pip", curve: { curve_id: "pip-y", target_id: "moving-pip", property_path: "transform.y", value_kind: "number", keyframes: [
      { keyframe_id: "pip-y-start", time: 0n, value: 84, interpolation: "linear" },
      { keyframe_id: "pip-y-end", time: s(10), value: 390 }
    ] } },
    { type: "add_caption", track_id: "main", caption: { caption_id: "advanced-title", text: "高级剪辑 · 真实流程", timeline_start: 0n, timeline_duration: s(10) + s(1) / 2n, language: "zh", style: { safe_y_ratio: 0.68 }, words: [
      { text: "高级剪辑", timeline_start: s(2), timeline_duration: s(2) },
      { text: "真实流程", timeline_start: s(7), timeline_duration: s(2) }
    ] } },
    { type: "add_clip", track_id: "sound", clip: { clip_id: "sound-continuous", media_kind: "audio", source: { asset_id: asset, start_pts: 0n, end_pts: a(5) + a(1) / 2n, timescale: audioScale }, timeline_start: 0n, timeline_duration: s(10) + s(1) / 2n, time_map: { map_id: "sound-continuous-stretch", pitch_policy: "preserve", segments: [
      { segment_id: "sound-full", timeline_start: 0n, timeline_end: s(10) + s(1) / 2n, source_start: 0n, source_end: a(5) + a(1) / 2n, mode: "speed", speed_numerator: 275n, speed_denominator: 168n }
    ] }, boundary_fades: { schema_version: 1, audio_fade_in: { value: 2n, timescale: 5n }, audio_fade_out: { value: 2n, timescale: 5n } } } },
    { type: "set_master_loudness", normalization: { schema_version: 1, enabled: true, target_lufs: -14, true_peak_db: -1, tolerance_lufs: 1 } }
  ];
  host.executeEdit({ intent_id: "advanced-real-showcase", base_version: 0, actor: { actor_id: "user-request-advanced-review", producer: "manual" }, targets: [{ track_id: "main" }, { track_id: "pip" }, { track_id: "sound" }], commands, semantic_refs: ["ACC-034"], preconditions: [{ kind: "timeline_version", version: 0 }], protected_refs: [], provenance: { source_id: "WP-ADV-001", source_version: 1 }, reason: "compile the bounded real-media tool review through the formal edit path", expected_effects: ["animated PiP", "corrected rectangular mosaic trajectory", "segmented constant speed", "cross dissolve", "basic Rec.709 grade", "non-overlapping word highlight", "single-source loudness-normalized audio"] });
  const render = await host.renderTimeline({ sources: [{ asset_ref: media.asset_id, original_ref: media.location_ref, source_timescale: scale, has_audio: true }], outputDirectory: resolve(projectRoot, "renders"), profile: { name: "advanced-real-review", width: 360, height: 640 } });
  assert.equal(render.status.qc, "passed");
  const preview = (render.preview as any).outputs.find((item: any) => item.kind === "render");
  const master = (render.master as any).outputs.find((item: any) => item.kind === "render");
  assert.ok(preview?.path && master?.path);
  await copyFile(preview.path, resolve(projectRoot, "renders", "preview.mp4"));
  await copyFile(master.path, resolve(projectRoot, "renders", "master.mp4"));
  const snapshot = host.readTimelineSnapshot() as any;
  assert.equal(snapshot.version, 1);
  assert.equal(snapshot.tracks.find((track: any) => track.track_id === "pip").automation_curves.length, 2);
  assert.equal(snapshot.tracks.filter((track: any) => track.kind === "audio").length, 1);
  assert.equal(snapshot.tracks.find((track: any) => track.kind === "audio").clips.length, 1);
  assert.equal(snapshot.tracks.find((track: any) => track.track_id === "main").muted, true);
  const manifests = host.listRenderManifests() as any[];
  const plans = manifests.filter((item) => item.manifest_type === "execution_plan").map((item) => item.value);
  assert.equal(plans.length, 2);
  assert.equal(plans[0].semantic_graph_hash, plans[1].semantic_graph_hash);
  assert.ok(plans.every((plan) => plan.diagnostics.length === 0));
  const masterMetrics = (render.master as any).metrics;
  const filterGraphs = String(masterMetrics.filter_complex ?? "");
  for (const marker of ["xfade=transition=fade", "eval=frame:shortest=1", "crop=iw*(0.3)", "eq=brightness=0.05", "drawtext=", "fontcolor=yellow", "not(between(t,2,4))", "y=h*0.68-text_h/2", "afade=t=in", "afade=t=out"]) {
    assert.ok(filterGraphs.includes(marker), `advanced execution plan missing ${marker}`);
  }
  assert.equal(filterGraphs.includes("sidechaincompress="), false);
  assert.equal(masterMetrics.ducking_status, "disabled");
  assert.ok(["normalized", "within_tolerance"].includes(masterMetrics.audio_normalization?.status));
  const review = { schema_version: 1, manifest_sha256: createHash("sha256").update(manifestBytes).digest("hex"), attribution: manifest.originals[0].attribution ?? null, human_acceptance: "pending", timeline_version: 1, semantic_graph_hash: plans[0].semantic_graph_hash, preview_sha256: preview.hash, master_sha256: master.hash, preview: "renders/preview.mp4", master: "renders/master.mp4", qc: render.status.qc, advanced_operations: ["ten-second Bezier animated PiP position", "moving corrected rectangular mosaic", "two-segment preserve-pitch constant-speed remap", "two one-second two-input Cross Dissolves", "bounded Rec.709 basic grades", "mutually exclusive safe-area word highlights", "single continuous audio source with boundary fades and Master loudness normalization"], master_metrics: masterMetrics };
  await writeFile(resolve(projectRoot, "ADVANCED-REVIEW.json"), JSON.stringify(review, null, 2) + "\n");
  await writeFile(resolve(projectRoot, "EDIT-SHEET.md"), `# 有界工具成片 v19 验收表\n\n只验收 renders/master.mp4。此成片只演示列出的有界工具；不声明自动主体跟随、人物分割、真正 Luma Matte、连续 Speed Ramp、Optical Flow、完整 GraphicScene、HDR 或可渲染 Nested/Compound/Adjustment。源素材只有一条已混合的人声与音乐音频，因此也不声称 Dialogue/Music ducking。\n\n| 时间码 | 实际使用的工具 | 你应看到或听到什么 |\n|---|---|---|\n| 00:00-00:02 | 主画面 0.5 倍速、基础 Rec.709 调色；单音轨淡入 | 主画面慢速开始；声音从静音平滑进入 |\n| 00:00-00:10 | 贝塞尔 X + 线性 Y 运动画中画、0.5 倍速 | 小画面从左上持续移动到右下，不应跳动 |\n| 00:00-00:10 | 外部/人工修正样本驱动的矩形马赛克轨迹 | 小画面内部像素块区域持续移动 |\n| 00:00-00:10.5 | 单音频 clip、分段保持音调恒定速度、Master -14 LUFS | 全程只有一份连续声音，不应有回声、重影或中途静音 |\n| 00:02-00:04 | 互斥逐词高亮 | 只显示黄色“高级剪辑”，同位置不应出现白字叠加 |\n| 00:03-00:04 | 一秒 Cross Dissolve | 鼓手画面平滑溶解到歌手画面 |\n| 00:04-00:05 | 基础 Rec.709 调色 | 歌手段相对前段更冷、更克制 |\n| 00:05-00:06 | 一秒 Cross Dissolve | 歌手画面平滑溶解回第三段 |\n| 00:06-00:07 | 基础 Rec.709 调色 | 第三段恢复略暖、略饱和的观感 |\n| 00:07-00:09 | 互斥逐词高亮 | 只显示黄色“真实流程”，同位置不应出现白字叠加 |\n| 00:10.1-00:10.5 | 单音轨尾部淡出 | 声音平滑收尾，不应突然截断 |\n\n音频结构证明：Timeline 只有一个 audio clip；主视频和画中画内嵌音频均静音；没有 Dialogue/Music 总线和 sidechaincompress；只执行分段恒定速度、边界淡化和 Master 响度归一化。\n\n机器 QC 只证明结构与媒体指标，审美是否通过由你决定。\n`);
  const projectId = host.status().project;
  await host.close();
  await host.open(projectRoot);
  assert.equal(host.status().project, projectId);
  assert.equal((host.readTimelineSnapshot() as any).version, 1);
  assert.equal(host.listRenderResults().length, 2);
  console.log(`advanced real-media review passed: ${projectRoot}`);
} finally {
  await host.close();
}
