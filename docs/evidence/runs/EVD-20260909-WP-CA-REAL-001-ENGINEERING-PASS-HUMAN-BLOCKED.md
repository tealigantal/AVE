---
evidence_id: EVD-20260909-WP-CA-REAL-001-ENGINEERING-PASS-HUMAN-BLOCKED
date: 2026-09-09
work_package_id: WP-CA-REAL-001
repository_commit: 7b4e26ee6a0a0ad944afd0fb889b54d7a9a952a9
code_fingerprint: 9d2e8eb79ce8bf09fe45adf519fb84deb89dcab09fef9a35dd5f3e2ed17f6a8e
capability_ids: [CAP-CA-PIPELINE-001, CAP-CA-FEEDBACK-001, CAP-CA-PRODUCT-001, CAP-CA-PRODUCT-002, CAP-CA-UX-001, CAP-CA-EXIT-001]
acceptance_ids: [ACC-CA-PIPE-001, ACC-CA-FEEDBACK-001, ACC-CA-PRODUCT-001, ACC-CA-PRODUCT-002, ACC-CA-UX-001]
commands: [intelligence-pipeline:test, feedback-revision:test, stage2-product-workspace:test, stage2:check, typecheck, check, acceptance:final:synthetic, intelligence-pipeline:real, stage2-product-workspace:real, feedback-revision:real, docs:sync, docs:check]
result: engineering_pass_real_media_and_human_blocked
remaining_risks: [authorized_main_case_media_absent, direct_human_review_pending, localized_picture_freeze_and_listening_assessment_pending, exact_remote_ci_unavailable]
---

# Stage 2 closeout engineering and truthful external blockers

## Source and integration identity

Target branch: codex/stage2-real-pipeline-rebound-precedence. Initial and retained local HEAD is the repository_commit above, one existing documentation commit ahead of remote fab1856b14a8f7e995c510bbdabb47c9c70f96cb. Initial worktree was clean; this turn leaves reviewable uncommitted edits, without commit, push, merge or publication. Final source and synthetic artifacts share the exact fingerprint above. GitHub PR list (all states, exact head branch) and run list returned empty arrays, not failed CI. Development Integration cannot yet be certified against a final pushed SHA.

## Defects reproduced and repaired

1. Before repair, a legitimate execution ID/Timeline plus changed profile and fully recomputed plan IDs incorrectly rendered; regression failed with Missing expected rejection. Saved/request/recomputed source, semantic and two-plan identities now compare per field after authority resolution and again at publication/reuse. Deterministic Product regression covers changed profile, changed range, saved valid-shaped plan race, unchanged approved state/results and valid cache reuse. Existing Original permission, fingerprint, context and transaction gates remain.
2. Canonical Product Intent generation reproduced 10 operations for 14 approved Evidence ranges. It now emits every range in Beat order. The material run calls the canonical Product generation and action APIs, not a parallel film builder.
3. Product local feedback preview now displays original/revised ranges, exact total extent and whether inward trim can leave an internal gap; it does not imply ripple.

## Executed validation

- Focused intelligence-pipeline:test, feedback-revision:test, stage2-product-workspace:test and stage2:check passed.
- Final-source typecheck, complete pnpm run check (exit 0), and pnpm run acceptance:final:synthetic (exit 0) passed. Full check includes existing audio/render correctness, worker identity, permission, persistence, recovery, architecture and contracts gates.
- AVE_STAGE2_CASE_SYNTHETIC=1 with node --expose-gc --import tsx tests/integration/stage2-material-case.test.ts passed on the exact final fingerprint. It generated six test assets, 16 Evidence choices, 10 Beats and 14 adopted ranges per candidate. A/B are 120 seconds, accepted tail revision is 119 seconds. Three render records each retain 110 interval/seam observations, full decode, source/audio presence checks and QC. These are synthetic engineering fixtures, not independent real camera originals or creative acceptance.
- Missing actual requirement carriers went through normal Pack construction and exposed missing_requirement_ids. Stale workspace and selected-source permission denial preserved Timeline/results. One legal suggestion was accepted, another legal suggestion rejected, re-open preserved the rejection and could not re-execute it.
- Two fresh human projects reopen through openCanonicalStage2Project with two candidate Stories, zero approved plans and zero executions. Their source Contract/Evidence/Direction preparation is explicitly simulated; only subsequent real Product decisions can establish human interaction Evidence.
- Tool versions: Node v22.16.0, pnpm 11.19.0, Python 3.11.8, FFmpeg/FFprobe 7.1.1.

## Real-media and direct-human gate

All four required external environment inputs were absent. Actual intelligence-pipeline:real, stage2-product-workspace:real and feedback-revision:real invocations exited nonzero on missing inputs. No new authorized real assets were used (count zero), no real main-case encoded film was generated, and no human score or approval was filled. The external prepare entry produced a Chinese read-only start page, material instructions and blank rubric in a new directory.

Legacy single-source tests retain only their automated protocol claims. The shared main case consumes content observations and explicit provenance rather than deriving facts from planned durations. Candidate identity comparisons use actual asset/range identity. Human meaningfulness, truthful observations, real originality, picture/freeze/listening quality and creator acceptance still require real review. Nothing here proves autonomous source understanding or Stage 3 capability.

REAL-001 is blocked, DEBT-CA-STAGE2-003 and DEBT-CA-REAL-001-TEST-DESIGN stay active, and EXIT-002 remains pending the incomplete REAL dependency. docs:complete is intentionally not invoked on either package. No tested status was promoted to accepted.

