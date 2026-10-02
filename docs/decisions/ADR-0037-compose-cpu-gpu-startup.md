# ADR-0037: Compose initialization and explicit CPU/CUDA deployment

Status: accepted for the user-authorized Docker packaging scope; validation in progress.
Date: 2026-10-02. Supersedes the GPU-only deployment and launcher-only initialization portions of ADR-0036. Application state authority is unchanged.

The user requested CPU operation, CUDA acceleration where available, one Compose startup, and preservation of existing API keys in a local .env. A compulsory NVIDIA reservation prevents creation on CPU-only Docker hosts; Compose cannot probe hardware before evaluating that reservation.

Root compose.yaml is the deployment entry. Ordinary dependencies run configuration generation and pinned model cache preparation before the desktop and Whisper. .env supplies cloud keys to the short-lived configuration service; the desktop receives only a read-only private configuration volume. Git and image builds exclude .env. Docker administrators can inspect configuration-service environment; this follows the explicitly requested .env credential handling.

The portable Compose deployment requires no GPU and selects CPU/int8 when no CUDA device is exposed. A separate GPU override requests NVIDIA access and selects CUDA/float32. The Windows launcher probes Docker and CTranslate2, selects the appropriate configuration, and persists COMPOSE_FILE in .env; subsequent docker compose up uses that choice without additional flags. Direct Compose does not itself detect host GPU hardware. CUDA failures after selection stop startup; they never trigger an undisclosed CPU retry. Explicit cpu/cuda choices are available. The exact Whisper model/revision remains unchanged.

Original native configuration, existing credentials, projects and unrelated containers are retained. Initialization preserves all existing model protocol/budget fields while generating a private atomic configuration file. No offline cloud model bundle or remote access is added.
