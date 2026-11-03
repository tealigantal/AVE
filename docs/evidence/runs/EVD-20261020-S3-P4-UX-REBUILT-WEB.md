---
evidence_id: EVD-20261020-S3-P4-UX-REBUILT-WEB
work_package_id: WP-S3-RELIABLE-UX-001
date: 2026-10-20
recorded_at: 2026-10-20T10:43:39.430434+00:00
repository_commit: 99aeecee096a9424eb1df465f5546b297b90b0b9
code_fingerprint: ed3a884835cc52612483fe9406215eac2049e76cc60fb6e57424e1c3e332453c
capability_ids: [CAP-S3-P4-DEMO-INTEGRATION-001, CAP-S3-RELIABLE-UX-001]
acceptance_ids: [ACC-S3-P4-DEMO-INTEGRATION-001, ACC-S3-RELIABLE-UX-001]
result: blocked
---

# Rebuilt Browser source-evidence verification and paid feasibility

This immutable Evidence records the later authorized free rebuild/Web checks and
attachment delivery. The prior PAID-BROWSER Evidence cannot contain those later
outcomes and remains unchanged. This record belongs to the Evidence layer and
is linked from the existing P4 plan and Stage3 navigation. Overall P4 remains
blocked; the narrowly tested repair is not full OP/WIN acceptance.

## Actual current image and isolation

Built `docker/Dockerfile` with isolated tag `ave-p4-browser:provenance-20261020`.
Actual running image was
`sha256:e757ad48921a2b58cd702011ba2ca192c45b87e469ea44c0ffdd1b124b7522c9`.
All 910 recorded source inputs match current local bytes and all 747 compiled
outputs match the image provenance; zero mismatches. Source digest
`543d3407028e1399a8a220d603d3572a28250dfb7d7e4d096b489fa3e27b99ee`,
output digest `bd886a28aab13ff8e6719ffc709719d4e866d4d6daefb4419db80af30b0b277b`.
The compiled Browser creation handler includes the semantic-reference allowlist.
See `rebuild/image-verification.json` and `docker-build.log`.

Only the existing `ave-p4-20261020` synthetic test volumes/services were used;
original deployment services and volumes were not started or changed. The new
run has no original configuration/credential mount, uses dummy authentication
and a loopback-disabled planner endpoint, and a preloaded fetch guard rejects
all non-local model requests before dispatch. Its denial was actually tested.
An initial Docker internal-network attempt served inside the container but did
not publish a Windows host port; the final normal bridge publishes only
127.0.0.1:6080 and retains the application-level external-send guard. No claim
is made that the final network itself disables egress. Local Whisper/YAMNet
remain available. See `compose.offline.json`, `local-only.mjs`, and
`network-guard-check.log` (the filename denotes no paid dispatch, not Docker
network_mode=none).

## Actual Web repair verification

The real Playwright Browser opened http://127.0.0.1:6080 on that new image and
reopened the prior synthetic project. No API mutation was seeded and no model
response route was mocked. A read-only response listener captured actual
`/api/invoke` project.creation.timeline query results.

1. v4 still lacked provenance, confirming the fix did not silently migrate
   historical data. Normal UI Undo restored a source-bearing historical draft
   as v5. The restored blue shot still correctly failed FREEZE_FRAME QC.
2. On the real precision page, select shot_2 and Delete committed v6. The
   unchanged shot_1 retained semantic_id, labels and the exact original span
   reference. Arbitrary metadata was absent from the Browser projection.
3. The real `制作并观看当前版` action produced Preview and Master with separate
   execution plans and passed QC for both. v6 was one 3-second dynamic shot.
4. Actual page reload, project close and reopen preserved v6 and its source
   evidence. The real Browser query after reopen is saved in
   `web-reopen-verification.json`; screenshot `reopened-v6.png` and local trace
   `trace-1792492483791.trace` document the UI. These were not uploaded to Library.

