---
evidence_id: EVD-20260918-S3-BOUNDARY-REVIEW-FIX
date: 2026-09-18
code_fingerprint: 610444b2b4109b8c47d9d63e04c1e76f781a35850b7e1d3fddfa6b0e05c880e8
repository_commit: 3521aa8
result: review_fixes_focused_pass_full_gates_pending
---
# Boundary review fixes before full regression

Owned by the [same ExecPlan](../../plans/2026-09-18-stage3-first-personal-creation.md). Extends [partial precheck](EVD-20260918-S3-BOUNDARY-PRECHECK.md); no earlier Evidence is rewritten.

Read-only review confirmed the four Gateway/request fixes, then found a missing cancellation check between asynchronous cache completion and replay persistence. Added it and asserted zero replay writes. A cache operation already started before cancellation cannot be undone by an outer check; production private-profile use must not use an uncoordinated cache. Stage3 production calls/caches remain unwired.

Compiler review found caption ordering changes omitted from affected ranges; ordering now contributes actual spans, with regression assertion. Fade inputs again reject unsafe integers. Existing Stage2 product test and the first full check failed on EDIT_PROTECTED_REFERENCE for the first creation of an intended protected output. Fixed reference protection to distinguish first creation from subsequent mutation; existing-object hard protection remains. Targeted Stage3 test asserts both. These failures remain recorded; no gate was skipped or weakened.

After code changes: stage3:check passed; after the final additional hard-protection assertion, stage3:creation:test passed. Exact final-source full check and final synthetic remain pending. Stage2 product regression is being rerun after the code fix. Scope bindings below remain partial precheck applicability, not completion/human acceptance. External input blockers and unfinished production path from prior Evidence still apply; no real model/media/film/cost/PR.

- CAP-RENDER-001; scope_id: editing-execution-v1.CAP-RENDER-001; scope_fingerprint: ddee5af7af1e6d00b311d4dad0dc48ed86027076337c5f2ca7fe8ecc703d696e
- CAP-PRESET-001; scope_id: editing-execution-v1.CAP-PRESET-001; scope_fingerprint: 1291a8ceed4fe1c42fdb61ba11d2733f6ac1603229389f3cd917d6f4126d56af
- CAP-FND-001; scope_id: editing-execution-v1.CAP-FND-001; scope_fingerprint: 05b53fabdec123e0355fb1e0518c1a1b10ad0c236805b526142e0f2c6b46cd05
- CAP-CA-CONTEXT-001; scope_id: creative-assistant-v1.CAP-CA-CONTEXT-001; scope_fingerprint: 491258f56b9813639af7845b1fc2ffe6cc264de913a021963e92647418f11192
- CAP-CA-STORY-001; scope_id: creative-assistant-v1.CAP-CA-STORY-001; scope_fingerprint: a5680c83fd413f0ad2a499700a7fce53979bbb1dcf7ce5c61f12445cc7a33955
- CAP-CA-PIPELINE-001; scope_id: creative-assistant-v1.CAP-CA-PIPELINE-001; scope_fingerprint: b4b2f9cb901c9d4eeee7f78570f518cf70edd74a12458898e0dcb3ff77628dc4
- CAP-CA-FEEDBACK-001; scope_id: creative-assistant-v1.CAP-CA-FEEDBACK-001; scope_fingerprint: ad28764476d6283bf91c3305d4a14686417d41e3b1e39189666f669da7372c57
- CAP-CA-PRODUCT-001; scope_id: creative-assistant-v1.CAP-CA-PRODUCT-001; scope_fingerprint: 8bb75a6015da748bb0a80d6a0075d601e088bb09f2097cf3bc3f0eea68e5db8b
- CAP-CA-PRODUCT-002; scope_id: creative-assistant-v1.CAP-CA-PRODUCT-002; scope_fingerprint: 3cde44a850d31099e35860355bf5aa54a9e6a8dba101c97a342ef58a8604a6b0
- CAP-CA-UX-001; scope_id: creative-assistant-v1.CAP-CA-UX-001; scope_fingerprint: 0322d1638340a66ba9b9d6b714af1368635b1d9e2275479fce2f0629c3f9dacd
- CAP-CA-EXIT-001; scope_id: creative-assistant-v1.CAP-CA-EXIT-001; scope_fingerprint: 4a7a8c75c8c8b1b4eb90e687edac870bb513ecd7cd0c4fac76313423db1a1164
