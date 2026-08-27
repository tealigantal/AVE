# ADR-0024 Stage 2 immutable Original snapshot authority

- Status: Accepted
- Date: 2026-08-28

## Context

Stage 2 Material Evidence Packs and semantic executions previously depended on
an authorized mutable import location. A later rewrite at that path could
silently change the bytes used by execution, while a legacy permission record
could survive without a Project-owned file. Product render also needed a
single exact authority that could be revalidated after execution approval and
again before publication.

Publishing a second file creates its own integrity risks. Path-only copy,
rename, chmod and cleanup can follow links, overwrite a concurrent target,
verify one file and register another, or delete a replacement during failure
compensation. Session close must not detach the SQLite authority while an
authorization mutation is still preparing that file.

## Considered Options

1. Continue using the mutable import location and re-hash it before each use.
2. Copy into the project by pathname, rename over the final path, then register
   the row and permission.
3. Let Project Host create and retain exact file handles, publish a no-clobber
   content-addressed snapshot, bind compensation to that file identity, and
   keep the final handle through the atomic database commit.
4. Require a new platform-native filesystem service with `openat`/`unlinkat`
   or Windows handle-relative operations before enabling Stage 2 locally.

## Decision

Use option 3 inside AVE's existing local project-lock and cooperating-process
boundary.

Project Host is the only authority that creates, publishes, registers,
revalidates or compensates a Stage 2 immutable Original snapshot. The final
path is content-addressed under `originals/sha256/`. The mutable import remains
available only to support a new explicit authorization or rebuild a missing
snapshot; Material Pack, execution and execution-bound Render authority use
the exact immutable location row.

For a new snapshot, Host verifies that project-managed ancestors are ordinary
directories rather than symlinks or Windows junctions. It creates a private
temporary file exclusively at mode `0600`, retains that handle, copies through
open source and destination handles, normalizes the recoverable timestamp,
flushes the destination, and verifies the full Worker SHA-256/media probe. Path
and handle must identify the same regular, single-link file. Host then creates
the final name with a same-volume hard link that cannot replace an existing
entry, removes the temporary name, removes write bits and verifies the final
path, handle, stable file identity, stat and single-link count again. Existing
final files are reusable only after the same exact checks and full content
verification.

POSIX identity compares device plus inode and requires exact mode `0400`.
Windows compares the stable BigInt inode/file ID because path and handle device
values differ there, requires one link, and requires no write bit. Windows mode
hardening is not an owner-only ACL guarantee; the project directory's DACL is
the privacy boundary. A filesystem without stable identity or same-volume hard
links is unsupported for this authority and fails closed rather than falling
back to overwrite publication.

The prepared final handle remains open through the permission transaction. At
the transaction start, Host synchronously rechecks path-to-handle identity,
single-link count, stat and protection before atomically registering the
immutable row and exact permission alongside the mutable location decision. A
failure before commit removes a newly created file only when its identity still
matches. If an existing writable snapshot was tentatively protected, failure
restores that prior mode so an uncommitted recovery cannot become effective.
Cleanup or restoration failure is explicit, never best-effort or path-only.

Mutations for the same content-addressed asset are serialized within the Host
session. The existing project lock remains the cross-Host single-writer
boundary. Session close rejects new immutable mutations and waits for active or
queued mutations before closing Worker and SQLite ownership.

Execution-bound Render persists and matches the exact execution ID, Timeline
version, semantic graph, Preview/Master plan IDs and source identity. Before
work and before publication, Host revalidates the exact immutable row, full
content identity, current Contract and rights-policy edge. Contract successor,
permission rebound, writable/link/path drift, missing content or corruption
makes the execution or Render stale and fails closed. Desktop IPC projects only
public `original` and `proxy` media; `immutable_original` and unknown location
types remain Host-internal.

## Rationale

A content-addressed Project-owned file separates approved execution authority
from a mutable user import without inventing a new provenance class. Retaining
the handle closes the normal asynchronous gap between verification and SQLite
commit. No-clobber publication, stable identity and identity-bound compensation
prevent normal concurrent Host work from overwriting or deleting an unrelated
path. Dynamic policy and content checks prevent historical approval from being
presented as current authority.

Option 1 cannot freeze approved input. Option 2 still has path replacement and
cleanup ambiguity. Option 4 would provide a stronger hostile-local-process
boundary but adds platform-specific native ownership beyond this local product
stage.

## Consequences

Legacy mutable-only permission is insufficient for new Stage 2 material use.
A missing snapshot can be rebuilt only from a still-current mutable Original
through a new exact human authorization. An unsupported filesystem blocks that
authorization. Snapshot bytes consume project storage and follow Original
retention/deletion policy.

The protection model covers AVE sessions cooperating through the project lock.
It does not claim an OS sandbox against a non-cooperating process running as
the same user: Node path APIs cannot make the ancestor-check or unlink step
handle-relative on every supported platform. Such mutation is detected by
revalidation where observable and fails closed, but stronger adversarial local
isolation would require a future native filesystem boundary and threat-model
decision.

## Migration

No SQLite or Contract migration is required. Existing immutable rows are
revalidated dynamically. A legacy row whose file is absent or unsafe remains
stale; a current mutable Original may be offered for explicit reauthorization
and deterministic rebuild. Old render bindings without an exact execution ID
are projected stale and are not reused as current Stage 2 publication.

## Rollback

Rollback may disable new Stage 2 material authorization and execution-bound
Render, while preserving historical rows for audit. It must not silently
restore mutable-path execution authority, expose internal snapshot locations to
Renderer, overwrite an existing final path, or treat an old unbound Render as
current.
