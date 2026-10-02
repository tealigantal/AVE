# ADR-0039: Initialize inside the two owning runtime services

Status: accepted for user-authorized cleanup. Date: 2026-10-02.
Supersedes ADR-0037's separate initialization topology only; CPU/CUDA selection and ADR-0038 transport remain unchanged.

## Context
Separate configuration/model-cache jobs leave stopped containers and recreate them after manual removal. The desired interface is one Compose command and two runtime containers.

## Decision
The desktop entrypoint atomically generates the existing configuration contract as root, prepares ownership, clears supplemental groups and drops to UID/GID 1000 before exec of the Host launcher. Clear raw API-key/template environment values before exec; Host reads the private mode-0600 file. The existing configuration volume is writable for startup and private to this service. Renderer gains no filesystem authority.

Whisper checks the pinned snapshot's required files locally, downloads that exact revision only when incomplete, then validates and serves it offline. Download, credential and device errors fail startup; no model substitution or runtime device fallback. Preserve every named volume and bind directory. Startup/health allows the first model download up to 30 minutes; exceeding it is explicit failure.

Remove unused GUI launcher and Chromium seccomp resources; retain historical ADRs/Evidence. Only desktop and whisper are declared. Native runtime, Host authority, consent, media semantics and other Docker projects are unchanged.

## Validation
Packaging topology/negative tests, actual build, non-root process/environment inspection, project/export persistence, cache preparation, direct workbench and repository checks. Packaging acceptance does not establish creative-quality or human Stage Exit acceptance.