## Portable synthetic artifact identities

Case: deterministic-case-validation; input kind: deterministic-fixture. Private paths and media remain external.

```json
[
  {
    "label": "before",
    "timeline_version": 1,
    "preview_sha256": "163ad9f26a8ab48b381990dd92d2901e8b5caa059c5a127c7ac4e8d1e2905a98",
    "master_sha256": "163ad9f26a8ab48b381990dd92d2901e8b5caa059c5a127c7ac4e8d1e2905a98",
    "preview_duration": "120.000000",
    "master_duration": "120.000000",
    "qc": "passed",
    "interval_and_seam_checks": 110,
    "execution_id": "product-execution-941197feebcd1036f4ac7ffa",
    "semantic_graph_hash": "41d9387d2984d163393cef405f065f6be76b93ac898ce82340a7a0b269730886"
  },
  {
    "label": "after",
    "timeline_version": 2,
    "preview_sha256": "5f0735bb915a5c0f491f14b9aa2799b582d1c7bfe965d96ffd293e4beca6d93b",
    "master_sha256": "5f0735bb915a5c0f491f14b9aa2799b582d1c7bfe965d96ffd293e4beca6d93b",
    "preview_duration": "119.000000",
    "master_duration": "119.000000",
    "qc": "passed",
    "interval_and_seam_checks": 110,
    "execution_id": "product-execution-8109529371377efac03c0fb6",
    "semantic_graph_hash": "bbb2f1554bab8be2c0874bf60df9088e92175f27a5c95856be32192c309dcb99"
  },
  {
    "label": "before",
    "timeline_version": 1,
    "preview_sha256": "ff5f9eacd5d996d73482582a73011e6c8100a5a3e30eff28ef2605f52321afd1",
    "master_sha256": "ff5f9eacd5d996d73482582a73011e6c8100a5a3e30eff28ef2605f52321afd1",
    "preview_duration": "120.000000",
    "master_duration": "120.000000",
    "qc": "passed",
    "interval_and_seam_checks": 110,
    "execution_id": "product-execution-2ffdd4bfd5d92d00f19c548e",
    "semantic_graph_hash": "d990a5ce9fcd517f1c74bf9ccf5a389795783c938fd56500230e0865a4e735ca"
  }
]
```

## Current bounded applicability

Complete repository regression refreshes technical applicability only; historical acceptance scope is retained without new human claims.

CAP-RENDER-001 scope_fingerprint: e1e5442ee593ecd466f7ad4c12297a50c6c036bc9f6ccd3711e41a904960de7b

CAP-PRESET-001 scope_fingerprint: d1915f0ff6a2ac621a40078101b4efdc44cbeb6b1c3703c34184dd1678c275a2

CAP-FND-001 scope_fingerprint: e79e3357d35d67334009377e117877d50a0366f06590e5293207612f9f9ff6a0

CAP-CA-GOV-001 scope_fingerprint: 38829c82e73b2c53f19b7e22b9700b87f507d83098d123cad55c0acf350a6d99

CAP-CA-CONTEXT-001 scope_fingerprint: ed5bdeec9ef5f944f044c6dac2122ab37504b74f3ca0d31b8307f8dc45d86496

CAP-CA-SKILL-001 scope_fingerprint: c2fbd9f8209fae6e7efa37e9e2db7810ad140bc8cb4e542d96c6460ccb9d75e7

CAP-CA-DURATION-001 scope_fingerprint: e45e91ff642ab8b09dbda63bf08e29cb2d236ae5c63f8cd1b8734a1b37474ae3

CAP-CA-STORY-001 scope_fingerprint: 082114162c7a9a5bde40734abaae6d47eba32eec2be1996bd875cde08de75f9c

CAP-CA-PERMISSION-001 scope_fingerprint: 5ca694526dba91b68e7e246d1cdd7ac7539ac7d5d11b16523d5da04205bf1610

CAP-CA-PIPELINE-001 scope_fingerprint: 4a2886e42ab8451bec0cd534ae3ca46eba2702af53043db7c43eb4b3cf43ba46

CAP-CA-FEEDBACK-001 scope_fingerprint: 24c33f0efbd4235c5c6c830f4f484bf98c1b80d8522f4dc4216897a390549daa

CAP-CA-PRODUCT-001 scope_fingerprint: c76c65adf0e7ca703929823e9a60152013fd39100f7bcc921d7a7f05a17e3ebd

CAP-CA-PRODUCT-002 scope_fingerprint: d9f8d25bedad74a24df689a818555e878e978cdc787d272f7d473d0c865c76a8

CAP-CA-UX-001 scope_fingerprint: c4966aae90d6ed08dd70126cb244164f32f55617a7207df9072c6cb69219cb48

CAP-CA-EXIT-001 scope_fingerprint: 3cff34e25a2ab36cf305ebf8b14d77aee94b0944d2274772fec2ff0d184b5734

CAP-CA-GOV-003 scope_fingerprint: 329c1bd8717727ecd823d56b9427444e35896a6612d3b44673f46a983370dd4f

CAP-CA-GOV-002 scope_fingerprint: 62daa1348ef15ecdedc1a82e2d5c4937f441c16ab21cd81b8236937ae09424e7

CAP-CA-SEC-001 scope_fingerprint: abb2879f1424e3dfdcc096630fdf4e6f8b3c011484ddb354d9317f0d54e93000

CAP-CA-RECON-001 scope_fingerprint: d0e03348969e73ffd0bb675bc8e950ad4c91014bc1725c01f3e869819b15b104
