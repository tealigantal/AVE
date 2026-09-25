---
evidence_id: EVD-20260924-S3-SAMPLING-GATES
date: 2026-09-24
code_fingerprint: 8217d6d39b53ed239c6e2af2865656bbe42f516d60004ec295c394efbcdea169
repository_commit: 3521aa8a5d019fb49dd486a11a424bc937857db1
result: engineering_pass_real_observation_checkpoint_unfinished
---
# Media sampling and model transport regression gates

Follow-up to [sampling precheck](EVD-20260924-S3-SAMPLING-PRECHECK.md).
Its original failures and review fixes remain recorded separately. Root froze
source during the gates and independently recomputed the same fingerprint after
both completed. On Windows/PowerShell with Node 22.16.0, both commands exited 0.

| Command | Result | Local log basename | SHA-256 |
| --- | --- | --- | --- |
| pnpm run check | exit 0 | ave-stage3-sampling-check-20260924.log | c9d013ae281f953e433646bd9813a17f99be4b4ab641ab3b894d1aa94338e35b |
| pnpm run acceptance:final:synthetic | exit 0 | ave-stage3-sampling-synthetic-20260924.log | 808ee2be19b86adf6d26d7db235b2963715d55f148e292583e025e6bcde27184 |

Logs remain in the local OS temporary directory outside Git. Full check includes
the new actual frame/audio sampling test, permission and transport negatives,
current Stage2/Stage3 regressions, contract and type checks, architecture,
Worker lint/typechecking, real encoded synthetic rendering/QC, persistence and
recovery. No private material or real model response was used. No Linux full-gate
result is claimed. The allowed-path audit found 102 changed governed files and
no outside change before this final evidence publication. git diff --check passed.

The input interface is consistently context/media across current callers;
unsupported formats/models and unauthorized attachment categories fail before
sending. Decoded timestamps, original audio sample alignment, output identity,
cancellation and combined processing/cleanup faults have direct regression
coverage. Both read-only reviewers found their reported defects fixed, with no
remaining blocker for this batch. Provider fees and semantic quality remain
unverified; local counting policies and HTTP fixtures are not live-model proof.

WP-S3-INTEGRATION-001 stays active and CAP-S3-FIRST-LOOP-001 stays specified.
Host observation/receipt/Evidence publication and source-span versus observation
coverage integration are next; authorized historical learning/correction,
approved workbench, held-out project/exception/forgetting outcomes, real model
artifacts and review recordings remain unfinished. Missing material, learning,
design-original, provider/data and fee inputs still block dependent real runs.
No source commit, push, PR, merge, release or completed real checkpoint is claimed.
