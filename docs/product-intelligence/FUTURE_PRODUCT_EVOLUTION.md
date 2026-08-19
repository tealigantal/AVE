# Future Product Evolution

## Purpose, authority and status

This document presents a five-stage capability horizon for AVE as an AI-native
Creative Editing System. The stages are dependency and exit-condition views,
not calendar promises, current status or a replacement programme. Present-tense
implementation claims remain governed by `docs/program/` and generated
`docs/current/`.

The durable local creative-editor goal remains in `PROJECT_GOAL.md`; product and
UX direction remain in [Product Vision](../product/PRODUCT_VISION.md) and
[Future UX Vision](../product/FUTURE_UX_VISION.md). Any new process, database,
network service, agent orchestrator, shared catalog, authentication model or
contract major version requires its own approval, ADR and governed Work Order.

## Invariants across every stage

- Project Host remains the project-state, transaction and SQLite authority.
- Contracts remain the cross-language protocol source; RationalTime remains
  authoritative time.
- Evidence and reviewed interpretation remain distinct.
- Creative intelligence proposes; users approve; Project Host commits.
- Future semantic Edit Intent must adapt through Project Host into the current
  CommandEditIntent, CommandEditIR, Timeline Commands and CommitPlan path;
  Preview/Master RenderGraphs share one target-neutral semantic payload/hash.
- Unsupported semantics, missing sources, rights/privacy and QC failures close
  explicitly.
- User identity, memory and final delivery remain inspectable and controllable.

## Stage 1 — Reliable AI Editing Foundation

### User value

The creator can import real media, make versioned edits, render Preview/Master,
receive QC and recover the last committed project without AI or execution layers
overwriting one another.

### Technical requirements

Project Host single-writer authority, media identity and ProxyMap, RationalTime,
contracts/code generation, Timeline Command/Commit, unified RenderGraph,
verified-Original Master, QC, Job recovery and explicit capability blockers.

### Documentation dependencies

`PROJECT_GOAL.md`, `docs/architecture/`,
`docs/product/EDITING_CAPABILITY_SCOPE_V1.md`, editing-execution programme,
capability/acceptance matrices and immutable Evidence.

### Engineering impact

Strengthen the existing local three-boundary system and complete real-media
acceptance by capability. Do not build intelligence around absent editing
semantics or silently approximate blocked families.

### Exit condition and current boundary

The P0 reliable-media loop is an accepted baseline, but Stage 1 is not globally
"done": current generated status still lists advanced editing families as
blocked. Exit means the intended foundation and the editing slices needed by the
next stage have explicit real-media, persistence, failure and human evidence.

## Stage 2 — AI Creative Assistant

### User value

The creator describes intent, inspects material understanding, compares
evidence-bound directions and stories, approves one plan, receives an explainable
first cut and revises it through scoped natural-language feedback.

### Technical requirements

Rich Creative Contract, reviewed Material Evidence Pack, Creative Skills,
Direction Cards, Story Plan candidates, Decision Records, semantic Edit Intent,
Host-owned intelligence-to-Timeline adapter and conversation-led review UI.

### Documentation dependencies

`docs/PRODUCT_INTELLIGENCE_BLUEPRINT.md`, `docs/intelligence/`,
`docs/pipeline/`, `docs/ux/` and the reasoning/video/event/permission views in
this directory.

### Engineering impact

Add versioned editorial contracts and Project Host-orchestrated feature slices;
Model Gateway and Worker remain candidate producers. First vertical slice:
approved Contract + persisted Evidence -> two explainable Story candidates ->
one approved plan -> semantic Edit Intent -> fail-closed Host adaptation.

### Exit condition

Representative users can inspect evidence/alternatives, reject without mutation,
approve an exact story/edit, receive a real encoded result and recover/revise it.
Synthetic planning tests alone do not meet the exit condition.

## Stage 3 — Personal Creative Model

### User value

AVE remembers reviewed project decisions and opt-in creator preferences, so new
suggestions start closer to the user's voice while remaining easy to challenge,
correct or disable.

### Technical requirements

Project Memory retrieval, consented User Creative Profile, contextual preference
confidence/counterexamples, Skill evaluation evidence, bounded memory snapshots,
export/delete/retention and bias/privacy controls.

### Documentation dependencies

