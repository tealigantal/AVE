# Editing Capability Scope v1

This is the single, complete scope source for approximately 90% of mainstream Vlog editing. `specified` means defined, not implemented.

| ID | Scope |
| --- | --- |
| CAP-TL-001 | MediaClip, AudioClip, ImageClip, GraphicClip, TextClip, GeneratorClip, AdjustmentClip, CompoundClip, NestedSequence, Transition, Mask, AutomationCurve, TrackingData, EffectInstance; tracks support z-order, enable/disable, lock, mute/solo, opacity, blend mode, track effects/automation. Commands retain add/remove/replace, move, trim, roll, ripple, slip, slide, undo/redo, version, lock, CommitPlan and add split, duplicate, group/ungroup, link/unlink A/V, crop, opacity/blend, mask, time map, envelope, graphic/adjustment, nest/unnest, track order/property and effect stack. |
| CAP-KF-001 | Clip-local and timeline time; Step/Hold, Linear, Ease In/Out/In-Out, cubic Bézier, left/right/automatic tangents and boundary behavior; number/vector/color/rectangle/boolean; animate position, scale, rotation, anchor, opacity, crop, mask, effect/text params, gain/pan and time remap. |
| CAP-XFORM-001 | Position X/Y, Scale X/Y/uniform, rotation, anchor, opacity, flip, crop, Fit/Fill/Stretch/Original Size, pixels/percent/canvas coordinates, border, rounded corner, shadow, corner pin and safe area. |
| CAP-COMP-001 | Multi-video/image/graphic tracks, z-order, alpha composite, overlay, PiP, split screen, background, adjustment, nested composition, transparent media, alpha/luma matte; Normal, Multiply, Screen, Overlay, Add, Subtract, Difference, Darken, Lighten, Color Dodge and Color Burn. |
| CAP-TIME-001 | Constant speed, speed ramp, freeze/frame hold, reverse, loop, stutter, boomerang, variable curve, preserve/change-pitch policy, frame-blending/optical-flow interfaces, and duration/subtitle/keyframe/audio synchronization after remap. |
| CAP-TRANS-001 | Cut, Dissolve, Fade, Dip black/white, Wipe, Push, Slide, Zoom, Spin, Blur, Directional Blur, Luma Wipe, Mask, Flash, RGB Split, Glitch, Whip, Match Transform; two-input handles/overlap and transform-opacity-effect-mask curves. Registered, parameterized, keyframeable effects include Gaussian/Box/Directional/Motion Blur, sharpen, pixelate, vignette, glow/bloom, grain/noise, posterize, edge, aberration/RGB split/glitch, lens/fisheye, mirror/kaleidoscope, shake/flicker, light leak/film burn, chroma/luma key and background blur with schema/range/preview/master/backend/fallback/alpha/color semantics. |
| CAP-COLOR-001 | Exposure, brightness, contrast, saturation, vibrance, temperature/tint, gamma, highlights/shadows, whites/blacks, hue, lift/gamma/gain, RGB/luma curves, HSL secondary, white balance, LUT, film look, HDR/SDR, 8/10-bit and input/working/output color space. |
| CAP-MASK-001 | Rectangle/ellipse/polygon/Bézier/image/alpha-video/segmentation/depth masks; feather, expand/shrink, invert, add/subtract/intersect/difference; point/box/transform/homography/face/object/mask/camera tracking, confidence/lost frame/manual correction; stabilization, horizon, auto crop/reframe, subject/face follow, lens, deflicker/denoise and interpolation interface. |
| CAP-TEXT-001 | SRT/VTT/ASS, sentence/word timing, word highlight/karaoke, multilingual/bilingual, wrap/safe area/font fallback/CJK/emoji, typography/emphasis/animation; SVG/PNG/WebP/GIF/alpha video/shape/arrow/callout/progress/location/chapter/logo/sticker/lower-third/end-card/CTA through GraphicScene or Bake. |
| CAP-AUDIO-001 | Multi-track, clip/track gain, keyframe/pan/fade/crossfade/J-L cut, dialogue/music/side-chain ducking, normalize/limiter/compressor/gate/EQ/filter/de-esser/denoise/reverb/delay/pitch/stretch/channel/room tone/loop/SFX/beat/sample trim/A-V sync; true peak/loudness/clipping/silence/missing/channel/A-V sync/abrupt cut QC. |
| CAP-RENDER-001 | CFR/VFR, orientation metadata, video/audio/image/alpha formats, SDR/HDR, 8/10-bit, proxy/original/optimized/offline-relink, missing font/LUT/effect, multi-resolution/partial/background/node/invalidated cache, filmstrip/waveform/mask-tracking-depth cache, cancel/pause/resume/recovery, hardware/software fallback, Bake unsupported effects, deterministic output manifest. |
| CAP-PRESET-001 | Motion/Transition/Effect/Color/Title/Subtitle/Audio/Composition presets: ID/version/schema/default/subgraph/capability/aspect/min-duration/input/assets/fallback/preview/license. Current Preset / Skill Output only selects, composes and parameterizes presets, never arbitrary FFmpeg/MLT strings. |
| CAP-FND-001 | Exact RationalTime/PTS/frame/sample authority, bounded ProxyMap, immutable media identity and relink/staleness, persistent Worker with explicit idempotent recovery, one typed CommandEditIR to Project Host Commit path, atomic current project-format/object/lock/reopen recovery with non-current formats rejected before writes, one Semantic Render Manifest shared by target-specific Preview/Master execution, and verified-Original-only Master. This foundation does not accept blocked advanced editing families. |

The current desktop Stage 2 product route creates exactly one disabled
`video-reference` source track and one enabled, empty, neutral `video-main`
output track. Imports and ordinary manual source-range controls address only the
reference track; the approved semantic execution owns generated output. The
desktop reads review, Render, QC and Preview through the Stage 2 workspace and
exact current Preview authority only. Projects with any other topology are
rejected without conversion or Job recovery. Local feedback can target only a
`video-main` clip proven to belong to the current execution lineage.


## Stage3 必需执行子集（目标）

上述桌面限制属于 Stage2 当前入口，不能成为 Stage3 产品上限。S3-04/05 在正常 Host CommandEditIR/CommitPlan 和 Semantic Render Manifest 路径内补齐选材/重排/多镜头 trim/ripple/替换、关联音频/字幕、所需 J/L 衔接、gain/fade/ducking、字幕内容/时序、静态 reframe 和基础色彩，并允许 output 手动精修。范围/可观察效果见 [Stage3 映射](../product-intelligence/STAGE3_PLAN.md)，不是宣布整个 CAP 家族 accepted，也不把所有专业特效设成前置。

## 混合素材资源包接入

本次用户授权范围由 [持续 ExecPlan](../plans/2026-10-02-mixed-media-resource-packs.md) 与 Stage3 的五个顺序工作包管理。P1 将 JPEG/PNG/WebP 静态身份、展示时长与独立音频接入既有观察、规划、Command/Commit 和双目标渲染路径；视频保留场景与帧验证，图片和纯音频不伪造视频扫描。图片按真实解码方向和透明通道处理。独立声音区分 narration、music、sfx；对白 ducking 仅作用于音乐。不同尺寸的输出使用每段显式注册构图。

资源目录、自动配乐、扩大精修与全流程真实接受分别由 P2–P5 接续；尚未完成的包不属于当前已交付能力。技术回归和真人观看听评分别记录；历史 Stage3 人工接受债务保持原状态。
