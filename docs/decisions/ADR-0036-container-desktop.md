# ADR-0036: Containerize the existing desktop and stream it locally

Status: accepted deployment decision; implementation validation pending.
Date: 2026-10-02.

## Context

The user requested full Docker packaging and chose browser access to the existing
desktop. A separate web application would create new IPC/state boundaries.

## Considered options

A native Electron front end with container backends does not meet the selected
full-container scope. noVNC lacks the required desktop audio transport. A new
web front end adds an unrequested application and permission boundary.

## Decision and rationale

Use a pinned Ubuntu Webtop/Selkies base carrying Electron, Worker, FFmpeg,
CJK fonts and YAMNet. Whisper is a GPU sidecar sharing the desktop network
namespace. This preserves validated localhost model configuration without fake
API keys or permissive network validation. Qwen services remain externally
configured. Publish only a loopback browser port.

Preserve directory layout, renderer sandbox, Host authority and existing
Preview/Master rendering. Persistent mounts cover originals (read-only), projects,
exports and user profile. Credentials are private read-only runtime mounts.
Projects and credentials use named Linux volumes: actual Windows bind mounts
failed Host immutable-file fchmod and misrepresented the credential file as a
directory. Credentials are transferred by a short-lived helper with mode 0600;
originals and exports retain Windows directory mappings.
No automatic model/device fallback, Windows project migration or remote access.

## Consequences

A streamed desktop requires browser audio activation and Linux paths;
images and caches consume disk; the Whisper bundle requires NVIDIA support.
Evidence must prove the actual workflow, not merely container health.

## Migration and rollback

Create fresh container projects using stable mounted Linux paths. Existing
Windows projects remain intact; no automatic path migration occurs. Stop the
AVE Compose project without deleting volumes to roll back to the existing
native launcher. No state authority or contract replacement is involved.
