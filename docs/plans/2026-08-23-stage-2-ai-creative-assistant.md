# Stage 2 AI Creative Assistant ExecPlan

This living plan covers the full user objective: complete Stage 2 as defined by
`docs/product-intelligence/FUTURE_PRODUCT_EVOLUTION.md`. Completion is the
real user journey and cannot be redefined as schemas, synthetic tests or the
first convenient package.

## Purpose / Big Picture

A creator can approve intent, inspect reviewed material understanding, compare
at least two evidence-bound creative directions and stories, approve one exact
plan and semantic edit, receive an explainable real encoded first cut, reject
without mutation, make a scoped natural-language revision, reopen/recover and
accept the exact result through a conversation-led workspace.

## Progress

- 2026-08-23: Multi-programme runtime implemented; structure, governance and fingerprint PRECHECK passed at `be688b2892610d18af5127144a6780ff740e9e6e1c099352d8cca855dde9ba41`. Current-fingerprint `docs:check` and COMPLETE closure are next; no Stage 2 application capability is claimed yet.
- 2026-08-23: `WP-CA-GOV-001` current-fingerprint sync, check, structure/governance, fingerprint and whitespace gates passed. COMPLETE Evidence created; mechanical package completion and explicit activation of `WP-CA-INT-000` follow.
- 2026-08-23: Independent read-only review found fail-before-write coverage gaps in invalid multi-programme snapshots. `WP-CA-GOV-001` was reopened before any Stage 2 source package started; shared topology validation and executable zero-write negative fixtures are the R2 closure gate.
- 2026-08-23: R2 fail-before-write validator, staged writes, executable zero-write fixtures, two-ready/no-auto-activation coverage and registered-programme index passed at `c10beca143e28d8729ac346b8cf21b3e8da4aa7b5d55409ab6ca75bedeb0e34e`; current-fingerprint docs recheck is next.
- 2026-08-23: R3 closes the empty-ownership/nonexistent-Evidence completion bypass and adds real Evidence identity/fingerprint/binding plus programme/directory/registry zero-write fixtures at `e09d2ce7e5bfcec7507d49382e5db584be100a4da9fab0750d48628bae6872e7`.
- 2026-08-23: Independent R3 review found no remaining P1/P2 blocker. R4 adds successful start/complete registry and generated-view assertions at `f2b781ed088ce436540a994a2c04ab5c94c2a704ba4ac1155da2ff29f31d79b0` before final closure.
- 2026-08-23: `WP-CA-GOV-001` completed and `WP-CA-INT-000` was explicitly activated. Additive v2 Creative Contract and v1 Material Evidence Pack schemas, generated standalone validators, v1 adapter, immutable content-addressed persistence, exact approve/reject/supersede lifecycle and Host-owned reviewed-Evidence assembly now pass the focused property/Host/storage suite. Identical draft, approval and pack retries are idempotent; stale contract/media and unreviewed Evidence fail with zero Timeline mutation. Full gates and independent review remain before completion.

