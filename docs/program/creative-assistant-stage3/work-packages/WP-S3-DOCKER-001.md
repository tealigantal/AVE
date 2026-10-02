# WP-S3-DOCKER-001 — Local container desktop

User authorized full Docker packaging and selected browser streaming of the
existing desktop. This package adds deployment only and does not advance Stage4.
Allowed paths and checks are governed by EXECUTION_MANIFEST.yaml.

Specification: [Docker desktop](../../../04-engineering/DOCKER_DESKTOP.md).
Plan: [ExecPlan](../../../plans/2026-10-02-docker-desktop.md).
Decision: [ADR-0036](../../../decisions/ADR-0036-container-desktop.md).

Completion requires actual container startup without disabling sandbox, local
models, import, Preview/Master, export, audio transport and persistence evidence,
plus required repository checks. Health alone is insufficient. GPU or missing
credentials failures remain explicit. Existing native projects and other Docker
applications are preserved. No commit, push, PR, release or remote publication
is authorized by this package.

User-authorized amendment: root compose.yaml, .env.example and ignored local .env are in scope. ADR-0037 supersedes GPU-only startup: portable CPU/int8 default, explicit CUDA/float32 override and launcher auto-probe saved to .env. Native JSON and API keys remain preserved; Compose initializes credentials/cache. See current final Docker Evidence for scoped synthetic/browser/runtime verification. No Stage Exit or publication authority is added.
