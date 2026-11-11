---
evidence_id: EVD-20261111-S3-P4-UX-PLANNING-PROMPT-R1
work_package_id: WP-S3-RELIABLE-UX-001
date: 2026-11-11
repository_commit: 293695defc884445630b7d83e77a58c8f2031186
code_fingerprint: 5128515f4e0f872ff5405e5a1829f23a3f79c3c81f20e2b99cc2aa8401a60361
capability_ids: [CAP-S3-P4-DEMO-INTEGRATION-001, CAP-S3-RELIABLE-UX-001]
acceptance_ids: [ACC-S3-P4-DEMO-INTEGRATION-001, ACC-S3-RELIABLE-UX-001]
result: partial
---

# Planning prompt contract guidance

The user requested a review of other potential prompt/contract mismatches after
the 6085 planner returned `audio_intent.status=required` with an empty list.
The existing execution plan records the scope and observed failure. This is
partial engineering evidence, not complete package or video acceptance.

The existing schema describes the status and array independently; the Host
checks their relationship. The prior prompt did not explicitly prohibit a
required status with an empty list, and its audio instruction was missing in
the measure-or-final phase despite that phase allowing another measurement.
The revised phase-specific prompt explains status/list combinations, exact
revision text, real distinct evidence IDs and independent sound requests;
it retains the separate v1/v2 evidence rules and explicit ambiguous failure.
It also makes unique measurement selection IDs, authorized ranges and timing,
receipt identity, exact shot coverage and active required audio explicit.
Existing contracts, authorization, output validators and retries are unchanged.

`node --import tsx tests/property/stage3-planning.test.ts`,
`pnpm run stage3:creation:test`, `pnpm run typecheck`, and
`pnpm run architecture` passed. The property test covers both audio evidence
versions, both measurement-capable phases, and continued rejection of the
reported contradictory output. These are controlled fixtures. No real model
call or user media resend was performed; the source change was not deployed to
6084 or 6085. Full production-video acceptance remains unverified.