- 2026-08-24: Full regression exposed two package-boundary facts: editorial-core's public surface is DTO-only, so pure context adaptation/validation moved to the Project Host application layer; additive migration 0021 requires the exact Dev CLI schema-version assertion to advance from 20 to 21. The package allowlist now owns that single regression file without changing CLI behavior.
- 2026-08-24: The Foundation recovery gate also assumed migration 20 was latest. Its exact fixture now removes/fault-injects migration 21 and verifies a pre-v20 backup, directly exercising rollback of this package's additive migration.
- 2026-08-24: Independent review rejected the first context PRECHECK on five P1 and three P2 gaps. R2 now requires Evidence-bearing coverage, Timeline/expiry checks before idempotency reuse, exact successor and current-head rejection semantics, coherent approval policy, current Original verification plus derived stale views, self-canonical contract content digests, generic v2 envelope support and v20-to-v21 preservation/recovery. Focused tests cover every reported path; R2 independent re-review is pending.
- 2026-08-24: R2 re-review found size/mtime could impersonate current media and normal import had no explicit permission path. R3 re-hashes Original bytes, proves same-size/restored-mtime tampering is stale, adds an actor/time/policy-bound Host permission decision separate from import, and expands migration/reopen/list tests to preserve Timeline, Evidence, object refs and derived stale reasons. Focused, type, architecture and Foundation gates pass; final re-review and full check remain.
- 2026-08-24: R3 re-review found multi-location relink ambiguity. R4 selects across all Originals by exact verified time, authorization and current SHA-256, requires one unambiguous match and proves an older lexically-first location cannot shadow the valid location. Focused/type/architecture/feature-boundary gates pass; current-fingerprint governance and final review remain.
- 2026-08-24: R4 re-review found an authorized location could cite an unrelated policy. R5 validates permission decisions at runtime, requires their exact policy ref to equal the Contract rights-policy snapshot during assembly/read, and proves wrong-policy authorization blocks while later policy rebinding stales an existing Pack. Focused/type/architecture gates pass; final governance/review remain.
- 2026-08-24: R5 re-review found current-identity SHA-256 work synchronously read entire Originals on the Project Host main thread and repeated it for each Pack. R6 delegates exact content verification to the asynchronous Worker boundary, retains fail-closed before/after stat checks, and deduplicates each list call by asset location. Same-size/restored-mtime tampering remains covered; focused/type/architecture/contract gates pass and final full/review gates remain.
- 2026-08-24: R6 re-review found different locations could still create unbounded Worker hash fan-out. R7 adds a Host-owned two-job concurrency permit shared by record/assemble/read/list, preserves per-location Promise deduplication, and proves eight distinct location checks never exceed two in flight. Focused gates pass; current-fingerprint governance, full check and final re-review remain.
- 2026-08-24: R7 full repository check passed and independent review found no remaining P1/P2. `WP-CA-INT-000` completed with current-fingerprint Evidence. Candidate `WO-INT-001` is promoted as ready `WP-CA-INT-001` with a non-executable Definition/Evaluation boundary, exact context dependencies and narrow source/test ownership.
- 2026-08-24: `WP-CA-INT-001` activated. Additive Definition/Evaluation Contracts, generated standalone validators, one immutable built-in definition, pure deterministic evaluation, migration 0022, Host pin/evaluate/read/list and focused property/Host/storage regressions pass. Evaluation is exact Contract/Pack/Definition bound and produces zero Timeline/Preset writes; independent adversarial review and full gates remain.
- 2026-08-24: `WP-CA-INT-001` adversarial R1 found incomplete Pack→Contract edges, caller-controlled provenance/version, command-fragment bypasses, missing post-pin withdrawal authority, permissive calendar validation and weak v21 preservation fixtures. The implementation now recomputes canonical Contract/Pack digests, fixes evaluator/policy/object version at the Host boundary, adds exact project/Contract/policy edges, project retirement/revocation controls, strict calendar validation, malicious payload fixtures and Creative Contract/Pack/Evidence/media/object-ref migration recovery checks. Focused and Foundation gates pass; R2 independent review and current-fingerprint full check remain.
- 2026-08-24: R2 rejected keyword blacklisting as an unprovable classifier for arbitrary prose. The safety boundary now rejects executable-shaped fields, treats every prose value as opaque inert data, never forwards it to an executor, and requires an exact reviewed repository-catalog match at Host use time. R2 also added project-cascade coverage for availability controls and aligned standalone/core date-time validation with RFC3339 leap seconds. R3 review and current-fingerprint gates remain.
- 2026-08-24: R3 found that accepting RFC3339 leap seconds was incompatible with Host `Date.parse` expiry comparisons and could keep a legacy expired Pack current. Creative Context timestamp schemas now declare a JS-comparable seconds-00-through-59 subset; Host rejects non-finite assembly times and dynamically stales legacy malformed expiries. Focused gates pass; R4 review and post-fix full check remain.
- 2026-08-24: `WP-CA-INT-001` completed after R4 found no P1/P2, and `WP-CA-INT-002` activated. Duration Blueprint v1 and Feasibility v1 Contracts now cover six independent 30-second-through-30-minute profiles. Project Host pins exact trusted profiles to the current approved Contract and sufficient Pack; integer-fraction RationalTime validation/allocation, immutable content-addressed persistence, exact retry, migration 0023, reopen, derived staleness and zero Story/Timeline mutation pass focused, Dev CLI and Foundation gates. Independent review and current-fingerprint closure remain.
- 2026-08-24: Duration R1 review exposed acceptable-variance, floating-ratio, negative-time, ending-evidence, policy/date and shared-template authority gaps. R2 replaces the scaled template with six explicit role/curve/ending policies, persists the selected beat/density/redundancy/curve constraints, closes exact Pack policy edges and migration conflict/stale coverage, and passes the final full repository check. Independent final review reports no remaining P1/P2; mechanical package completion and `WP-CA-INT-003` promotion follow.
- 2026-08-24: `WP-CA-INT-003` now has additive strict Direction Card, Story Proposal v2, Approved Story Plan v2, Decision Record and command-free Editorial Edit Intent Contracts. Pure reasoning deterministically scores comparable exact-context candidates, records top-selection or explicit override, freezes one approved Story, and derives registered semantic operations only. Project Host migration 0024 persists immutable payloads and exact edges, owns Timeline/capability snapshots, derives stale views after reopen, and proves conflicts/protected/unsupported/forged paths fail without Timeline, legacy Story, Preset, Worker, RenderGraph or model mutation. Focused, Contract, migration, Foundation, Dev CLI, architecture and type gates pass; final independent review and full repository check remain.
- 2026-08-24: `WP-CA-INT-003` R4 closes exact Coverage Matrix Evidence-to-Requirement binding, per-kind capability/parameter authority, recursive Decision/Plan/Intent staleness, exact target type/version/digest validation, composite atomic zero-write and migration/reopen proof. The full current-fingerprint repository check passes and independent R5 review reports no remaining P1/P2. Semantic execution and product-facing capability remain outside this completed package.
- 2026-08-24: `WP-CA-INT-003` completed with R4 Evidence. The next documented dependency is promoted as ready `WP-CA-INT-004`: a non-executable permission matrix covering actor/action authority, exact approval, staleness, data minimization and malicious-input zero-mutation denial. The older editing-execution backlog remains ready but is not selected while the Stage 2 programme continues.
- 2026-08-24: `WP-CA-INT-004` R1 implementation adds closed request/policy/decision Contracts, a 21-action by six-actor deterministic matrix, Host-owned trusted-principal resolution, exact human approval fingerprinting, protected/data-scope denial, migration 0025 and content-addressed policy/decision persistence. Focused property/Host/storage, Contract, type, architecture, feature-boundary, Story regression, Dev CLI and Foundation gates pass; independent adversarial review and current-fingerprint full closure remain.
- 2026-08-24: R1 adversarial review found that authorization was still a side-channel ledger and that caller-selected principal handles/approval payloads were forgeable. The repair expands the package regression surface to Creative Context, Skill, Duration and Story Host tests, moves the gate inside the affected Host use cases, and replaces caller identity fields with Host-owned object-capability human-review channels whose records bind policy, full effect digest, exact refs/scope and Host time.
- 2026-08-24: R2 adversarial review found direct approved-Evidence registration, over-broad query payloads, split permission/business writes, non-renewable expired approvals, and pre-denial Worker work. R3 makes Evidence approval two-step, projects every public Stage 2 query through Host-only data gates, wraps the business object and Permission Decision in one rollback boundary including staged files, assigns renewal-specific authorization identity, and gates human actions before dynamic Worker-backed validation. Focused and cross-module regressions pass; independent R3 review and the current-fingerprint full check remain.
- 2026-08-24: R3 found the storage authorization boundary still accepted a self-consistent embedded approval that had never been registered by the Host human channel, plus incomplete v25-renewal and exact-target fixtures. R4 binds every exact-human Decision to the complete trusted approval row, proves the missing-record bypass and rebinding are zero-write, migrates a populated legacy v25 UNIQUE fixture into renewable v26 records, and exercises every Stage 2 target type with full database/object-file snapshots. Independent R4 review and the focused suite report no P1/P2; the current-fingerprint full check remains.
- 2026-08-24: `WP-CA-INT-004` R4 passed the full current-fingerprint repository check after independent review reported no P1/P2. Permission enforcement is tested without granting execution authority; mechanical completion and governed promotion of `WO-PIPE-001` follow.
- 2026-08-24: `WP-CA-INT-004` completed. `WO-PIPE-001` is promoted as dependency-ready `WP-CA-PIPE-001`, with a narrow Host/EditIR/storage/test allowlist, explicit second execution approval, authorized real-media human acceptance and frozen Timeline/RenderGraph/Worker implementation boundaries.
- 2026-08-24: PIPE discovery confirmed the retained `editorial_edit_intent.approve` Decision authorizes the semantic proposal only; treating it as Timeline authority would collapse the planning/execution boundary. The active package now explicitly owns one additive `editorial_edit_intent.execute` permission action and its generated Contract/property surface before the Host adapter may commit.
- 2026-08-24: `WP-CA-PIPE-001` v8 passed user human acceptance after the exact execution-bound real-media Master, QC, ordered-frame review, full current-fingerprint gates and independent review passed. COMPLETE Evidence closes the bounded `select_evidence` first-cut path. `WO-FEEDBACK-001` is promoted next as `WP-CA-FEEDBACK-001`; it owns exact persisted diagnosis, one local semantic revision, non-mutating preview, rejection, exact approval, commit, render and recovery. Style/Trend remain optional and do not block this Stage 2 chain.
- 2026-08-24: `WP-CA-PRODUCT-001` R4 passes the current-fingerprint focused suite, authorized-real-media Electron v17 journey, root visual inspection, final independent review with no P0/P1/P2 and the complete repository gate. Product remains open only for direct user review of the exact workspace and native main-process confirmation; no automated result promotes that human gate.
- 2026-08-24: The user explicitly accepted the exact Product workspace. R5 COMPLETE Evidence promotes `CAP-CA-PRODUCT-001` and `ACC-CA-PRODUCT-001`; `WO-UX-001` is now governed as the next docs-only representative-journey evaluation package, followed by a separate final Stage 2 programme audit. Neither package may silently modify Product runtime code.
- 2026-08-24: `WP-CA-UX-001` consumes the user's exact v17 Product acceptance as the representative creator outcome, independently reproduces the journey as v18, passes the five-part clarity/control/visible-result/failure-closure/recovery rubric and the complete repository gate, and changes no runtime code. Only the governed final Stage 2 audit remains.
- 2026-08-24: Final R1 audit maps all 10 Stage 2 requirements to completed governed packages, binds all 11 capabilities and 13 acceptances to current-fingerprint Evidence, resolves `DEBT-CA-STAGE2-001`, passes docs/full-repository/independent-review gates and preserves explicit excluded scope. The bounded Stage 2 first vertical slice is complete.
- 2026-08-24: The final independent audit retracts UX R1 and EXIT R1: v18 created and previewed a scoped revision but did not explicitly reject it or approve and execute it before recovery. `WP-CA-PRODUCT-002` is activated as a narrow same-Electron-journey rejection repair; UX and EXIT return to pending and Stage 2 remains incomplete.
- 2026-08-25: `WP-CA-PRODUCT-002` v20 now creates, previews and visibly rejects the new scoped revision inside one real Electron journey, retains the exact rejection Permission Decision, proves Timeline v6 unchanged, then passes undo v7, redo v8, stale cleanup and exact reopen. Focused gates and root visual inspection pass; full current-fingerprint gate and independent review remain.