[Creative Memory Architecture](CREATIVE_MEMORY_ARCHITECTURE.md),
[User Creative Profile](USER_CREATIVE_PROFILE.md),
[Creative Skill System](CREATIVE_SKILL_SYSTEM.md) and
[Creative Quality Benchmark](CREATIVE_QUALITY_BENCHMARK.md).

### Engineering impact

Implement project-only retrieval first. Cross-project storage or synchronization
introduces a new data authority and needs an ADR, consent threat model and
separate governed programme. Do not use hidden provider memory or automatic
training as a shortcut.

### Exit condition

Users can see why a preference exists, correct/scope/delete it, observe a useful
ranking improvement across representative projects and confirm that current
instructions always outrank the profile.

## Stage 4 — Creator Platform

### User value

Conditional horizon: creators may share reviewed Creative Skills, knowledge and
collaboration artifacts while preserving authorship, attribution, rights and
project privacy.

### Technical requirements

Identity/authentication, signing/trust, catalog publication and moderation,
licensing/attribution, revocation, compatible project snapshots, collaboration
conflict handling, provider/cost policy and abuse controls.

### Documentation dependencies

Creative Skill/Video/Style/Trend knowledge models, license/research records,
permission model, security architecture and new platform product/ADR documents.

### Engineering impact

This stage materially expands the current local-product goal. It cannot be
inferred from DOC-001 alone. Network services, shared memory/catalogs,
authentication, marketplace execution or purchases require explicit product
authorization and architecture decisions. Local editing must continue to work
when the platform is unavailable.

### Exit condition

Only after explicit product approval: trusted publication/revocation, legal and
privacy review, offline degradation, reproducible pinned versions, moderation
and real multi-user acceptance are demonstrated.

## Stage 5 — AI-native Production System

### User value

AVE coordinates intent, evidence, story, editing, review and delivery across
larger productions while humans retain creative and release authority. The
system behaves as an inspectable production partner, not a prompt-to-video black
box.

### Technical requirements

Multi-sequence/project planning, role-scoped collaboration, asset/rights lineage,
budget/resource policy, durable long-running workflows, richer delivery targets,
cross-project knowledge with consent and production-grade observability/recovery.

### Documentation dependencies

All prior stage authorities plus new collaboration, security, migration,
deployment, delivery and operations specifications. Every new runtime boundary
requires an ADR.

### Engineering impact

Scale orchestration without distributing project truth. Specialized agents or
services may be considered only behind bounded contracts, least privilege and
Project Host-facing authority rules. Human approvals remain separated for
creative direction, consequential edits and release.

### Exit condition

Complex representative productions complete end to end with audited provenance,
recovery, cost/permission controls, human creative acceptance and no bypass of
media, Timeline, render or delivery invariants.

## Stage dependency crosswalk

| Stage | Depends on | Primary acceptance |
| --- | --- | --- |
| 1 Foundation | P0 and required editing-execution packages | real media, persistence, Preview/Master/QC and failure closure |
| 2 Creative Assistant | Stage 1 capabilities used by first cut | evidence/story/edit user journey and human review |
| 3 Personal Model | Stage 2 decisions and feedback | consent/control plus measured contextual usefulness |
| 4 Creator Platform | mature Stage 3 governance and explicit scope approval | trust, rights, security, moderation and offline degradation |
| 5 Production System | selected mature platform/local workflows | complex production, collaboration, operations and release audit |

Stages may overlap in research, but implementation must not use a later stage
to bypass an earlier gate. Each promoted slice needs exact Work Package,
allowed paths, acceptance, Evidence, debt and rollback/recovery rules.

## Recommended next Work Orders

1. **Event relation contract and review**: bounded temporal/responds-to edges,
   contradiction, correction and Material Evidence Pack integration.
2. **Creative reasoning trace**: one Observation-to-Decision-to-semantic-Intent
   chain with alternatives and stale-input rejection.
3. **Project Memory retrieval**: exact Decision/Feedback snapshots within one
   project, without cross-project persistence.
4. **Creative quality benchmark v1**: authorized media, two Story candidates,
   technical gates and human rubric.
5. **Permission matrix enforcement tests**: existing Host boundaries, approval
   staleness and malicious payload/zero-mutation cases.

These are candidate documentation-level recommendations. They must be promoted
through the repository's programme governance before source or test work.
