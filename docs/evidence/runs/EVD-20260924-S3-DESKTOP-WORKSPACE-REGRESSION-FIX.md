---
evidence_id: EVD-20260924-S3-DESKTOP-WORKSPACE-REGRESSION-FIX
date: 2026-09-24
code_fingerprint: 948dfa0219b5a78c1cfc7254b57a291df503603d80c96811d5e73b0a0ec8fd82
repository_commit: 3521aa8a5d019fb49dd486a11a424bc937857db1
result: targeted_regressions_pass_full_gates_pending
---
# Desktop integration regression repair

The prior source's full check (session 5341) exited 1 with
TIMELINE_SNAPSHOT_REFERENCE_REBOUND. The isolated Stage2 ambiguity fixture
copied the object tree and database but retained source object-store absolute
paths. Root repaired that test copier: verify all source canonical paths and
copy hashes/lengths before a transaction changes only the copy's paths. Both
production Timeline writers already produce canonical references. Production
open validation and all existing ambiguity/zero-write assertions are unchanged.
Read-only review found no remaining blocker in the fixture repair.

The storage negative test now asserts the exact current missing-reference
message, zero writes and finally-close. An initial anchored regexp mistakenly
matched the Error prefix rather than message and cleanup exposed EBUSY; the
exact message assertion and reliable close fixed this, without weakening the
expected denial. This development failure is retained in the execution record.

Targeted stage2-product-actions passed (session 22325, exit 0); project-storage,
stage3-project-open and typecheck passed. The previous Desktop preliminary
Evidence retains all other focused results and engineering artifacts. This is
a source/test correction, not a new real-material or human acceptance claim.
Full current check and final synthetic are pending on this fingerprint.

OS TEMP retained logs and SHA-256:
- ave-stage3-desktop-workspace-check-20260924.log: 18e2e7821855711de566eca2b1e5aa3fc09418b582d74aaefa4a1d6b3b56ae77
- ave-stage3-product-actions-fixed-20260924.log: 7b97fd7abe1ac5f7c52e163f6bfb6d3b2aca701025498c5694291a82559b7297
- ave-stage3-desktop-workspace-typecheck-fixed-20260924.log: 7599ce85929321f587f58c8c53bec001591ebd09b02f5b47265a0efcab566493

Approved real sources/learning scope, exact design original and bounded
provider/model/data/cost inputs remain absent. Production counting/tariff and
Main policy injection remain dependent work. No external model call, private
upload, real work/recording, commit/push/PR, merge or release occurred. The one
integration package stays active; Stage3 remains specified.

Engineering applicability bindings, without status promotion:
- CAP-RENDER-001; scope_fingerprint: 3212a9c5bfbc49e403fdc7ab46c047d2594658feb2255eb15418879a4bed0e61
- CAP-PRESET-001; scope_fingerprint: 4dab860365bb1873b911eab31abf2b14aa7ce2f1dd1426247a9bde294403254b
- CAP-FND-001; scope_fingerprint: a460cd17fd40b211648ab64c7e7a71dd652ca800a974b4147b8307aecebb66b3
- CAP-CA-GOV-001; scope_fingerprint: 48d833c6e12eedbb46e6456f2cc7d3c5c66f1ddd1ff743d4d583a3b113306e97
- CAP-CA-CONTEXT-001; scope_fingerprint: d09adab928260b82d06acd67abfa36ad21ea99cd06cf874d512ffbfc2221efb7
- CAP-CA-SKILL-001; scope_fingerprint: ad8b411a1bfd4d7e1936aee30b933fa37816c14aea439f4e705f157bf173ec0c
- CAP-CA-DURATION-001; scope_fingerprint: 3f51ec7e2e7f4d90fbcc1de04643b2b5246f985a2a92f6da8085bc09cc2933a4
- CAP-CA-STORY-001; scope_fingerprint: c84846359de1cbd93b04259f2b0d8a10888933b6745589eb37a55b5f95a4ef62
- CAP-CA-PERMISSION-001; scope_fingerprint: 48a61449d5712cc08956b57ed25bb7125f80279337629d518a229898160e32ad
- CAP-CA-PIPELINE-001; scope_fingerprint: 7278d58b8c71ba234a16466542c61844776cf41c382dc6fc08b6679c46b4c8a1
- CAP-CA-FEEDBACK-001; scope_fingerprint: 70e16672ba5295e3e0f9e2b9ba67c3584b1f4a4d9ea8adb69776feee2cd10f1e
- CAP-CA-PRODUCT-001; scope_fingerprint: 4198db2092f3411d59ba13fdb6b4c13de39d3698c8741b12eeadbf4f1d69fc32
- CAP-CA-PRODUCT-002; scope_fingerprint: 09a5d82b211651343dfaf335629ab49d16a539c7c1994d298eeb132d790f5f34
- CAP-CA-UX-001; scope_fingerprint: 2c8d2d87b13f928fbc5ebecc98561956e37927c3d348e3091046f2ab93e02a1e
- CAP-CA-EXIT-001; scope_fingerprint: 323766c06590d435e56c3a88e1bbc5643feeba9d4a904dbbb69fc9952a05e6dc
- CAP-CA-GOV-003; scope_fingerprint: 70a5f532f9b610c723e8d92ee888dc3d3be9f9b9143a6649134ab59c2c5756c9
- CAP-CA-GOV-002; scope_fingerprint: cde84d6a6f2ce54440168c1813f8e0a9399769ed91d42afd55b1999aec220b00
- CAP-CA-SEC-001; scope_fingerprint: ba8ef779118d97220ba7c39ba0d752beda282a858eebd75f42bceac07f19bbe3
- CAP-CA-RECON-001; scope_fingerprint: f2fcfc77b2e826f500435d1a17aebe6246d697f52b67bf1c0565073561d07311
- CAP-S3-FIRST-LOOP-001; scope_fingerprint: 54e0ce449052607ed382bd67b975ddfcd89c99e70d8972f785e0aa1145cf5305
