# AI Agent Permission Model

## Purpose, authority and status

This document consolidates AVE's permission boundary for future agent-like
automation. It does not introduce an autonomous agent, ACL service or alternate
approval state machine. Enforcement remains in Project Host, Contract Runtime,
Project API, Timeline validation, RenderGraph resolution and delivery gates—not
in model self-restraint.

Canonical boundaries are defined by
[System Architecture](../architecture/SYSTEM_ARCHITECTURE.md),
[Creative Intelligence Runtime](../intelligence/CREATIVE_INTELLIGENCE_RUNTIME.md)
and [Review and Approval Model](../ux/REVIEW_APPROVAL_MODEL.md). Human approval
cannot waive hard engineering, evidence, privacy, rights or source-identity
invariants.

## Actors and authority

| Actor | May produce | May persist/authorize |
| --- | --- | --- |
| Renderer / conversational UI | user requests, selections and approval actions through a white-listed Project API | no project-state authority |
| Model Gateway | contract-validated creative candidates and audit metadata | no persistence, approval or execution authority |
| Worker Host | protocol-bounded media/analysis candidates and execution results | no SQLite, Timeline, approval or project-stage authority |
| Feature/Core logic | pure proposals, validation and deterministic compilation results | no direct SQLite write; no cross-feature orchestration |
| Project Host | bounded context, validated artifacts, commands, approvals, jobs and transactions | sole project-state/SQLite/Commit authority |
| Human user/reviewer | Contract, Story, Edit/Commit and Delivery decisions within policy | explicit, scoped and version-bound approval actor |

An "agent action" is therefore a request or candidate routed through these
boundaries. It is never ambient access to files, media, database, shell or the
Timeline.

## Allowed autonomous actions

These actions may run without case-by-case creative approval only when an
approved project policy authorizes the exact scope and Project Host enforces the
request:

- validate metadata already available through a white-listed Project API;
- request Worker probe, fingerprint, proxy, transcript or analysis candidates;
- extract/index approved metadata and generate evidence candidates;
- generate alternative Direction Cards, Story candidates or Edit Intent drafts;
- run deterministic schema, source, capability, rights/privacy and staleness
  checks;
- generate QC measurements, diagnostics and repair suggestions;
- rank/retrieve exact-version Skills or knowledge snapshots within consent;
- estimate cost/latency and explain blockers or missing evidence.

"Metadata extraction" does not grant direct original-file access to the model.
Project Host checks session, privacy, identity and policy, then schedules Worker
with the minimum required inputs. Candidate results require validation before
registration.

## Human approval required

Human approval is required for:

- approving or materially changing the Creative Contract;
- selecting story direction and approving an exact Story Plan;
- deleting, excluding or materially shortening important scenes when narrative
  meaning, people or protected material may change;
- changing story direction, creator identity, sensitive representation,
  sponsor meaning or factual claim;
- approving a semantic Edit Intent/CommitPlan when the policy does not already
  authorize the exact reversible class;
- resolving ambiguous causality, identity, emotion or material factuality;
- using reusable cross-project User Memory or new sensitive data scope;
- accepting subjective picture, sound, pacing and story quality;
- final Delivery/Publish authorization.

Approval binds exact object digest, base version, affected scope and expected
effect. Stale inputs or materially changed effects invalidate it. A broad chat
message is not indefinite future consent.

## Forbidden actions

No agent, model, Worker, UI or approval may:

- directly read or modify `project.sqlite` outside Project Host;
- directly mutate Timeline or bypass semantic Edit Intent, Edit IR,
  preconditions, simulation, validation and CommitPlan;
- inject arbitrary Timeline Commands, RenderGraph nodes, backend strings, shell,
  FFmpeg/MLT, code or network downloads through Skills or model output;
- directly access originals, filesystem paths, credentials or private media
  outside a Host-authorized narrow job;
- use a Proxy as Master Original or hide unsupported Preview/Master divergence;
- bypass protected refs, locks, rights, privacy, licensing or capability gates;
- fabricate people, Moments, Events, causes, dialogue, claims or evidence;
- auto-approve Contract, Story, Edit/Commit or Delivery;
- silently change project stage, memory consent, retention or user identity;
- publish, upload, purchase or contact an external service without explicit
  authority for that side effect;
- turn a failed/partial operation into empty success.

## Permission classes

| Class | Example | Gate | Failure result |
| --- | --- | --- | --- |
| read/query | retrieve approved evidence refs | Project API scope, privacy and version | denied/insufficient response; no state change |
| candidate generation | Story or QC suggestion | bounded context, Contract Schema and provenance | invalid candidate discarded/diagnosed |
| derived registration | reviewed Evidence Pack or Decision Record | Host validation and idempotent identity | no authoritative artifact on failure |
| project mutation | approved edit | exact approval plus full Host Commit path | zero Timeline/event/artifact mutation on failure |
| render execution | Preview/Master request | committed Timeline, ExecutionPlan, source/capability resolution | explicit blocked bundle or failed job |
| delivery/external side effect | publish/export/send | QC/rights/privacy and exact human approval | remain at last valid delivery state |

## Reversible defaults

Agents may choose reversible presentation defaults—candidate ordering,
explanation length or non-authoritative preview selection—when they do not
change project truth or hide alternatives. Defaults that alter story meaning,
Timeline, privacy scope, cost or external systems require the relevant gate.

Undo is not a substitute for permission. A reversible edit still needs the
approved mutation path, provenance and version checks.

## Delegation and tools

An agent may delegate only a subset of its already-authorized request scope.
Delegation cannot expand media, project, time-range, network or mutation access.
Every tool call records actor/agent identity, purpose, exact inputs, policy and
result; returned data is minimized and redacted.

Tool/model confidence never expands permission. Repeated success does not grant
new rights. Provider or tool failure cannot cause fallback to a less governed
path.

## Memory and learning permissions

Project decisions may be retrieved within their project policy. Cross-project
User Memory is opt-in, inspectable and deletable. Skill evaluation evidence may
inform a reviewed new definition version but cannot train providers or alter
published definitions automatically. See
[Creative Memory Architecture](CREATIVE_MEMORY_ARCHITECTURE.md).

## Audit and recovery

Permission-sensitive operations record request, actor, exact refs/digests,
policy version, approval, expected effects, result and diagnostics. After crash
or retry, Project Host resumes from registered immutable state and replays only
explicitly idempotent work. It never infers approval from a completed Worker job
or model response.

## Work Order implications

The first slice should implement no new agent runtime. It should test the
existing Host boundary with a permission matrix fixture: allowed metadata
candidate request, approval-required story/edit request and forbidden direct
mutation/payload attempts. Acceptance must prove least data exposure, exact
approval staleness, idempotency, audit records and zero mutation on denial.
