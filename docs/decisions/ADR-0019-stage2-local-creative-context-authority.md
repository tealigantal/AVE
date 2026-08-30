# ADR-0019 Stage 2 local creative-context authority

- Status: Accepted
- Date: 2026-08-23

## Context

Stage 2 requires richer versioned editorial context than current flat v1
Contract/Evidence records. It changes contract compatibility, project
persistence and approval lifecycle but must not introduce a second writer,
autonomous service or direct Timeline authority.

## Considered Options

1. Mutate existing v1 schemas and rows in place.
2. Store intelligence state in a new service or Renderer state.
3. Add versioned schemas/adapters and content-addressed project objects owned by
   Project Host.

## Decision

Use additive Creative Contract v2 and Material Evidence Pack v1 schemas with
explicit v1 readers/adapters. Project Host owns draft/approval/supersession,
pack assembly, immutable registration and staleness. Project Storage adds only
additive refs/migrations; feature/core code remains pure. Model Gateway and
Worker return candidates and never approve or write project state.

## Rationale

The decision follows the existing single-writer, Contract, object-store and
versioned approval architecture and keeps later Story/Intent inputs reproducible.

## Consequences

Every derived artifact pins exact Contract/Evidence versions and digests.
Approval is actor/digest/version bound. Missing, conflicting, stale,
unauthorized or unavailable evidence blocks downstream work while Timeline
remains unchanged.

Contract successors must be exactly `current head + 1` and pin the previous
head digest. A Pack fingerprint includes optional expiry and Timeline binding;
idempotency never precedes current-state checks. Project Storage retains the
immutable Pack object while its registration may become stale, and Project
Host derives additional stale reasons from current Contract, Timeline,
Evidence, expiry and verified Original facts. Private paths never enter Pack
payloads.

Import verifies identity but does not imply usage permission. Project Host
records a separate explicit material-permission decision bound to asset,
location, actor, time and the exact Contract rights-policy ref. `authorized`
requires exact SHA-256 verification of the current Original bytes through the
asynchronous Worker boundary; size/mtime alone are never identity evidence and
the Project Host main thread never reads a whole media file for this check.
Dynamic Pack listing reuses one verification per asset location within the
call, while a Host-owned permit limits exact identity work to two concurrent
Worker jobs across record, assembly and dynamic read/list. Policy rebinding
makes an earlier Pack stale.

## Migration

Existing v1 records remain readable and immutable. A v1 Contract is explicitly
adapted to a v2 draft; no historical row is rewritten. New tables/refs use an
additive migration under normal project backup/reopen rules.

## Rollback

Disable Stage 2 Host use cases and retain stored versioned objects as unread by
older code. Existing v1 Evidence, Story and Timeline paths continue unchanged.
