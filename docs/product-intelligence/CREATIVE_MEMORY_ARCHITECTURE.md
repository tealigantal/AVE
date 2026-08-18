# Creative Memory Architecture

## Purpose, authority and status

Creative memory lets AVE reuse reviewed context without turning model history
into hidden authority. This document defines a consent-first target boundary for
User, Project and Skill Memory. It does not introduce a Memory service,
database, autonomous learning loop or implemented capability.

Canonical target objects, versioning and ownership remain in the
[Product Intelligence Object Model](../intelligence/OBJECT_MODEL.md). Runtime
orchestration remains in
[Creative Intelligence Runtime](../intelligence/CREATIVE_INTELLIGENCE_RUNTIME.md).
Project Host is the only project-state and SQLite writer. Shared/cloud memory,
cross-device synchronization and background learning require a future ADR,
privacy design and governed Work Order.

## Memory is a governed view, not model state

AVE memory is a queryable set of immutable, provenance-bearing records. It is
not a prompt transcript, provider cache, mutable embedding collection, model
weight update or permission to retain private media. A generated preference is
a hypothesis until the user reviews it or an explicit policy accepts it.

Every memory item needs:

- stable ID, schema/object version, scope and status;
- source artifact/decision/feedback refs and exact content digests;
- created/observed time, recency policy and optional expiration;
- confidence with basis, counterexamples and conflict state;
- consent basis, privacy class, retention rule and deletion/export behavior;
- producer/tool/policy provenance and reviewer state;
- applicability dimensions and known exclusions.

Names and physical contracts are future implementation decisions. JSON Schema
becomes authoritative only through a promoted work package.

## Three memory scopes

### User Memory

Long-lived, opt-in preferences that may apply across projects:

- preferred pacing and tolerance for silence;
- subtitle style and information density;
- music characteristics and mix preferences;
- narrative preferences and creator-identity constraints;
- repeatedly rejected patterns, each with context and counterexamples.

User Memory never contains raw project media by default. It should favor
reviewed summaries and source Decision Record refs. Cross-project use must be
visible, editable, exportable, deletable and disableable. A single accepted or
rejected suggestion is evidence for a candidate preference, not a permanent
rule.

### Project Memory

The authoritative, recoverable creative history of one project:

- approved Creative Contract versions;
- exact Material Evidence Pack and Story Plan refs;
- accepted and rejected decisions, alternatives and reasons;
- approved semantic Edit Intents and committed Timeline provenance;
- review observations, feedback diagnoses, QC results and delivery decisions.

Project Memory is primarily a retrieval view over existing immutable artifacts
and append-only decisions. It does not duplicate them into a parallel state
store. Project Host resolves exact refs and current validity before use.

### Skill Memory

Evidence about how versioned Creative Skills perform in defined contexts:

- which `SkillEvaluation` recommendations users accepted or rejected;
- which expected effects survived human review;
- which contexts, evidence thresholds or conflicts caused failure;
- benchmark results and known counterexamples;
- definition/evaluator versions and population/segment boundaries.

Skill Memory cannot mutate a published `CreativeSkillDefinition`. New evidence
creates a new evaluation record, benchmark snapshot or reviewed definition
version. Repository-shipped read-only knowledge plus Project Host-pinned project
snapshots is the first safe boundary; a shared learning catalog is out of scope.

## Scope and precedence

| Scope | Default lifetime | Authority | May influence | Must not override |
| --- | --- | --- | --- | --- |
| current interaction | session/request | Project Host context assembly | current candidate generation | approved Contract or current explicit user instruction |
| project | project lifetime/retention policy | Project Host project artifacts | project retrieval, revision and explanation | approved facts, locks, rights/privacy or Timeline authority |
| user | opt-in user-defined retention | future user-memory authority through Host-facing policy | ranking and defaults across projects | current project Contract or creator correction |
| skill evidence | immutable reviewed dataset snapshot | curated catalog plus Host-pinned refs | evaluation and definition revision | evidence gates, capability status or human acceptance |

Precedence is current explicit instruction and approved Creative Contract,
followed by project decisions, then applicable user preferences, then Skill and
default advice. Recency alone cannot erase a protected identity constraint.

## Write path

```text
user action / review / feedback / benchmark
  -> source artifact and consent validation
  -> candidate memory observation
  -> conflict, confidence and privacy evaluation
  -> user/policy review where required
  -> immutable registration by the appropriate authority
  -> exact-version retrieval snapshot for a CreativeRun
```

Model Gateway may propose a summary, but cannot persist it. Worker may produce
analysis candidates, but cannot classify them as preference. Project feedback
does not silently train a provider or shared model.

## Read path and context assembly

Project Host creates a bounded memory query from the approved Creative Contract,
project scope, purpose and privacy policy. Retrieval filters exact scope,
consent, status, expiry, applicability and conflicts before ranking. The
resulting snapshot records selected and rejected items with reasons and becomes
part of the `CreativeContextBundle` input fingerprint.

If memory is unavailable, expired or declined, AVE continues with explicit
project inputs. Memory is an enhancement, not a precondition for basic editing.

## Feedback and learning policy

Acceptance rate is not creative truth. An accepted change may reflect time
pressure; a rejection may be project-specific; publication does not prove every
decision was good. Preference inference therefore needs repeated evidence,
context segmentation, counterexamples and user-visible wording such as
"suggested preference" rather than "your style" until confirmed.

Corrections create successor records and invalidate affected retrieval
snapshots. Historical decisions retain pinned inputs for audit. Negative signals
must not be discarded merely because they reduce benchmark scores.

## Privacy and user control

Users must be able to see why a memory item exists, correct it, limit its scope,
exclude it from a project, export it and request deletion. Deletion policy must
distinguish the reusable memory item from immutable project audit records that
may need retention; the product must explain this distinction before consent.

Sensitive identity, health, protected-class, location or relationship
inferences require stricter policy and are excluded from automatic User Memory
by default. Raw media, private paths and provider prompts are not memory items.

## Invalidation and failure closure

- Missing consent or source provenance blocks registration.
- Scope leakage between projects/users blocks retrieval.
- Conflicting preferences return alternatives instead of last-write-wins.
- Expired, deleted, revoked or stale items cannot enter a new context snapshot.
- Failure to register memory cannot alter the originating project decision.
- Memory can never approve a Contract, Story, Edit/Commit or Delivery gate.
- No memory item can contain Timeline Commands, RenderGraph nodes, backend
  strings, credentials or executable code.

## Work Order implications

The first implementation slice should be project-only: retrieve accepted and
rejected Decision Records plus feedback diagnoses into one exact, bounded
context snapshot and prove idempotency, correction, stale refs, reopen and
zero-Timeline-mutation behavior. User Memory requires a separate consent,
retention, export/delete and multi-project threat model. Shared Skill Memory
requires an ADR and explicit catalog publication authority.
