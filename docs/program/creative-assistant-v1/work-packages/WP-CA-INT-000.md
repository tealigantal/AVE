# WP-CA-INT-000 Creative Contract and Material Evidence Pack

This is the governed promotion of candidate `WO-INT-000`. Current source,
contracts, tests and Evidence outrank the candidate document if they conflict.

## Goal

Implement one approved rich Creative Contract and one reproducible reviewed
Material Evidence Pack as the immutable context for every later Stage 2 run.

## Compatibility and authority

Existing v1 Contract and Evidence records remain readable and unchanged.
Schemas are additive; Project Host is the approval/orchestration authority and
sole SQLite writer; exact RationalTime, asset identity, object digest and
version refs are mandatory. Failed approval/assembly never mutates Timeline.
The additive schema migration also owns the exact Dev CLI migration-version
assertion and Foundation's latest-migration backup/rollback assertion; it does
not otherwise change either product surface.

## Acceptance

`ACC-CA-INT-000-CONTRACT` and `ACC-CA-INT-000-EVIDENCE` cover exact lifecycle,
approval, sufficiency, staleness, idempotency, persistence/reopen and failure
closure. Analysis-model accuracy, Story generation, Skills, Edit Intent and UI
are explicit non-goals.

Coverage marked `covered` must bind approved Evidence. Contract successors and
rejections bind the exact current head. Pack reuse follows current
Contract/Timeline/expiry/Evidence/verified-Original checks, and reads expose a
derived stale view without rewriting the immutable stored payload.
Media import and usage permission remain separate: an explicit Host permission
decision binds asset/location/actor/time/policy, and authorization verifies the
current Original through asynchronous exact Worker SHA-256 instead of trusting
size and mtime. Project Host bounds this work to two concurrent jobs and reuses
one verification Promise per location within a Pack list.
