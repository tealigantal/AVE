# AI Vlog Co-Editor

AVE is a local, conversational AI Vlog editor that turns real media into traceable, verifiable films under Project Host authority.

## Current maturity

The P0 reliable-media loop is an accepted baseline. editing-execution-v1 is fully specified but not implemented; its actual state is [generated here](docs/current/STATUS.md).

## Install and verify

```text
pnpm install --frozen-lockfile
pnpm run docs:sync
pnpm run docs:check
pnpm run check
pnpm run acceptance:final:synthetic
```

## Documentation and current work

[Document index](docs/DOCUMENT_INDEX.md) · [goal](PROJECT_GOAL.md) · [product vision](docs/product/PRODUCT_VISION.md) · [v1 scope](docs/product/EDITING_CAPABILITY_SCOPE_V1.md) · [stable architecture](docs/architecture/SYSTEM_ARCHITECTURE.md) · [programme](docs/program/editing-execution-v1/EXECUTION_MANIFEST.yaml) · [current work](docs/current/WORK.md) · [historical blueprint](AI%20Vlog%20Co-Editor%20工程架构与仓库蓝图.md)
