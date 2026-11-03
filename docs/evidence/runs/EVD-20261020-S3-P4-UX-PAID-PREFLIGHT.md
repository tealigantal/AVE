---
evidence_id: EVD-20261020-S3-P4-UX-PAID-PREFLIGHT
work_package_id: WP-S3-RELIABLE-UX-001
date: 2026-10-20
recorded_at: 2026-10-20T09:28:54.448302+00:00
repository_commit: 99aeecee096a9424eb1df465f5546b297b90b0b9
code_fingerprint: bb2b62e940b3ab605181e0e7f601dacb250da49b7ce48520af54692137731f76
capability_ids: [CAP-S3-P4-DEMO-INTEGRATION-001, CAP-S3-RELIABLE-UX-001]
acceptance_ids: [ACC-S3-P4-DEMO-INTEGRATION-001, ACC-S3-RELIABLE-UX-001]
result: blocked
---

# Authorized paid-model preflight: stopped before dispatch

This new execution Evidence belongs to the Evidence layer. The prior immutable
records cannot hold the later 09:20 UTC authorization and measured preflight;
the existing P4 plan and Stage3 navigation link this record. It does not replace
programme status or claim Browser acceptance.

## Authorization and disposition

The user confirmed the named DashScope models, only the existing generated
synthetic media and synthetic project text, a strict whole-run CNY 5 ceiling,
existing authentication only, and no commit/push/P5. The authorization explicitly
requires no call if that ceiling cannot be guaranteed. That condition remains
unsatisfied. Therefore no model inference or credential-authentication attempt
was sent. This is a technical preflight block, not missing user confirmation,
an automatic approval denial, an uncertain send, or a failed provider response.
The already successful unrelated checks were not repeated.

## Actual non-secret configuration

A transient network-disabled container inspected whitelist fields from the
original and isolated configuration volumes, both mounted read-only. Credential
values were neither output nor copied, persisted elsewhere or used to authenticate.
Original vision: qwen / qwen3-vl-plus / DashScope compatible-mode/v1, validated_json.
Original planner: qwen / qwen3.7-max-2026-05-20 / the same endpoint, json_object,
enable_thinking true, max_tokens 8192, thinking_budget 4096. Models/provider/domain
match the user's confirmation. The isolated dummy loopback configuration remains
unchanged. Original services remain stopped. See paid-preflight/nonsecret-configuration.json.

## Current official prices

Retrieved 2026-10-20 from the [official model pricing page](https://help.aliyun.com/zh/model-studio/model-pricing), Beijing region, CNY per million tokens, with no free quota or discount assumed:

| Model | Input tier | Input | Output including reasoning |
| --- | --- | --- | --- |
| qwen3.7-max-2026-05-20 | up to 1M | 12 | 36 |
| qwen3-vl-plus | up to 32K | 1 | 10 |
| qwen3-vl-plus | above 32K, up to 128K | 1.5 | 15 |
| qwen3-vl-plus | above 128K, up to 256K | 3 | 30 |

These are prices, not a verified bill or a whole-run upper bound.

## Measured offline sample plan

The production Worker scene scanner and enriched media probe ran offline on the
two exact generated fixtures, with current threshold 12. The unchanged Host
creationTemporalFrameIndices function then computed the selection:

- blue.mp4: 120 decoded frames, one span, indices 0/59/119, three selected frames.
- corrected/recovery.mp4: 150 decoded frames, one span, indices 0/74/149, three selected frames.
- Total: six 640x360 frame samples per fresh observation pass. No images were sent.

Hashes, exact RationalTime intervals, actual scans and enriched probes are in
paid-preflight/actual-sample-count.json and offline-scans.json. The first offline
count harness incorrectly supplied a raw ffprobe result to creationMediaFacts;
it was refused as CREATION_PROBE_INVALID. The harness then used the actual Worker
enriched probe and passed. No product source was changed to obtain this result.
The old fixture provenance's authorization=false describes its earlier run;
it is preserved, and this record documents the later conditional authorization.

## Why the CNY 5 bound cannot currently be certified

The actual vision configuration supplies no explicit output limit. Planning has
per-call output/thinking settings and at most three physical sends per cycle,
but input token cost is not bounded before dispatch. Split transport uses one
attempt per physical call; a separate revision/retry creates further calls.
The six measured images bound one observation's image count, not future output
or cumulative spend. Host reservation provides call identity/accounting, while
settlement explicitly writes cost:null; it does not reserve money or refuse a
send that would exceed CNY 5. No account-level enforced quota was established.

Source anchors: apps/desktop/src/main/model-configuration.ts;
packages/platform/model-gateway/src/public.ts and split-provider.ts;
packages/platform/model-gateway/src/creation-planning.ts;
packages/platform/project-host/src/project-host.ts (runCreationModel dispatch
and settlement); stage3-request.ts (reserveCreationCall); current creation-session
authorization schema. No model maximum or likely short answer was treated as
a guaranteed test budget. No unverified price/token estimate was promoted to a cap.

## Outcome and next prerequisite

Actual external inference sends: **0**. Actual API cost incurred by this run:
**CNY 0**. Certified upper bound for executing the requested journey: **unavailable**.
Initial draft, annotation change, precision, reopen and export were not attempted
in this paid phase; prior partial local Browser results retain their original limits.
P4 remains blocked under DEBT-S3-P4-CURRENT-UI-REVALIDATION; P5 remains pending.

Before resuming paid execution, establish a verified enforcement path that reserves
worst-case input/output/reasoning cost before every physical send, covers retries
and revisions, and refuses sends above the shared CNY 5 allowance (or an equivalent
verified provider-side hard limit). This technical prerequisite does not require
repeating the existing model/data authorization and was not implemented as an
unrequested product feature in this preflight. No original service/data changes,
new persistent credentials, product code changes, commit, push, PR or merge.

## Final documentation and preservation check

docs:sync and docs:check both exited 0 after the blocked-state update; the existing 37 explicit UNVERIFIED historical-scope warnings remain, not acceptance passes. No unrelated engineering suite was repeated. Preservation check confirms all 1480 previously excluded files byte-identical, no missing original, only the already-dirty P4 plan changed among that initial inventory. HEAD remains 99aeecee096a9424eb1df465f5546b297b90b0b9 and staging is empty. The temporary offline scan/configuration containers exited and were automatically removed; no original service was started.
