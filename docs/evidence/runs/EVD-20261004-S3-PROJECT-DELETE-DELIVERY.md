---
evidence_id: EVD-20261004-S3-PROJECT-DELETE-DELIVERY
work_package_id: WP-S3-PROJECT-DELETE-001
date: 2026-10-04
repository_commit: 13a3ce07fa9b4a7d8a7bf9a338497d9a0cc214de
code_fingerprint: 1efd3aa80ca7aea025cfe41604fe4f94e178e9dd12bf2e6bee87bc6377a2dd65
scope_fingerprint: f91edbf8df7e5fd2730653d4227e67fe0dc20cd24f590a35ea76a02529593ace
capability_ids: [CAP-S3-PROJECT-DELETE-001]
acceptance_ids: [ACC-S3-PROJECT-DELETE-001]
result: blocked
---

# Permanent project deletion delivered; global documentation gate remains blocked

User authorizes real deletion implementation, physical removal of old interfaces, existing container update, and no full test suite. This narrow independent package does not advance blocked P3 or overall P4, Stage Exit or Release. Existing changes preserved; no commit/push/merge, unrelated service change or user project deletion.

## Current behavior

One current project.delete command resolves an opaque recent id privately and asks irreversible confirmation. Active inputs must flush, productive operations drain, and Host closes its project before deletion. Storage checks identity, SQLite format, original/staging directory safety, exclusive lock and owned root entries. Only after preflight passes does Main durably persist delete_pending. Storage records exact staging ownership, holds the project lock across atomic rename and removes owned contents without following symlink targets. Marker remains until final cleanup. Recent reference is removed only after physical cleanup; interruption or final index-write failure is visible and explicitly retryable. Pending projects cannot reopen as intact projects.

Project directories include SQLite, media copies, objects, previews, renders, logs and temporary cache. External originals, independent exports, shared profile and other projects remain. Unknown files mixed into project root cause rejection rather than deletion. Old project.trash/project.restore handlers, dispatcher entries, recent setDeleted/deleted_at runtime reader, Renderer consumers, trash state and recycle-bin CSS/UI are physically removed. No compatibility aliases. Negative test references assert old registrations absent; historical Evidence is unchanged.

## Scoped verification

Assets are in ../assets/project-delete/.

- delete-checkpoint-final.log: Windows actual Main/Host/storage tests passed. Cancel, failed save, identity mismatch, live lock, root junction and foreign files preserve data. Preflight denial does not quarantine an intact project. Actual project/cache removal, interrupted staging cleanup, and physical-success/final-index-failure explicit retry passed; external originals and unrelated projects retained.
- typecheck-final.log, architecture-final.log and renderer.log: exit 0. Earlier failing logs retained; fixes followed concrete type/current-caller failures, assertions were not weakened.
- runtime-delete-final.log: final compiled container Host removed its own temporary project/cache; checkpoint called exactly once; external original retained; old handlers absent. Owned disposable fixture only.
- Live final public page: 8 recent projects and current delete buttons shown, no recycle bin. Actual irreversible confirmation scope shown, screenshot delete-confirmation-final.png; Cancel returned explicit preservation notice and retained all entries. Final destructive UI action on user works was not performed or claimed.
- No full pnpm check, broad regression suite or subjective acceptance claimed. docs:sync/docs:check final logs report global governance result. Formal work-package completion remains blocked on independently stale historical capability Evidence applicability; do not rewrite those records to make this narrow task pass.

## Current container identity and retained data

build-checkpoint-final.log successfully built the final source, input e0f46854325cc125dc07e3961ca03a284432c1bf2d16d6ed1ac8e28013df55dc.

- desktop: sha256:05a47a37805bcaa59eb0bc23618b4befefca44f287a86b6e51ad65f82a23c294
- whisper: sha256:e4c42abac47fb87397cd21081429ad449b2b99671023eaab3825acf4a1ff0ac2

Gracefully stopped idle desktop and recreated only existing desktop/whisper through the canonical compose plus GPU override, no down -v/remove-orphans/prune. final-build-identity.json records source/build/runtime identity. container-preservation.log and runtime-before/after.json prove all eight containers and mount sets retained; six unrelated identities/states unchanged.

One-time offline migration of known /config/ave/profile/recent-projects.json created exclusive exact-byte backup recent-projects.before-permanent-delete-20261004-7ce92f.json, removed five obsolete hidden flags and preserved all eight entry identities/paths/times/names. No project directories were automatically removed. index-migration.log records this separate data conversion; no old runtime field reader retained. Native indexes outside this served Docker stack were not migrated.
