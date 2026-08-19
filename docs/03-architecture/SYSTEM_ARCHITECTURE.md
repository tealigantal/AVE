# System Architecture

## Scope and authority

This is the long-term conceptual map. It does not replace the current stable
runtime authority in [`docs/architecture/SYSTEM_ARCHITECTURE.md`](../architecture/SYSTEM_ARCHITECTURE.md)
or the editing execution architecture in
[`EDITING_EXECUTION_ARCHITECTURE_V1.md`](../architecture/EDITING_EXECUTION_ARCHITECTURE_V1.md).

## Creative operating-system worlds

```text
Creator World
  -> Creative World
  -> Timeline World
  -> Render World
  -> Outcome Learning
```

| World | Owns | Produces | Cannot own |
| --- | --- | --- | --- |
| Creator | intent, constraints, approvals, consent | Creative Contract and user actions | inferred project state |
| Creative | evidence-bound interpretation and alternatives | Story Plan, Decision Records, semantic Edit Intent | approval, Timeline, database |
| Timeline | committed editorial semantics and versions | Edit IR, Commands, CommitPlan, Timeline | model inference or rendering |
| Render | semantic resolution and media execution | RenderGraph, ExecutionPlan, manifests, QC | project-state authority |
| Outcome Learning | consented outcome and feedback evidence | governed knowledge-update proposals | silent training or retroactive rewrite |

## Runtime realization

```text
Renderer / Dev CLI
        -> Project Host -> Project Storage / SQLite
                 -> Worker Client -> Worker Host -> media subprocesses
```

- **Renderer** is a presentation and user-action boundary. It never owns
  authoritative Timeline, QC, Job, or model state.
- **Project Host** is the sole project-state and SQLite write authority. It
  validates contracts, approvals, versions, commits, jobs, and publication.
- **Worker** executes protocol-bounded media/compute tasks and never opens or
  mutates `project.sqlite`.
- **Storage** persists Host-authorized project facts and immutable artifacts.
- **Contracts** are the cross-language protocol source; generated bindings are
  not hand-edited.

## Dependency direction

Contracts and pure Core are below Platform; Apps use Platform; features expose
bounded domain capabilities and do not call each other's internals. Models,
adapters, render backends, and external formats remain outside project-state
authority.

## Semantic path

The future product direction is `Creative Decision -> Story Plan -> semantic
Edit Intent -> Host-owned adapter`; it must then enter the current
`CommandEditIntent -> CommandEditIR -> Timeline Command/CommitPlan -> Commit ->
Preview/Master RenderGraphs -> ExecutionPlans -> Master QC` path. No layer may
skip a validation boundary or treat a later derived artifact as project truth.
