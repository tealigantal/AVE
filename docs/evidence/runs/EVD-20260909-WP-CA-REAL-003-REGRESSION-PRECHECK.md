---
evidence_id: EVD-20260909-WP-CA-REAL-003-REGRESSION-PRECHECK
date: 2026-09-09
work_package_id: WP-CA-REAL-003
repository_commit: worktree-real-product-audio-regression-precheck
code_fingerprint: fa7c3d69db3eb8788211ab3f290a2bb8ff6d4c3f24b2d572adc51152ca79f857
capability_ids: [CAP-RENDER-001, CAP-PRESET-001, CAP-FND-001, CAP-CA-CONTEXT-001, CAP-CA-SKILL-001, CAP-CA-DURATION-001, CAP-CA-STORY-001, CAP-CA-PERMISSION-001, CAP-CA-PIPELINE-001, CAP-CA-FEEDBACK-001, CAP-CA-PRODUCT-001, CAP-CA-PRODUCT-002, CAP-CA-UX-001, CAP-CA-EXIT-001, CAP-CA-SEC-001]
acceptance_ids: [ACC-CA-PRODUCT-001]
commands: ["pnpm run docs:architecture:test","pnpm run docs:fingerprint:test","pnpm run typecheck","pnpm run stage2:check","pnpm run architecture","pnpm run architecture:test","pnpm run ci:workflow:test","pnpm run feature-boundary:test","pnpm run feature-behavior:test","pnpm run renderer:workbench:test","pnpm run workbench:host:test","pnpm run model-candidate:host:test","pnpm run electron:runtime:test","pnpm run adapter:boundary:test","pnpm run adapter:roundtrip:test","pnpm run contracts:check","pnpm run contracts:identity","pnpm run contracts:clean","pnpm run storage:check","pnpm run render-bundle:test","pnpm run project-api:boundary","pnpm run project-host:boundary","pnpm run ipc:boundary","pnpm run ipc:sender:test","pnpm run worker:boundary","pnpm run worker:python:lint","pnpm run worker:python:typecheck","pnpm run job-engine:test","pnpm run job-persistence:test","pnpm run worker:crash-recovery:test","pnpm run worker:client:test","pnpm run project-host:job:test","pnpm run platform:foundation:test","pnpm run project-recovery:test","pnpm run dev-cli:test","pnpm run worker:analysis:test","pnpm run worker:media:test","pnpm run worker:qc:test","pnpm run proxy-map:worker:test","pnpm run worker:render-graph:test","pnpm run worker:render-correctness:test","pnpm run basic-vlog-toolkit:test","pnpm run timeline:audio-caption:test","pnpm run proxy-time-map:test","pnpm run object-store:test","pnpm run reconciler:test","pnpm run model-gateway:test","pnpm run evidence:persistence:test","pnpm run evidence:host:test","pnpm run story-host:test","pnpm run assembly:host:test","pnpm run assembly:timeline:test","pnpm run rough-cut:test","pnpm run commit-plan:test","pnpm run timeline-core:test","pnpm run timeline-redo:test","pnpm run review-artifact:test","pnpm run reaction-host:test","pnpm run delivery:host:test","pnpm run export:host:test","pnpm run project-host:test","pnpm run timeline:host:test","pnpm run undo-redo:test","pnpm run render-service:test","pnpm run render-persistence:test","pnpm run timeline-render:test","pnpm run acceptance:foundation:synthetic","pnpm run acceptance:final:synthetic","pnpm run render-graph:test","pnpm run stage2-product-workspace:real","git diff --check"]
result: passed_precheck
environment: "Windows Node 22, Python, local FFmpeg; authorized media stays repository-external"
artifacts: ["all check components after its two Evidence-metadata preconditions passed", "new same-track encoded-audio and intentional-gap regression passed", "isolated old filter fails at 2.1 seconds with zero tone amplitude", "fresh real 60-second Preview/Master pass render QC after selecting audible 2..62-second source window"]
remaining_risks: ["This is supplemental regression evidence, not package completion or human acceptance.", "Fresh Electron Product feedback is blocked by the old harness omitting mandatory target selection and current exact feedback creation confirmation; scope authorization is pending.", "The full pnpm run check aggregate has not yet passed its refreshed documentation gates.", "No Stage Exit, real-media/human status promotion, merge or release is claimed."]
---