- [x] 2026-08-23 Audit Stage 2 authorities, current source/Evidence and Stage 1
  readiness without treating future docs as implementation.
- [x] 2026-08-23 Freeze the complete Stage 2 exit boundary, dependency chain,
  non-goals and missing Work Orders.
- [x] 2026-08-23 Complete `WP-CA-GOV-001` multi-programme governance bootstrap.
- [x] 2026-08-24 Complete `WP-CA-INT-000` rich Contract and Material Evidence Pack.
- [x] 2026-08-24 Promote and complete immutable Creative Skill Definition/Evaluation.
- [x] 2026-08-24 Promote and complete Duration Blueprint feasibility.
- [x] 2026-08-24 Promote and complete Direction Cards, two Story candidates, Decision
  Records and command-free semantic Edit Intent.
- [x] Complete permission-matrix enforcement and malicious-payload denial.
- [x] Freeze the first-cut operation/capability/Evidence map and complete the
  Host-owned semantic-intent adapter through real render/QC.
- [x] Complete persisted feedback diagnosis to scoped semantic patch, preview,
  approval, commit, undo/reopen and zero-mutation rejection.
- [x] Complete conversation-led Contract/Evidence/Story/Edit/Review workspace.
- [ ] Complete authorized real-media benchmark and representative-user journey
  including reject, approve, encoded first cut, scoped revision and recovery.
