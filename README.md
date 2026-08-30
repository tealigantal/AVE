# AI Vlog Co-Editor

AVE is a local, conversational AI Vlog editor that turns real media into traceable, verifiable films under Project Host authority.

## First repository visit

Follow one entry path:

1. this `README.md`;
2. [`AGENTS.md`](AGENTS.md);
3. [`docs/README.md`](docs/README.md);
4. generated [`docs/DOCUMENT_INDEX.md`](docs/DOCUMENT_INDEX.md);
5. the corresponding domain document routed by the documentation home and
   [`DOCUMENT_AUTHORITY_MAP.md`](docs/DOCUMENT_AUTHORITY_MAP.md).

Do not begin with a historical plan, Evidence record, or archived document.

## Install and verify

```text
pnpm install --frozen-lockfile
pnpm run docs:sync
pnpm run docs:check
pnpm run check
pnpm run acceptance:final:synthetic
```

## Documentation and current work

[Coding Agent rules](AGENTS.md) · [documentation home](docs/README.md) ·
[generated programme index](docs/DOCUMENT_INDEX.md) ·
[authority map](docs/DOCUMENT_AUTHORITY_MAP.md) · [goal](PROJECT_GOAL.md) ·
[stable architecture](ARCHITECTURE.md) ·
[editing programme](docs/program/editing-execution-v1/EXECUTION_MANIFEST.yaml) ·
[Creative Stage 2 programme](docs/program/creative-assistant-v1/EXECUTION_MANIFEST.yaml) ·
[current status](docs/current/STATUS.md) ·
[current work](docs/current/WORK.md)

Historical context is retained in the [archived source blueprint](docs/archive/source-blueprints/AI%20Vlog%20Co-Editor%20工程架构与仓库蓝图-v2.0-2026-07-29.md), not as current authority. Development Integration, Stage Exit, and Release gates are defined by [ADR-0026](docs/decisions/ADR-0026-development-integration-stage-exit-release-gates.md).
