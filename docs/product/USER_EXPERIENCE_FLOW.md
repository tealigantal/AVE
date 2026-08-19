# User Experience Flow

## End-to-end journey

| Stage | User action | AI action | State and artifacts | Approval / reversibility |
|---|---|---|---|---|
| Import | Select media and privacy policy | Probe, identify, group and report gaps | Media identities, proxy map, evidence graph | Import is reversible; originals are never copied by intelligence |
| Understand | Inspect material summary | Describe people, places, actions, speech, audio, uncertainty | Material Evidence Pack with source/time refs | User can correct labels; corrections are versioned |
| Intent | Describe audience, goal, duration and identity | Form a Creative Contract and ask only blocking questions | Goal, constraints, protected subjects, delivery target | User confirms contract; no Timeline mutation |
| Direction | Compare creative directions | Generate alternatives using skills, references and evidence | Direction Cards, trade-offs, confidence | User selects, edits or rejects; alternatives remain available |
| Story | Review beats and evidence | Generate Story Candidates and bind each beat to media | Story Plan, Beat Evidence, alternatives | Story approval required before edit plan |
| First cut | Request rough cut | Adapt approved Edit Intent into scoped commands | Edit Intent, current CommandEditIntent / CommandEditIR, candidate Timeline version | Host simulates and commits atomically; undo/reopen supported |
| Review | Watch Preview and explanations | Diagnose observations and propose local patches | Review Artifact, Decision Records, QC diagnostics | User approves each patch class; old version retained |
| Revise | Give natural-language feedback | Map feedback to evidence and affected ranges | Feedback Diagnosis, Patch Plan, new version | Patch is bounded, comparable and reversible |
| Deliver | Choose output and publish | Render Preview/Master, run QC, explain blockers | Render Bundle, manifests, QC and delivery record | Final human approval; failed delivery cannot appear successful |

## Interaction rules

The normal path is conversation plus inspectable cards, not a permanent demand
to edit a professional Timeline. Advanced users may open evidence, `CommandEditIR`,
commands and semantic hashes. Every proposed change states what will change,
what will not change, why, confidence and the rollback point.

## State machine

`Imported → Understood → Contracted → Directed → StoryApproved → Planned →
Committed → Reviewed → Revised* → DeliveryReady → Delivered`.

Transitions requiring approval are Contracted, StoryApproved, Commit, and
DeliveryReady. Any failed transition creates a diagnostic or blocker and keeps
the last valid state.