- [ ] Audit every Stage 2 requirement and reconcile final programme Evidence.

## Stage Requirements and Package Order

1. Governance: independent `creative-assistant-v1` programme with one global
   active Work Package.
2. Context: `WO-INT-000` rich Contract plus reviewed Evidence Pack.
3. Knowledge: `WO-INT-001` Creative Skill definitions/evaluations.
4. Feasibility: `WO-INT-002` Duration Blueprint.
5. Reasoning: `WO-INT-003` Direction, Story, Decision and semantic Intent.
6. Permission: exact approval/staleness/data minimization/zero-mutation matrix.
7. Execution: `WO-PIPE-001` Host adapter limited to editing primitives with
   executed Stage 1 real Evidence.
8. Feedback: persisted diagnosis and local patch through the same adapter.
9. Product: conversation-led workspace with no client-side project authority.
10. Evaluation: two-candidate benchmark and complete real user journey.

Style/Trend retrieval is optional for the first Stage 2 slice. Event-relation
model accuracy is not claimed when the slice consumes already reviewed
Evidence. Stage 3 cross-project memory/profile, Marketplace, network catalog,
autonomous agents and automatic publication remain out of scope.

## Surprises & Discoveries

- Existing Evidence/Story/Assembly/Review code is executable Foundation
  scaffolding, but flat v1 records and synthetic tests do not form Stage 2.