v6 Timeline hash:
`dc5f63eca8cb7ccd7985a328745ec21ed973d7403ed87ea4eb0aaebf98c48642`.
Render receipt:
`f32171cc25ff1843e99d16e791c4c98b5f5140f3048196fe19e6af589455a21e`.
Both v6 outputs have the same MP4 hash as the previously decoded/downloaded v4:
`bf87aeb547b6ed163227e925c5b7c241339a7225f89eda60c39ef510a5adbdc6`.
The repair changes provenance, not the requested color image. No grayscale
annotation-derived final has been generated.

## Offline causal check and exact budget decision

`verify-offline.mjs` uses the unchanged previously returned model measurement,
the actual compiled validators, and the actual stored v6 Timeline. It reads
only project objects; it does not mutate the project or send model requests.
The old context reproduces CREATION_LAYOUT_REBOUND. Replacing only its Timeline
context through the actual creationTimelineContext function with v6 passes the
measurement/retained-layout check, preserving 90 ticks/3 seconds and exact
source identity. Final validation is still required. This is an offline causal
check, not a fresh model planning or annotation-completion claim.

A single physical planner response cannot complete the current product
semantics: full Skill rules require a measure-only first round, followed by a
final decision bound to the Host measurement receipt. An attempted final in
that first-round identity check actually rejects CREATIVE_SKILL_FAILURE.
`createCreationPlanningProvider` already sets transport max_attempts=1; these
two semantic rounds are not automatic retries. The failed run does not supply
a valid measurement receipt to resume, and the new v6 binding differs. Sending
one call would only consume budget without completing the requested validation.
Therefore **no additional paid request was sent**.

The original ledger is byte-identical (SHA-256
`9d86037b46249e43a36ce2abdfe38b112226e2b8da9e828aec281ce1b0890f04`):
9 calls, CNY 3.740346 conservatively reserved, CNY 1.259654 remaining. No reset,
refund or token-estimate release occurred. For the existing fixed guard caps:

- Maximum input per planner call: 100000 UTF-8 bytes + 8192 framing = 108192.
- Maximum output reserve: 8192 + 4096 reasoning + 256 margin = 12544.
- At CNY 12/36 per million input/output: 1749888 micro-CNY per call.
- Two no-retry rounds: 3499776 micro-CNY = CNY 3.499776.
- Minimum additional ceiling covering both full allowed bounds:
  **CNY 2.240122**, giving total run ceiling **CNY 7.240122**.

This is the exact additional worst-case allowance under the unchanged caps,
not the expected bill or an absolute lowest possible cost under hypothetical
smaller inputs/outputs. Smaller caps could refuse a legitimate response and
were not used to weaken this test. The limit remains CNY 5 and was not modified.
The estimate of about CNY 0.872 already consumed is not used to free reservations.
See `offline-verification.json`, including the actual v6 render receipt.

## Attachment and remaining work

The already-verified 337085-byte `AVE-v4.mp4` was successfully saved to the
user's ChatGPT Library, not shared with a third party:
`library_file_id=libfile_b858b65895448191a6cce327c8fb54e3`,
`file_id=file_00000000a8c881f5a5da18a320cdea44`.
The Library helper could not write local xattrs because Windows Python lacks
os.setxattr; the upload itself succeeded and exact identity is preserved in
`library-attachment.json`. No duplicate upload or public link was created.

Rebuild/Web source-evidence verification is now passed. Remaining block is a
fresh fully bounded two-round annotation/final/render journey and the other
unverified P4 OP/WIN requirements; not an external wait, denied approval,
uncertain provider response, missing repeated model authorization, or human
review prerequisite. The old duplicate-import originals ambiguity also remains.
No P5, commit, push, PR or merge. Test browser/services are stopped after capture;
all test volumes, historical drafts and the original ledger are retained.
Stage2 duration/real-media and editing-execution-v1 backlog remain independent.

No product source changed in this continuation. The previously passed manual
Host regression, typecheck, architecture and Web Host engineering tests retain
their same source fingerprint; they were not pointlessly repeated. Current
source/compiled-image/Web verification is the new evidence. Documentation sync
and check results are recorded separately in `rebuild/final-checks.json`.
