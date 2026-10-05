# ADR-0042 — Current media entrypoints without aliases

Status: Accepted

Date: 2026-10-04

## Context

The user reaffirmed that replaced AVE interfaces must be physically removed,
including compiled container code. ADR-0041's implementation-limit paragraph
retained two aliases contrary to that policy. This new decision records the
replacement without rewriting the earlier decision or its Evidence. It owns
only the current media-entrypoint policy and is linked from the ADR index.

## Decision

- Full source browsing uses `project.media.browse` and the registered
  `media.browse.v1` Worker handler for images, video and independent audio.
- Precise source measurements use `project.media.analysis` and Host
  `readMediaAnalysis`. Soundtrack and precision consumers retain strict
  source/time/sample evidence. This is a separate current purpose, not an old
  playback implementation.
- Host `readMediaPreview` and IPC `project.media.preview` are removed. No alias,
  fallback, dual read or old-query redirect remains. All runtime callers and
  tests move in the same change. The old query must return `UNKNOWN_QUERY`.
- Rebuild both authorised AVE images from the exact current input manifest,
  replace only their Compose containers, verify actual compiled runtime bytes,
  and remove only identified unused superseded AVE images. Originals, projects,
  exports, model caches, other services and immutable history remain protected.

## Consequences

This supersedes only ADR-0041's retained-alias implementation limit; its
browsing/strict-analysis separation remains valid. Removing aliases does not
fix the separately diagnosed cancellation/Worker lifecycle failure and cannot
be recorded as successful actual video playback. The P2 package remains
blocked until the real failed journey is fixed and accepted. No commit, push,
merge, release, data migration or broad Docker pruning is authorised here.