- Existing docs tooling is hard-coded to one programme and silently activates
  the first ready package when the active pointer is missing.
- Additive migration 0025 made older migration-24 recovery fixtures expose an
  implicit latest-version assumption; the active package now owns their
  version-25-safe preservation update without changing Story behavior.
- Product/UX candidate Work Orders are drafts, and no ready Work Order yet owns
  the natural-language local-feedback loop or permission matrix.
- Stage 1 is not globally complete, but the Stage 2 first cut may depend only
  on explicitly mapped editing primitives with current real Evidence.

## Decision Log

- 2026-08-23: Use a separate `creative-assistant-v1` programme and preserve
  editing-execution-v1 history rather than hiding Stage 2 in a transform package.
- 2026-08-23: Defer `WP-XFORM-002` to ready before implementation; do not mark
  it complete or blocked merely because priority changed.
- 2026-08-23: Implement Stage 2 as sequential vertical packages and retain the
  full exit audit in this plan.
- 2026-08-23: Keep Style/Trend optional and Stage 3 memory excluded from the
  first complete Stage 2 journey.
- 2026-08-24: Treat caller actor/role/capability/provenance as untrusted data.
  Project Host resolves a separately configured principal handle, evaluates a
  fixed content-addressed policy snapshot, and persists only successful exact
  permission decisions; denials intentionally create no audit write.
- 2026-08-24: Execute semantic Intent only through the Host-owned
  `select_evidence` adapter and a second exact human approval over the compiled
  effect. Proposal approval remains non-executable; all other semantic
  operations block rather than partially apply.
- 2026-08-24: Promote scoped feedback immediately after the accepted first cut.
  Reuse the same Editorial Edit Intent and Host execution path; add only an inert
  exact diagnosis plus a bounded currently evidenced local operation. Style and
  Trend knowledge are optional for this slice and are not Product/Feedback
  prerequisites.
