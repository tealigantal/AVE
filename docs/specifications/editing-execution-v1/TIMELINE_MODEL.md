# Timeline Model

## Purpose
Define authoritative versioned timeline objects and commands. ## Scope
CAP-TL-001 objects, tracks, nesting and CommitPlan. ## Non-goals
No renderer UI behavior. ## Capability IDs
CAP-TL-001. ## Domain Objects
Sequence, Track, Clip, Transition, CompoundClip, NestedSequence. ## Schema Requirements
Contracts use IDs, RationalTime, version and discriminated object kinds. ## Timeline Commands
Validated atomic add/remove/replace/move/trim/roll/ripple/slip/slide/split/group/link/nest/property commands. ## CommandEditIR Mapping
CommandEditIntent resolves to commands in CommandEditIR, never direct mutation. ## RenderGraph Mapping
Committed sequence supplies ordered graph inputs. ## Backend Mapping
Adapters consume graph only. ## Validation Rules
No overlap/lock/version/cycle violations. IDs are unique across Timeline objects; compound children must exist in the same sequence track; parent and nested-sequence references share one cycle graph; transitions require adjacent clips, an exact transition range, and duration strictly shorter than both handles; TimeMap, Automation, Color, Mask, and track-state invariants are validated before Commit. ## Persistence/Migration Impact
Project Storage persists only the current object-backed Timeline snapshot; absent object references and non-current project formats fail closed. ## Error Semantics
Conflict/invalid/locked are explicit. ## Preview/Master Rules
Same committed version. ## Fallback/Bake/Blocker
Unsupported object blocks. ## Acceptance Scenarios
CommitPlan `affected_ranges` use pre/post clip ranges, real track extents, transition/caption/lock spans, ripple-tail invalidation, and full pre/post invalidation for restore. ACC-011, ACC-013. ## Open Questions
Compound edit UI policy.

## WP-RENDER-002 Executable Boundary

Validation covers globally unique object IDs, parent and nested cycle graphs, compound membership, transitions, automation targets, masks, color, track state and exact TimeMap ratios. Every command family emits real pre/post `affected_ranges`, and failure leaves the in-memory sequence unchanged. Nested sequences, compound clips and adjustment tracks remain valid persisted domain objects but must resolve to explicit blockers until an adapter implements their complete output semantics.

Root Sequence `timebase` is the authority for all Timeline coordinates. RenderGraph converts each integer Timeline tick through the complete RationalTime `value/timescale`; it must not infer Timeline units from any source-media stream. Invalid non-positive Sequence timebases fail validation. Clip placement, gaps, TimeMap execution segments, captions/words, transitions, audio delays and total duration all use the same converted authority.


## Stage3 混合素材精修适配

`PrecisionEditV1` 是 Host 所有的手动动作边界，编译为当前 CommandEditIntent/IR 批次，再模拟、检查保护与锁、生成 CommitPlan 并原子提交。Renderer 不直接修改 Timeline。源 PTS 差经源时间基、采样/帧网格和作品 RationalTime 精确换算；不复用旧 trim_source 的 PTS 差作为作品时长。

作品级区间删除处理全部画面、音频、字幕和 gap，跨区间音乐保留两个真实源片段并在压缩后的时间点接续。分割与复制重建新对象身份及关系，整体后移保留原有 grade/route 等身份。一次用户操作对应一个版本与一次历史恢复；任何保护冲突或无法精确表示的区间均不提交。基础裁切对未重基准的动画、跟踪、转场区间或变速明确阻断，不产生部分成功。


Ordinary typed picture deletion, movement and trim preserve explicit empty intervals as committed Gaps; whole-work ripple shortens them. The optional retain_manual_layout measurement binds the complete exact picture selection, original source identities, current positions and work extent to its immutable receipt. Final model decorations cannot author or replace this layout. Equivalent RationalTime source fractions preserve the original source representation and protected identity. Intentional gaps participate in Preview/Master manifests and narrowly measured black/static/silence QC intervals.
