---
evidence_id: EVD-20261015-S3-P4-UX-CURRENT-R3
work_package_id: WP-S3-RELIABLE-UX-001
date: 2026-10-15
recorded_at: 2026-10-15T00:15:48+08:00
repository_commit: b600b38f2afe280f0152c1811e6b2d928e5e3a95
code_fingerprint: 30d4731e157742f8a1c7c0d004ac044dc7609b0f622c699d826ae1a62b49adae
scope_fingerprint: 62ff4352a950930a1bd5f3320218211668e4a9b5fcd0f9d5006cbb5110fc1897
capability_ids: [CAP-S3-P4-DEMO-INTEGRATION-001, CAP-S3-RELIABLE-UX-001]
acceptance_ids: [ACC-S3-P4-DEMO-INTEGRATION-001, ACC-S3-RELIABLE-UX-001]
result: passed
interaction_record: docs/evidence/assets/p4-ux/current-run-20261014-r3/P4-R3-WIN09-WIN10-interaction-record.json
interaction_record_sha256: 4db5255b6b77f5ded56065a589199b7060d1a5153bf60552edbeb00c8d463eb5
interaction_receipt: docs/evidence/assets/p4-ux/current-run-20261014-r3/P4-R3-WIN09-WIN10-interaction-receipt.json
interaction_receipt_sha256: 9a3bcd0faecf927e6110c25311bfe03411844e56c6f8e53819b59f69b97f205f
---

# P4 integrated workbench and current-build interaction acceptance

## Scope and current build

This Evidence closes the two capabilities and acceptances owned by `WP-S3-RELIABLE-UX-001`. The capability-scope fingerprints are `CAP-S3-P4-DEMO-INTEGRATION-001` `scope_fingerprint: 62ff4352a950930a1bd5f3320218211668e4a9b5fcd0f9d5006cbb5110fc1897` and `CAP-S3-RELIABLE-UX-001` `scope_fingerprint: 24cf04dbb0abcb1fbcb0afb0702cd83fdef73fd03d10fd8b8290d13fa1d0d3fd`. The interaction record and validator receipt bind the same current source fingerprint, build-input digest, runtime services, and exact required steps WIN-09 and WIN-10. Desktop image: `sha256:df69a9c24ba3f3207b565a63adcf5cec1e08a923945d0eee10d77d5a2b20eb0b`; Whisper image: `sha256:2a6c53ddf1513f1cd2d1a3b81b56a0a57cd4e1124b0ee5ac32c67725d27a422b`.

The implementation work completed L0–L7 in the order recorded in DOC-007. The formal workbench now follows the demo's page, timeline, annotation, navigation, and recovery behaviors through real Host-backed projects and render/export receipts. Focused P4 integration, timeline, renderer, interaction, model/request/generation, contract, architecture, type, and Worker checks are recorded in the unit checkpoints and prior unit Evidence. The post-index full `pnpm run check` passed under Python 3.12.14/Pillow 12.3.0, and `pnpm run acceptance:final:synthetic` passed. DOC-011 retains the default-Python Pillow mismatch and the retired Stage2 real-review debt as explicit non-passes.

## Current-build product interaction

- **WIN-09 — persistent failure and recovery:** A malformed MP4 produced `MEDIA_SOURCE_REQUIRED`; the same issue remained visible and queryable after the toast interval and an unrelated successful image import. Retrying the failed item with a valid same-name H.264/AAC source imported it successfully and retained the resolved failure history. The recording, screenshot, action log, private Host snapshots, and input digests are listed in the interaction record.
- **WIN-10 — empty project to exported result:** The formal UI imported the authorized six-second H.264/AAC input, completed request-scoped authorization, and used the real Qwen vision/planner path. The Host committed model-sourced timeline v1; Preview and Master QC passed. The player completed playback, supported seek, and the export page wrote a `file-written` receipt. The downloaded MP4 hash matches the Host output hash: `d599893a3cd04f49da021708596d93be82170c3ee98d335052e4bd4faaec5bc6`. After closing and reopening the work from Recent, v1 and export history were still present.

The exported file is six-second H.264/AAC, 640×360 at 30 fps, 657,113 bytes. The screen recording contains no audio capture; this Evidence does not claim human listening or aesthetic review. Responsive viewport, keyboard, focus, IME, reduced-motion, and demo-layout behavior were covered by the L6 current-source automated workbench checks recorded in DOC-007; the interaction record's WIN-09/WIN-10 scope is the package's declared current-build acceptance policy.

## Result

The L0–L7 implementation, required current-build interactions, integration and recovery behavior, and formal export chain passed their recorded checks. Product state and media evidence are Host-owned and hash-bound; no simulated demo data is used as product evidence. This completes P4's package-owned scope only. P5, Stage Exit, and Release remain separate.
