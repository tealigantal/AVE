---
evidence_id: EVD-20260909-WP-CA-REAL-001-HUMAN-REVIEW-READY
date: 2026-09-09
work_package_id: WP-CA-REAL-001
repository_commit: fab1856b14a8f7e995c510bbdabb47c9c70f96cb
code_fingerprint: fa7e8f9e98edb7b9c1a55ced7b532b62f79e01d78deaff0eba6b7a083471f121
capability_ids: [CAP-CA-PIPELINE-001, CAP-CA-FEEDBACK-001, CAP-CA-PRODUCT-001, CAP-CA-PRODUCT-002, CAP-CA-UX-001, CAP-CA-EXIT-001]
acceptance_ids: [ACC-CA-PIPE-001, ACC-CA-FEEDBACK-001, ACC-CA-PRODUCT-001, ACC-CA-PRODUCT-002, ACC-CA-UX-001]
commands: ["pnpm docs:start -- WP-CA-REAL-001", "pnpm run intelligence-pipeline:real", "pnpm run stage2-product-workspace:real"]
result: machine_passed_human_pending
environment: Windows, authorized external real media, current v5/r15
artifacts: ["fresh Pipeline r7", "fresh Product r18 feedback and reopen", "60-second Master opened for direct human viewing"]
remaining_risks: ["Human inspection has not been received; no Stage Exit or package completion.", "Product r17 Electron review failed with a non-diagnostic object error; unchanged-code fresh r18 passed. The failure remains preserved and its cause is unproven."]
---

# Current real-media review handoff

Immutable execution Evidence for REAL-001, owned by its existing programme
and ExecPlan. New attempts require a dated record instead of rewriting REAL-003.

Fresh Pipeline r7 passed (exit 0): QC passed, exact 60 seconds and 1800 frames,
current v5/r15, explicit rejected feedback. Preview/Master share semantic hash
25351114ef8e9120192b248c6f4ad28a10a2d5f39f4317c613e2c237c8d4d614
and actual output SHA-256
10b97d82fca2c5b3c5bf1ddbbce883c3f7afc705916ddf2e8fbedcbcff168c3d.
Independent read-only review verified those files and the current identities.

Fresh Product r17, copied from r7, encoded the complete outputs but failed in
Electron with AVE_ELECTRON_PRODUCT_REVIEW_FAILED [object Object]. No full
review or reopen pass is attributed to r17. Failed artifacts remain external.

Fresh Product r18, also copied from r7, passed (exit 0) without source changes:
current Preview playback, feedback creation, local effect preview, explicit
rejection, failure-closure assertions, recovery and reopen. Its execution is
product-execution-a9377ff752f9a17274560858, Timeline 5, current render binding.
Feedback intent product-feedback-intent-776e234b-3ce5-4cfb-9af6-1dede2a55f90
was rejected, with creation/rejection confirmation each exactly once.
Workspace digest: 0ffc6ec0fa8d0f36c1f23deb8f7f04066e37cc9eaec2bf0a3be844c4ac4a7049.

Both Product target files are 60 seconds and byte-identical with SHA-256
5c3c93bb7831abb5c5b69cda5f1c96a5827399f57db13daedd0bd17ab8da254a.
They also match previously verified r16 media bytes. Product uses the verified
2..62-second window, so Pipeline and Product outputs must not be conflated.
The recorded automated playback sample is 0.170567 seconds; it does not prove
a person watched all 60 seconds. The r18 Master was opened with the OS player
and offered in Codex for direct viewing. No human conclusion has been received.

The unchanged source fingerprint already passed complete repository and final
synthetic checks in REAL-003-COMPLETE. This new record supplements those checks;
no capability status is promoted. REAL-001 stays active for direct human review
and disposition of the observed intermittent Electron failure before Stage Exit.
Private paths and media remain external. No commit/push occurred in this run.