# Current Worker v5/r15 regression checkpoint

The current-only audio repair and generated identities are exercised by the
listed repository checks. All commands in the declared check chain after
its first two Evidence-metadata checks passed; this is not a claim that the
aggregate check command passed. Final synthetic acceptance also passed.

Historical evidence and applicability index entries are unchanged by this
checkpoint. The scope hashes below bind new executed regression evidence to
the affected existing capabilities. Existing baseline statuses are retained;
this does not establish fresh Product, UX or Stage Exit human acceptance.

Real attempt history: r9 eliminated later audio loss but exposed the Original
silent lead-in; r10 passed QC then rejected noncanonical Pipeline topology;
r11 failed the fixture probe precondition before rendering; r12 passed render
QC and current Preview playback, then failed to create feedback because the
harness left its mandatory target selection empty. The canonical fixture
track rebuild uses Host Commands; production open and QC rules are unchanged.

## Current regression scopes

CAP-RENDER-001
scope_fingerprint: 773be932d258a390d805f7113cf1154044800def4b8013826711f82009b6ff2c

CAP-PRESET-001
scope_fingerprint: 7bd6181e88aee5fb11f38d2cb470f20af5c586c0a839a48b9fe83569a38c2873

CAP-FND-001
scope_fingerprint: 0bfdf401b000d5e26b8f56df56d0cf8b09f09dd59754b08ddef78ab1e76627c8

CAP-CA-CONTEXT-001
scope_fingerprint: 115a0751b8ee48cb0a4fd5f1772062f163567968bbecadf7c1400b9ca6507722

CAP-CA-SKILL-001
scope_fingerprint: 46453e569c64cff7351211b5b7cffff19b4a4d0e30d6acd13fa6b37882b4d895

CAP-CA-DURATION-001
scope_fingerprint: c4d2b2e7daae9a7a2602293e88b4d6bcb32f7d7119648671b628ea7bfe8b5790

CAP-CA-STORY-001
scope_fingerprint: 0937ea0496cb7a57b3083fb17932c53225eab738916981dd02aa022f37eb8296

CAP-CA-PERMISSION-001
scope_fingerprint: 509781e8cdf5b97f806532a5df200ce3dde9e98023127330957b4ed81714cf10

CAP-CA-PIPELINE-001
scope_fingerprint: 76a8b335150a4fbbd54beff6673f51b61f94ccf29e0caccb9dd9fe8ab2896018

CAP-CA-FEEDBACK-001
scope_fingerprint: 4cd743cc1a1b1da3112958ecc4baaacfcdcfe1c041e39baad4fbec016c27118d

CAP-CA-PRODUCT-001
scope_fingerprint: 64e76d5b6e60ae4ccfb59d6085d811b3ee0a7cd93e0b6e7e78ec71c84d3f908b

CAP-CA-PRODUCT-002
scope_fingerprint: 6b76740fad01df143c5235735e19fac56ed2719faa21870903dc974f17da9c6a

CAP-CA-UX-001
scope_fingerprint: 5aab49547571d6bfcfaa6aae3c97cf7d58e4b841d006c114fca933e828dd3667

CAP-CA-EXIT-001
scope_fingerprint: c9e62e5feff790c1c160aadc0e891833a6836dc09baf2a2ba2e1fcd2dc5207b9

CAP-CA-SEC-001
scope_fingerprint: abb2879f1424e3dfdcc096630fdf4e6f8b3c011484ddb354d9317f0d54e93000
