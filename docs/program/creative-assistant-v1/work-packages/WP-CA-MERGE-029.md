# WP-CA-MERGE-029 Approved Story and first-cut integrity closure

## Outcome

Make an approved Story's exact Beat count and Beat durations authoritative at
both Story approval and semantic Timeline compilation. Product-generated Story
candidates must contain exactly the Duration Feasibility's planned Beat count,
while the v1 evidence-selection compiler must either preserve every approved
Beat at unit speed or reject before any Timeline or authoritative write.

## Scope

- Require Story evaluation and defensive approval to bind the same current
  Duration Feasibility and to reject any candidate whose Beat count differs
  from `planned_beat_count`.
- Split Product role allocations deterministically into exactly the planned
  number of strictly positive RationalTime Beat budgets while preserving every
  role total and the global total.
- Reuse the Duration module's deterministic role allocator for Product material
  segmentation so current Product-generated Evidence can match those budgets
  without duplicating allocator authority.
- Give Product Story generation its own versioned template identity and mark
  legacy Product Story candidates stale rather than conflicting or appearing
  current.
- Require semantic Intent compilation to cover every approved Beat and prove
  that each Beat's selected Evidence durations sum exactly to its approved
  target under unit-speed RationalTime semantics.
- Reject insufficient source duration, missing Beat coverage, implicit retime,
  loop, freeze, fill or approximate timebase mapping before authoritative
  mutation.
- Bind approved Material Evidence Packs and semantic rendering to the
  Project-owned immutable Original snapshot so later changes to a mutable
  import path cannot rebind an approved execution, while corruption of the
  immutable snapshot still fails closed.
- Require Product first-cut generation to use a disabled source/reference
  track and one empty active output track. The compiler must reject existing
  render-active content, non-neutral output state and enabled solo state rather
  than silently append to, replace, hide or mute the approved Story.
- Reject operation ranges and `preserve_audio` parameters because the current
  approved Evidence input cannot prove either semantic promise.
- Treat a legacy mutable Original permission without a current Project-owned
  immutable snapshot as requiring fresh material authorization. Publish the
  immutable file read-only before registering it and compensate every failure
  between file preparation and the atomic storage commit.
- Bind the Product workspace digest to visible Evidence identities and status,
  and filter internal or unknown media-location types at the desktop IPC
  projection boundary while retaining the Host's complete internal catalogue.
- Add focused core and Host regressions, preserve the existing downstream
  execution/recovery coverage with an adequate deterministic media fixture,
  and reconcile capability truth after invalidating the earlier mismatched
  real-media acceptance evidence.

## Non-goals

- No automatic speed change, TimeMap, loop, freeze-frame, black fill, invented
  media, or silent source-range truncation.
- No Contract/schema, generated Contract, SQLite schema, storage ownership,
  permission policy, Renderer, Worker, renderer UI or dependency change. The
  desktop IPC change is limited to an existing public media projection.
- No broad Duration capability promotion; its allocation behavior is reused and
  compatibility-tested without changing its contract.
- No claim that synthetic repair evidence restores real-media or human Product
  acceptance, and no PR merge authorization.

## Design decision

`select_evidence` authorizes only exact evidence selection. It does not
authorize retiming or content synthesis. The compiler therefore aggregates all
selected source ranges per approved Beat, requires complete Beat coverage, and
compares the exact unit-speed source duration with the approved RationalTime.
Only then may it emit the existing add-clip commands into one empty active
output track. Source material remains on a disabled reference track, so no
existing clip is deleted, moved or implicitly replaced and the final
render-active Timeline extent equals the approved Story.

An empty output track is not sufficient if its track state can still suppress
or alter rendering. One shared destination predicate therefore rejects active
content, locks, mute, solo, non-unit opacity, non-normal blend, effects,
transitions, keyframes, automation and audio routing; it also rejects enabled
solo state elsewhere. Product review and semantic compilation use that same
predicate. Optional operation fields without a defined, Evidence-provable
mapping are rejected rather than ignored.

Material authorization now covers both the mutable import location and its
Project-owned immutable snapshot. Legacy authorization without that snapshot
must pass through a new explicit material review. Project Host holds an
exclusive temporary-file handle while copying and verifying, rejects linked or
multi-link paths, publishes by same-volume no-clobber hard link, removes write
bits, and retains the final handle through the atomic permission transaction.
The transaction rechecks the exact file identity, single-link count, stat and
protection state before writing. Compensation is bound to the created file
identity, so it neither deletes a later replacement nor silently ignores a
failure to remove the owned object.

The snapshot hardening assumes the existing project lock and cooperating AVE
processes; it is not an OS sandbox against another process running as the same
user. POSIX mode `0400` is exact, while Windows supplies read-only write-bit
hardening rather than an owner-only ACL. The project directory's access policy
remains the privacy boundary. Filesystems without stable file identity and
same-volume hard-link support fail closed as unsupported. Render authority
binds the exact execution ID, immutable location row, content identity and
current rights policy, and rechecks them before work and before publication.

The workspace token binds every Product-visible Evidence identity, including
its current digest and lifecycle state. Internal `immutable_original` rows are
kept available to Host and render ownership but are excluded, together with
future unknown location types, from the public desktop media projection.

`planned_beat_count` is a persisted feasibility decision, not a display hint.
Product generation allocates one Beat per role, then repeatedly splits the role
with the longest current average Beat until the planned count is reached.
Integer RationalTime remainder is distributed deterministically and all role
and total sums are rechecked exactly. A Product-only Story template version
invalidates the former one-role/one-Beat candidates without needlessly
invalidating generic Directions.

The earlier accepted Pipeline and Product artifacts compiled only a fraction of
their approved Story duration. They cannot remain acceptance evidence after
this invariant is enforced. Their status is therefore reduced to tested and an
active Debt records the authorized real-media and human revalidation exit
condition. This is programme truth correction, not a capability regression.

## Validation

Run Duration, Story, semantic compiler, Pipeline, permission and Product suites;
contract drift, type, architecture and documentation gates; the complete
repository check and synthetic final acceptance; allowed-path audit and
independent P0/P1/P2 review. After completion, push one exact head, verify that
head's remote `security` and `check` jobs, refresh every review thread, and
resolve only findings demonstrably closed by that head. Do not merge.
