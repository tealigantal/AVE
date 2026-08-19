# User Experience

## Experience loop

```text
Media import
  -> AI understanding
  -> Creative conversation
  -> Story planning
  -> Edit generation
  -> User feedback
  -> Refinement
  -> Publication approval
```

| Stage | User sees and controls | AVE produces | Failure behavior |
| --- | --- | --- | --- |
| Import | selected sources, rights/privacy choice, missing media | stable media identity, probe, proxy relation | explain and block unavailable or unauthorized sources |
| Understand | people, actions, speech, audio, uncertainty, gaps | observations and Evidence Graph references | uncertain claims stay labeled; corrections are versioned |
| Converse | audience, purpose, duration, voice, protected material | Creative Contract and blocking questions | no Timeline mutation while intent is unresolved |
| Plan | comparable directions, beats, reasons, alternatives | Story Plan and Decision Records | unsupported or weakly evidenced beats remain proposals |
| Generate | exact proposed changes and unchanged areas | future Edit Intent, Host adaptation, current CommandEditIntent / CommandEditIR, candidate version | any failed check leaves committed Timeline unchanged |
| Review | Preview, difference, explanation, QC, rollback point | Review Artifact and scoped patch options | a failed render or QC never appears deliverable |
| Refine | natural-language feedback or direct edits | Feedback Diagnosis and local patch | ambiguous feedback asks or proposes alternatives |
| Publish | Master, provenance, rights and QC summary | delivery-ready record after explicit approval | AVE never publishes from confidence alone |

## Interaction contract

Every consequential proposal answers:

- what will change;
- what will remain unchanged;
- why this change serves the approved intent;
- which evidence supports it;
- uncertainty and alternatives;
- required approval and rollback point.

The default surface is conversation plus inspectable cards and comparisons.
Timeline, `CommandEditIR`, commands, manifests, and semantic hashes remain available to
advanced users and reviewers without becoming mandatory for normal use.

## Recovery experience

On failure, AVE keeps the last valid project version, records a structured
diagnostic, explains whether retry is safe, and never hides a fallback. A user
can reopen the project, inspect the decision and source versions, and continue
from the last committed state.
