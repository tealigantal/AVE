# Style Knowledge Model

## Purpose and boundary

A Style Profile describes transferable creative dimensions from reviewed
references or creator preferences. It does not copy shots, dialogue, music,
identity or protected expression. Style is advisory context for Story Plans
and Edit Intents; it has no execution or Timeline authority.

## StyleProfile target schema

Common fields:

- `profile_id`, `schema_version`, `profile_version`, definition digest/status
- scope: platform, audience, content type, duration class and language
- exact source refs, rights status, observation/pattern refs and exclusions
- dimension records, compatibility policy, risks and adaptation limits
- aggregate confidence plus per-dimension confidence/basis
- analyzer/model/tool/policy versions, reviewer and timestamps
- review-after/expiration where the profile derives from changing references

Each dimension has `value`, evidence refs, confidence, allowed adaptation,
incompatible contexts and uncertainty. A missing dimension remains `unknown`;
it is not filled with a generic style default.

`StyleObservation` is a typed analytical view over the time-coded
`VideoObservation` hierarchy in `../research/VIDEO_KNOWLEDGE_MODEL.md`, not a
second evidence authority. `StyleProfile` aggregates reviewed observations;
`StyleCompatibilityReport` evaluates one exact profile against one exact
Creative Contract and Material Evidence Pack.

### Pacing

Shot-duration distribution by story segment, cut density, hold/silence
distribution, acceleration/deceleration shape, dialogue breathing room and
duration-normalized ranges. Aggregates retain exact source observation refs.

### Shot language

Framing roles, scale changes, camera movement categories, establishing/detail/
reaction usage, sequence grammar and continuity principles. It describes
relationships, not a shot list to reproduce.

### Subtitle

Coverage policy, cue/word timing behavior, density, line/character limits,
placement/safe-area behavior, emphasis grammar, case/punctuation and
accessibility/language constraints. Fonts or graphical assets are separate
licensed refs, never embedded executable style.

### Music and sound

Structural role, energy curve, speech/music/silence balance, change points,
ducking intent and emotional function. The profile never identifies music as
reusable unless a separate licensed asset record authorizes it.

### Color

Descriptive palette, contrast/saturation intent, lighting continuity and
emotional function with color-space context. It does not contain backend filter
strings or claim a LUT can execute; a later Edit Intent references registered
color semantics and resolver capability.

### Narrative style

Point of view, narrator distance, chronology, reveal strategy, humor/intimacy,
emotional curve, authenticity constraints and ending behavior. These values
must remain compatible with the Creative Contract and available evidence.

## Sources and profile kinds

- `reference`: extracted from one or more user-approved reference videos;
- `creator`: explicitly authored or approved creator preferences;
- `composite`: a deterministic merge of exact profile versions;
- `project_adaptation`: a project/run-specific compatible subset.

Composite merge is field-aware: conflicts remain explicit and require policy
or user resolution. A newer profile version does not retroactively alter a
project adaptation pinned in an approved Story Plan.

## Extraction and retrieval

```text
permitted references -> Video Observations / Video Patterns
  -> dimension extraction -> review -> immutable Style Profile

Creative Contract + Material Evidence Pack + profile catalog snapshot
  -> rights/status filter -> compatibility -> ranked project adaptation
```

Model-based descriptions are candidates. Deterministic analyzers provide
measurable dimensions where possible, and human review confirms subjective
claims. Project Host registers project-scoped profiles and adaptations; Worker
and Model Gateway do not persist them directly.

## Compatibility result

Every requested profile produces a dimension-by-dimension result:
`compatible`, `adaptable`, `conflicting` or `unknown`, with reason, evidence,
required material/capability and proposed adaptation. Hard Creative Contract,
privacy, rights and creator-identity conflicts disqualify the dimension.
Unknown material availability cannot be presented as compatible.

The result records rejected dimensions as well as selected ones so a Story
Plan can explain which style principles it used and why.

## Failure behavior

Missing rights, invalid source identity or prohibited copying rejects the
profile. Low-confidence dimensions remain unknown or require review. Missing
material/capability yields an adaptable proposal or explicit blocker. Style
retrieval outages degrade to contract-and-evidence planning. No failure mutates
Timeline.

## Implementation target

`WO-STYLE-001` owns schemas for Style Profile and compatibility result,
generated bindings, pure extraction-normalization inputs, deterministic
retrieval/compatibility logic, a repository-shipped read-only catalog port and
Project Host content-addressed project snapshots. Acceptance includes
conflicting references, unknown dimensions,
rights failure, exact version pins, creator-identity protection and evidence-
bound adaptation. Actual media analyzers and external reference acquisition are
separate authorized slices.
