---
evidence_id: EVD-20261111-DOC-016-INTERFACE-PLAN
work_package_id: DOC-016
date: 2026-11-11
repository_commit: 293695defc884445630b7d83e77a58c8f2031186
code_fingerprint: 5128515f4e0f872ff5405e5a1829f23a3f79c3c81f20e2b99cc2aa8401a60361
capability_ids: []
acceptance_ids: []
result: partial
---

# Interface-level implementation plan

This independent documentation Evidence belongs only to [DOC-016](../../plans/2026-11-11-cloud-editing-benchmark.md#doc-016逐接口实施与失败闭合接续). It records the requested plan elaboration, not implementation, P4/P5 acceptance or competitor parity. The existing plan is the owning navigation and execution design; no duplicate status source is created.

The prior turn inspected current source and Hypit fixed commit `47bfe6e9a231773a29af447eeb9fe65f32217275`. Pure in-memory probes observed `视频60秒内` parsed as exact 60 seconds, `1分钟以内` not recognized, 4.1 seconds at 30 fps projected as tick 122, and a `PRECISION_FRAME_BOUNDARY_INVALID` converted to generic `COMMAND_FAILED`. These are bounded function observations, not a full real-media or cloud-model run. The fixed upstream capture implementation uses an opaque background for its PNG frames; DOC-015 and the still-Proposed ADR-0060 were corrected.

Before editing, the working tree had 551 dirty/untracked entries, branch `codex/cloud-editing`, and HEAD above. The plan and ADR previous hashes are recorded in the DOC-016 progress entry. This work extends the existing plan with I1–I7 contracts, concrete boundaries, recovery and complete-delivery verification; it does not update programme or generated files and does not install packages, call models, deploy, submit or push.

Documentation validation checked all 3 touched documents and 14 local links/anchors, with no missing link or trailing whitespace; scoped `git diff --check` exited 0. The recomputed code fingerprint remained `5128515f4e0f872ff5405e5a1829f23a3f79c3c81f20e2b99cc2aa8401a60361`. Product tests, historical acceptance and `docs:check` were not rerun solely for a documentation update, consistent with the user's recorded instruction. No implementation or product test is claimed by this record. Result is partial because implementation and end-to-end validation remain unperformed.
