---
evidence_id: EVD-20261105-DOC-011-P5-CLASSIFICATION-R5
work_package_id: DOC-011
date: 2026-11-05
repository_commit: 293695defc884445630b7d83e77a58c8f2031186
code_fingerprint: ad63e8f8f0cb16b96b979da9f01b0ff3ce14f662f64aa1936b2121df15c343df
capability_ids: []
acceptance_ids: []
scope_classification: historical-revalidation-debt
result: blocked
---

# P5 bilingual user-guide scope classification

This is a blocked, index-free DOC-011 classification, not capability revalidation, product acceptance, P4/P5 completion, Stage Exit or Release. Historical Evidence and the applicability index remain unchanged.

The user guides now explain historical P4 completion and current interaction revalidation, exact Original selection, download initiation, QC limits and Profile controls. `README.md` SHA-256 `deb7529c71ea324740f3ad229986bd717923bfe02816bb0e65df6de7464ab7d8`; `README.zh-CN.md` SHA-256 `776cf10ab80f62bbac93c99f68ec9b5d111e088900aa360ca28becb4cc290ea4`. They do not alter the code fingerprint, but the README files are explicitly included by capability scopes.

The 40-scope audit `docs/evidence/assets/doc-011/p5-readme-20261105/scope-audit.json` has SHA-256 `deecf8fe5e0841e2682823c8cc3e64a3d58a13adeb6156ddf3c7cff6870cac01`; it records prior/current identities, owning packages' required tests and changed paths. Relative to R4, 12 scopes changed: these 10 existing debt scopes remain active / UNVERIFIED:

- CAP-CA-EXIT-001
- CAP-CA-GOV-002
- CAP-S3-DOCKER-001
- CAP-S3-WEB-001
- CAP-S3-DOCKER-CLEAN-001
- CAP-S3-MEDIA-001
- CAP-S3-AUDIO-PACK-001
- CAP-S3-SOUNDTRACK-001
- CAP-S3-PRECISION-001
- CAP-S3-MEDIA-CLOSEOUT-001

The two current P4 interaction scopes, CAP-S3-P4-DEMO-INTEGRATION-001 and CAP-S3-RELIABLE-UX-001, are not deferred as historical debt. Their current-build WIN-09/WIN-10 records and receipts remain required. README classification does not prove the required product or engineering checks; other already classified historical scopes remain UNVERIFIED under their existing debts.

Applicable active debts: DEBT-20261020-HISTORICAL-APPLICABILITY-CREATIVE and DEBT-20261020-HISTORICAL-APPLICABILITY-STAGE3. Strict global evidence and Stage2 real-media/duration debts remain unresolved.