- 2026-08-24: Treat explicit feedback rejection as an auditable non-editing
  action: retain exactly one Permission Decision and one project event, while
  Timeline, commands and authoritative render artifacts remain unchanged.

## WP-CA-FEEDBACK-001 checkpoint

The bounded feedback contract, persistence, Host preview/reject/execute path,
real-media render and root visual precheck are implemented. Independent review
identified two P2 proof gaps, now covered by exact rejection-audit assertions
and feedback-specific stale execution/Timeline, unknown/protected target,
unsupported patch, approval rebound and atomic fault zero-write tests. The
follow-up review found no remaining P1/P2 and the complete repository gate
passes. The package remains open at the exact retained Master human-review
gate.

The first retained feedback Master removed only seven frames. User review
correctly found that difference too small to judge with the naked eye, so it is
not accepted as meaningful human Evidence. R4 keeps the same bounded compiler
and authority path but enlarges only the real acceptance fixture to an exact
one-second inward trim: the three-second/90-frame base becomes a
two-second/60-frame revision. The v2 output passes QC, frame timing, black/freeze,
prefix-similarity and root visual checks; full current-fingerprint gates and
user review remain.

The final byte-identical v3 fixture adds exact wrapper assertions for the
one-second trim and 3-to-2-second/90-to-60-frame result. Full gates and
independent review passed, and the user explicitly accepted that exact Master
on 2026-08-24. `WP-CA-FEEDBACK-001` is complete.

## Stage 2 completion audit after feedback precheck

The programme now promotes `WO-PRODUCT-001` as `WP-CA-PRODUCT-001` after the
feedback human gate closes. `WO-UX-001` remains a later draft evaluation
package, and the final exit audit still requires governed registration.

Read-only inspection of the actual desktop runtime confirms that the current
Electron renderer is a Project/Media/Timeline/Jobs/Player/Diff/Editorial panel
workbench using JSON prompts and legacy Story/Review commands. Stage 2
Contract, Evidence Pack, Direction/Story candidates, semantic Intent, exact
approval/execution and Feedback v2 are not exposed through the IPC boundary.
The current Preview control also uses the legacy render entry rather than an
execution-bound Preview/Master review. Renderer state is a query cache only;
Project Host remains the single authority, which the Product package must
preserve.

The next governed Product package must therefore deliver one complete desktop
journey over existing Stage 2 authority: four same-version Goal/Contract,
Material/Evidence, Story/Direction and Review/Timeline views; comparable cards;
main-process-owned exact human approval; an atomic Host-owned workspace
snapshot; execution-bound Preview/Master/QC; one local feedback preview with
reject or approve; undo/redo and reopen recovery. Renderer payloads require
closed runtime validation, stable retry identity and text-safe DOM rendering.
Host query projections may be expanded only through a bounded workspace view;
the renderer may not read storage or hold approval credentials.

Style and Trend remain optional advisory inputs under the active plan and have
no current desktop/Host runtime dependency. Their former hard dependency has
been removed during Product promotion. Product acceptance requires actual
Electron/Chromium interaction and visual Evidence on authorized real media;
the existing shallow Electron smoke and Host-only workbench test are
insufficient. `WO-UX-001` follows Product and must retain the two-candidate
benchmark, rejection, accepted first cut, scoped revision, recovery and final
human-review evidence as a separate evaluation package.

## WP-CA-PRODUCT-001 checkpoint

The Product workspace now exposes one Host-owned atomic projection through four
same-version Goal/Contract, Material/Evidence, Story/Direction and
Review/Timeline views. Main/preload IPC payloads are closed, renderer content is
text-safe and path-free, and a native main-process modal is the only route from
a visible consequential action to the existing exact-human approval channel.
The renderer receives neither approval identity nor credential.

The isolated authorized-real-media Electron v16 journey opens the retained
Stage 2 project, captures all four views, plays the exact current Preview,
creates and previews one local feedback Intent, rejects an invalid IPC payload,
performs undo/redo, closes the old render/feedback/local-effect/media Preview,
and reopens the exact Timeline v8/workspace digest. Direction versions are
deduplicated to one selected and one alternative card. A stale workspace digest
cannot reload Preview, and the legacy player is disabled while the Stage 2
render is stale.

