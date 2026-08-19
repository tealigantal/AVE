# AI Boundary

## AI may

- generate observations and interpretation candidates with confidence;
- generate Direction Cards and Story Proposals;
- propose semantic Edit Intent and bounded modification suggestions;
- rank alternatives against an approved Creative Contract;
- explain reasons, evidence, uncertainty, conflicts, and blockers;
- produce non-authoritative critique or knowledge-update proposals.

## AI may not

- write SQLite or any project-state store directly;
- mutate Timeline, emit an authoritative Commit, or bypass `CommandEditIR` validation;
- construct executable backend commands, shell, arbitrary graph nodes, or
  unregistered tools through a Skill;
- approve its own Story Plan, edit, rights decision, sensitive representation,
  QC exception, or publication;
- hide unsupported semantics through approximation or omission;
- treat confidence as consent;
- upload, retain, learn from, or share private media beyond explicit policy.

## Integration rule

Model Gateway returns contract-validated candidates and audit metadata. Project
Host validates provenance, current versions, capabilities, policy, and approval
before any authoritative registration. Worker executes only a Host-authorized
plan and returns a candidate result for Host validation.

## Failure rule

Invalid, stale, unsafe, unsupported, or weakly evidenced AI output is rejected,
quarantined, or shown as a non-executable alternative. Rejection produces zero
Timeline mutation and no successful render or delivery claim.
