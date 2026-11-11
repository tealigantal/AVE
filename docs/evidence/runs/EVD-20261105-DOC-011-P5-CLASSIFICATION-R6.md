---
evidence_id: EVD-20261105-DOC-011-P5-CLASSIFICATION-R6
work_package_id: DOC-011
date: 2026-11-05
repository_commit: 293695defc884445630b7d83e77a58c8f2031186
code_fingerprint: a85cc2d90203bfc62ff775a282fcb16771ae19edf10a65731565948068987387
capability_ids: []
acceptance_ids: []
scope_classification: historical-revalidation-debt
result: blocked
---

# P5 browser download transport test scope classification

This blocked, index-free DOC-011 classification records source and scope changes only. It does not revalidate capabilities, promote product acceptance, complete P4/P5, or modify historical Evidence or the applicability index.

The added transport regression in tests/integration/web-host.test.ts changed the source fingerprint. The controlled web:host:test exited 0 in docs/evidence/assets/mixed-media-p5/current-build-20261105/browser-download-r6-preflight-r1/web-host-transfer-test.exit.txt, with log web-host-transfer-test.log; the initial compilation failure remains in web-host-transfer-test-initial-failure.log. The post-change typecheck receipt typecheck-after-download-test.exit.txt also records exit 0. These limited checks do not establish each capability's complete required tests or real user acceptance.

The 40-scope audit docs/evidence/assets/doc-011/p5-download-20261105/scope-audit.json has SHA-256 `771349e009d2ecb75a34b1dede6031e92200dc59775c2a1a8b4599857ae30f87`; it retains each owning package, changed governed paths and required tests. The following 20 historical scopes changed since R5 and remain active / UNVERIFIED:

- CAP-RENDER-001
- CAP-PRESET-001
- CAP-FND-001
- CAP-CA-CONTEXT-001
- CAP-CA-STORY-001
- CAP-CA-PIPELINE-001
- CAP-CA-FEEDBACK-001
- CAP-CA-PRODUCT-001
- CAP-CA-PRODUCT-002
- CAP-CA-UX-001
- CAP-CA-EXIT-001
- CAP-S3-WEB-001
- CAP-S3-MEDIA-001
- CAP-S3-ANIMATED-MEDIA-001
- CAP-S3-AUDIO-PACK-001
- CAP-S3-SOUNDTRACK-001
- CAP-S3-PRECISION-001
- CAP-S3-MEDIA-CLOSEOUT-001
- CAP-S3-RELIABLE-IMPORT-001
- CAP-S3-RELIABLE-PREVIEW-001

All other previously classified historical scopes remain UNVERIFIED; the two current P4 interaction scopes CAP-S3-P4-DEMO-INTEGRATION-001 and CAP-S3-RELIABLE-UX-001 remain independently blocked pending current-build WIN-09/WIN-10 evidence, and are not deferred as historical debt. Stage2 real-media and duration debts remain active.
