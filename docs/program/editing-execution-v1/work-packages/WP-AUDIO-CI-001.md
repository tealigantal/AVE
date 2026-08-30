# WP-AUDIO-CI-001 Deterministic Ducking Tail Preservation

## Outcome

Preserve the complete Music tail after Dialogue/Narration ducking and make the
same semantic graph produce deterministic audio rather than a randomly early
compressor EOF followed by silent duration padding.

## Scope

- Normalize both `sidechaincompress` inputs to the same exact-duration,
  fixed-sample frame boundary before compression.
- Preserve the exact Timeline sample count without adding an out-of-range final
  frame.
- Keep the final duration bound as defense in depth, while proving that it does
  not hide an early-silent Music tail.
- Strengthen encoded-media acceptance to inspect fixed late recovery windows
  and repeated output hashes for the same execution plan.
- Select `worker-media@v3` only for graphs with enabled Ducking, while keeping
  unaffected graphs on `worker-media@v2`; bind the same rule in Host, Worker,
  capability snapshot, cache key and Contract validation.
- Fail closed on a legacy v2 Ducking plan and prove that a v3 render uses a new
  plan/cache/output identity when a legacy bad output already exists.
- Report r13 provenance only for v3 Ducking execution; retain r12 provenance on
  the unchanged v2 track so old non-Ducking Render Bundles remain idempotent.
- Reuse an exact completed immutable Render Bundle before media-render Worker
  submission, after fresh source verification and revalidating any Stage 2
  execution binding and every stored
  plan/result/output identity; retries must not create new jobs or rows.
- Recompute source fingerprint and probe facts from the current bytes before
  Bundle reuse instead of trusting a path-only completed Job.
- Give every user-triggered import/relink/proxy inspection a fresh persisted
  Job invocation identity; render-time checks remain ephemeral and write no Job.
- When a legacy completed render Job has lost metrics, require the fresh Worker
  result to match every persisted output ref before publication.
- Validate fresh Worker metrics against the exact plan/cache/output and require
  v2/r12 or v3/r13 provenance before creating any Result or OutputManifest.
- Verify Bundle object/content hashes, canonical object-store output paths,
  exact stored graphs/source refs and adapter-specific Worker provenance.
- Canonicalize authoritative source refs by asset identity so caller argument
  order cannot create a second publication payload for the same plan/cache key.
- Bind Stage 2 execution approval into publication provenance so an unbound
  render can share media plans but can never satisfy an exact approved render.
- Reconcile editing and creative-assistant status at one shared fingerprint
  without promoting any broader audio capability.

## Non-goals

- No new bus graph, envelope, sidechain, mastering, Timeline, storage, desktop,
  dependency, or capability scope. The Project Host change is limited to fresh
  render-source identity, exact Job/Bundle retry, and publication identity.
  Contract shape and schema versions remain unchanged; only the governed
  adapter-version domain widens.
- No retry-based CI workaround and no relaxation of attenuation, floor,
  recovery, duration, or A/V synchronization assertions.
- No private real-media claim and no PR merge authorization.

## Design decision

FFmpeg `sidechaincompress` consumes the minimum currently queued sample count
from two independent input FIFOs and forwards input status. Equivalent audio
whose upstream frames arrive with different boundaries can therefore terminate
the compressed Music stream early; the graph's final `apad` then preserves the
container duration by inserting silence. Put `asetnsamples=n=1024:p=0` after
the exact-duration pad/trim on both compressor inputs. This gives both FIFOs the
same frame boundaries, leaves the final short frame unpadded, and preserves the
exact sample domain before the existing output duration bound.

Because the changed filter realization can produce different bytes for the
same semantic graph, reuse of the legacy v2 cache identity would collide with
immutable outputs and atomic Render Bundles. Select adapter v3 exactly when an
enabled `timeline.audio_mix` node can invoke Ducking; retain v2 otherwise so
unrelated approved Stage 2 plans and caches do not rebound. Worker independently
derives the same version and rejects a v2 Ducking plan before compilation.
Worker provenance follows the accepted adapter track: v2 keeps r12-compatible
bundle content, while v3 records the corrected r13 realization.
Project Host treats the completed atomic Bundle as the retry authority once the
current plans and bundle key are known. Every user import/relink/proxy records a
fresh inspection under a unique invocation identity, while render-time lookup
obtains an ephemeral fresh Worker fingerprint and probe for every
Original/Proxy. A same-path same-length file replacement therefore cannot
inherit path-only Job results, and replay itself adds no Job or publication row.
Host fails closed on incomplete, stale or hash-mismatched stored content and
only reconstructs a result when the Bundle object/content hashes, both targets,
content-addressed outputs, graphs, source refs, plans, provenance and output
manifests exactly match the current request.
When publication provenance differs but a legacy persisted Job only retained
outputs, Host re-executes the immutable Worker task to recover complete metrics
and requires that fresh result to exactly equal every persisted output ref,
then binds metrics back to the plan/cache/output and adapter-specific Worker
version. It never publishes changed bytes, forged provenance or `unknown`
provenance under the same plan/cache identity.

## Validation

Run repeated audio-only diagnostics, the encoded Basic Vlog acceptance with
same-plan hash and late-window checks, Worker render suites, Python lint/type
checks, complete repository and synthetic acceptance, documentation gates,
allowed-path audit, independent review, and exact-head remote CI/review
verification.
