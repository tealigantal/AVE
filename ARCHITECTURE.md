# AVE Stable Architecture

This root file is the stable architecture entry point. Detailed current runtime
authority remains in
[`docs/architecture/SYSTEM_ARCHITECTURE.md`](docs/architecture/SYSTEM_ARCHITECTURE.md);
the long-term creative-world map is in
[`docs/03-architecture/SYSTEM_ARCHITECTURE.md`](docs/03-architecture/SYSTEM_ARCHITECTURE.md).

## Runtime boundary

```text
Electron Renderer / Dev CLI
            -> Project Host -> Project Storage / SQLite
                    -> Worker Client -> Python Worker Host -> media subprocesses

Contracts <- Core <- Platform <- Apps
```

## Stable invariants

- Project Host is the sole project-state, transaction, Timeline commit, and
  SQLite write authority.
- Contracts are the cross-language protocol source; generated bindings are not
  manually edited.
- RationalTime is authoritative for media time; floating seconds are not a
  protocol time source.
- Renderer does not access SQLite, originals, shell, FFmpeg, or model SDKs and
  does not own authoritative Timeline, Job, QC, or model state.
- Worker executes protocol-bounded tasks, never opens or modifies
  `project.sqlite`, and emits structured protocol output only.
- Models and Creative Skills produce candidates; they never approve or mutate
  business state.
- Timeline changes use the current Project Host `CommandEditIntent` -> resolve/
  preconditions -> `CommandEditIR` -> simulate/validate -> CommitPlan -> Commit
  path. Future command-free semantic Edit Intent requires a Host-owned adapter
  into this path.
- Project Host derives target-specific Preview and Master RenderGraphs from the
  committed Timeline. They share one target-neutral semantic manifest/payload/
  hash, and each graph receives its own ExecutionPlan.
- Master never uses proxy as Original. Unsupported semantics produce an
  explicit execute/fallback/bake/block decision and cannot be silently omitted.
- Publication requires validated provenance, QC, rights/privacy gates, and the
  applicable human approval.

## Architecture references

- [Project Host](docs/03-architecture/PROJECT_HOST.md)
- [Versioning](docs/03-architecture/VERSIONING.md)
- [AI boundary](docs/03-architecture/AI_BOUNDARY.md)
- [Trust layer](docs/03-architecture/TRUST_LAYER.md)
- [Media provenance](docs/03-architecture/MEDIA_PROVENANCE.md)
- [Autonomy policy](docs/03-architecture/AUTONOMY_POLICY.md)
- [Editing execution v1](docs/architecture/EDITING_EXECUTION_ARCHITECTURE_V1.md)
- [ADR index](docs/decisions/README.md)

Current capability and completion status never belongs in this file; use
[`docs/current/STATUS.md`](docs/current/STATUS.md).
