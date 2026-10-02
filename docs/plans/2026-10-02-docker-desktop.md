# Container desktop ExecPlan

WP-S3-DOCKER-001 implements the user-selected fully containerized browser
desktop. Root is the sole writer; one bounded read-only runtime review inspected
startup, network, storage and rendering requirements.

Scope: production build, pinned browser desktop, Worker/FFmpeg/fonts, local
model services, private configuration mounts, persistent media/project/export
paths, Windows one-click start/stop, failure visibility and deployment evidence.
Exclude application redesign, new state APIs, remote access and automatic model
fallback. Preserve unrelated containers and existing native projects.

1. Register governed package and deployment ADR. Started 2026-10-02.
2. Build and validate packaging and configuration with fixtures.
3. Launch isolated container desktop; verify sandbox and local models.
4. Verify actual import, Preview/Master, export, audio transport and reopen.
5. Run required repository gates, record Evidence, synchronize docs.

Current: both images built; first pinned Whisper cache preparation completed.
Actual Whisper and YAMNet requests passed with synthetic PCM, and the container
FFmpeg8/Python3.14/Pillow12.3 media correctness suite passed. The browser displays
the actual AVE workbench. The user authorized the targeted user/PID/network
namespace policy; Renderer has NoNewPrivs=1, Seccomp=2 with three filters and a
nested PID namespace. Private credentials now use a read-only Docker volume,
avoiding an observed Windows file-bind directory mismatch. Actual Host creation,
Preview/Master/QC/reopen passed on Linux volume storage; Windows project binds
failed fchmod and are replaced with a dedicated persistent project volume.
Full checks use the existing isolated Worker after
the system Python failed the exact Pillow version assertion. Evidence:
[runtime precheck](../evidence/runs/EVD-20261002-S3-DOCKER-RUNTIME-PRECHECK.md).
Preview/Master through the browser, export, audio and project reopen remain
pending. Completion cannot be inferred from Docker health.

References: LinuxServer Webtop and Selkies custom-image documentation;
Docker Compose startup-order and GPU documentation; Electron sandbox policy.
Versions and image/model digests are pinned in Docker sources. Research date:
2026-10-02. Credentials and private media never enter build context or Evidence.

2026-10-02 user scope update: root Compose entry and ignored .env are authorized. Existing native JSON/API keys preserved; local .env retains both exact cloud keys and model fields. Compose owns configuration generation/cache initialization. CPU/int8 and CUDA/float32 use the same pinned model. Docker cannot auto-choose host GPU reservations in a static Compose file: launcher probes Docker/CTranslate2 and persists the override selection in .env; direct Compose reuses it. Explicit CUDA runtime errors remain visible. ADR-0037 supersedes only ADR-0036 GPU-only/launcher-only deployment portions. CPU/GPU packaging fixtures passed; actual service startup and final checks underway.

Final scoped Docker acceptance 2026-10-02: CPU and CUDA actual Compose startup plus speech API passed; GPU restored in local .env. Actual production container Host import, dual Preview/Master/QC, export and reopen passed with encoded synthetic media/controlled model replies. Final images rebuilt/recreated; browser reopened persistent test project, selected/rendered v1, and normal export saved identical Master bytes (SHA256 85ba638af42bc5e627bbab486554142f3bfe36bf795803accd3b68dbf7d9cd50). Browser AudioWorklet received non-silent generated tone at level 50, 30ms buffer, no underrun after browser gesture. Native configurations/keys and other Docker applications retained. Full check and synthetic acceptance passed; final packaging fixture/typecheck/architecture passed. Evidence EVD-20261002-S3-DOCKER-COMPOSE-FINAL. These facts supersede the pending runtime steps above; cloud creative acceptance and subjective human listening are not newly claimed. Completion/docs synchronization underway.

Closure: docs:complete -- WP-S3-DOCKER-001 EVD-20261002-S3-DOCKER-COMPOSE-FINAL succeeded, followed by docs:sync and docs:check. One initial documentation applicability check detected the work-package description amendment after the scope pin was computed; the final Docker scope pin was recomputed from the finished package source and docs:check passed without weakening assertions. Docker capability/acceptance is tested and package completed; broader Stage3 human/real-media acceptance is unchanged. Local CUDA desktop and Whisper remain running/healthy, helpers exited successfully, .env keys re-compared equal to unchanged originals. No Git publication performed.