Independent review originally found renderer-forgeable approval composition,
stale actionable cards, path projection, weak real interaction, duplicated
Direction versions and retained stale media Preview. The implementation now
uses native main confirmation, exact workspace binding, whitelist projections,
visible fail-closed states, actual playback/recovery/reopen checks and Blob URL
revocation. Automated behavior also proves that cancellation stops before Host
mutation and confirmation invokes the Host action once. The current-fingerprint
complete repository gate passes, and the final independent follow-up reports no
remaining P0/P1/P2. Product still requires the user's direct review of the exact
workspace and native confirmation before `ACC-CA-PRODUCT-001` can pass.

The user explicitly accepted that exact workspace on 2026-08-24. Product is
therefore complete at R5. The next dependency-ready task is the independent
docs-only representative journey evaluation, not a return to an older editing
capability family.

## WP-CA-PRODUCT-002 and WP-CA-UX-001 closure

Final audit of the representative Product proof found that v18 previewed but
did not decide the new scoped revision, so the original UX and exit completion
records were retracted without deleting audit history. `WP-CA-PRODUCT-002`
added a same-journey visible rejection and then closed an independently found
P1 target-binding flaw: Product actions now have exact action-specific payload
keys, and native confirmation and Host authority share one parser and target
resolver. Dual-ID input fails before approvals, Permission Decisions,
artifacts, events or Timeline writes.

The fresh v21 Electron journey plays the current Preview, creates and previews
one exact scoped revision, rejects a malicious dual-ID action, visibly rejects
the correct revision with its Permission Decision and unchanged Timeline v6,
then reaches undo v7, redo/reopen v8 and visible stale Render/intent closure.
The full repository gate passes, root visual review accepts the result, and
independent review reports no P0, P1 or P2. Product repair, renewed UX
evaluation and the docs-only exit reconciliation are complete.

## Outcomes & Retrospective

Stage 2 implementation and representative evaluation are complete at source
fingerprint `20d4108635acb92b51b518a98e9e40203583c772a47ca27a023ffb4f23fa5f87`.
Governance, reviewed context, deterministic knowledge, comparable Story,
permission enforcement, one exact encoded first-cut path, one scoped feedback
revision, Product workspace and the renewed v21 journey all have bounded
current Evidence. The final docs-only audit package is complete. The programme
registry now hands the task pointer to `editing-execution-v1`, where
`WP-XFORM-002` is ready but unstarted; no Stage 2 application or governance
work remains.

## Context and Orientation

Product scope is in `FUTURE_PRODUCT_EVOLUTION.md`, the Product Intelligence
Blueprint and UX policies. Objects/runtime are in `docs/intelligence/`.
Candidate implementation slices are under
`docs/work-orders/documentation-expansion/`. Current execution authority stays
in Project Host, Contracts, RationalTime, CommandEditIR/CommitPlan and the
Preview/Master RenderGraph/QC chain.

## Validation and Acceptance

Every package needs focused success/failure/idempotency/reopen tests, full
repository gates, current-fingerprint Evidence and independent review. The
Stage 2 exit additionally requires authorized real media, two comparable
stories, an exact approved edit, encoded Preview/Master/QC, rejection with zero
mutation, a scoped revision, recovery and human review of the exact artifacts.

## Idempotence, Recovery and Rollback

All contracts/migrations are additive. Retries bind exact input digests and
idempotency keys. Failed or stale work retains the last valid Contract, Pack,
Story and Timeline and publishes no false success. Programme switching never
alters product data. Rollback disables the new adapter/UI and leaves persisted
versioned objects readable.

## Artifacts and Notes

Repository Evidence stores portable IDs, hashes, metrics, commands and review
decisions. Authorized media and private paths remain outside Git.

## Interfaces and Dependencies

Project Host orchestrates features and is the sole writer. Worker and Model
Gateway produce candidates only. Semantic Edit Intent is command-free; only a
Host-owned adapter may create current CommandEditIntent/CommandEditIR and enter
the existing atomic Commit/render/QC path.
