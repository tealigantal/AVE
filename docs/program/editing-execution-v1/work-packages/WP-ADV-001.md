# WP-ADV-001 Advanced Real-Media Showcase

## User-visible outcome

The user receives a real encoded advanced Vlog Preview and verified-Original Master that visibly combine animated transform, layered composition, time remap, two-input transitions, color, masks, animated text/graphics and multi-track audio. The user, not automation, performs the final creative acceptance.

## Capability IDs

- CAP-TL-001
- CAP-KF-001
- CAP-XFORM-001
- CAP-COMP-001
- CAP-TIME-001
- CAP-TRANS-001
- CAP-COLOR-001
- CAP-MASK-001
- CAP-TEXT-001
- CAP-AUDIO-001

## Specifications and plan

- `docs/specifications/editing-execution-v1/TIMELINE_MODEL.md`
- `docs/specifications/editing-execution-v1/AUTOMATION_CURVES.md`
- `docs/specifications/editing-execution-v1/TRANSFORM_AND_COMPOSITING.md`
- `docs/specifications/editing-execution-v1/TIME_REMAP.md`
- `docs/specifications/editing-execution-v1/TRANSITIONS_AND_EFFECTS.md`
- `docs/specifications/editing-execution-v1/COLOR_PIPELINE.md`
- `docs/specifications/editing-execution-v1/MASK_TRACKING_AND_REFRAME.md`
- `docs/specifications/editing-execution-v1/TEXT_GRAPHICS_AND_CAPTIONS.md`
- `docs/specifications/editing-execution-v1/AUDIO_PIPELINE.md`
- `docs/plans/2026-08-12-advanced-real-media-showcase.md`

## Dependencies

- WP-FND-001
- WP-VLOG-002
- WP-PRESET-002

## Allowed and forbidden paths

Allowed paths are the exact machine-readable list in `EXECUTION_MANIFEST.yaml`. Generated contracts change only through codegen. `docs/current/**` and `docs/DOCUMENT_INDEX.md` change only through `docs:sync`.

Forbidden paths are `apps/desktop/**` and `docs/archive/**`.

## Required behavior

- The formal committed Timeline and RenderGraph execute every advanced operation claimed by the review edit.
- Preview and Master share target-neutral semantics; Master uses only currently verified Originals.
- Advanced objects and provenance survive close/reopen, and invalid inputs fail before Timeline mutation or successful bundle publication.
- Encoded evidence includes objective timing, frame/pixel, stream and audio measurements. Subjective quality is reserved for user acceptance.

## Tests and acceptance

The focused lanes are `pnpm run acceptance:advanced:synthetic` and `pnpm run acceptance:advanced:real`. Original advanced family acceptances ACC-001 through ACC-011 remain authoritative; ACC-034 owns the combined real-media showcase and user review.

## Evidence requirements

Create immutable PRECHECK Evidence containing the code fingerprint, exact commands/results, media-manifest digest, output hashes, semantic identity and objective measurements without local paths. Create COMPLETE Evidence only after user acceptance and after every claimed original acceptance is actually satisfied.

## Failure conditions

- Any declared review operation is silently omitted, approximated without a declared policy, or performed outside the formal Host/RenderGraph/Worker path.
- Preview/Master semantics differ or Master uses Proxy/unverified media.
- Failed edits or renders mutate Timeline authority or publish a successful bundle.
- A synthetic test or agent visual opinion is substituted for the user's creative approval.

## Definition of Done

The advanced synthetic and real lanes pass, the retained encoded outputs and edit sheet are available to the user, full repository gates pass, immutable PRECHECK Evidence exists, and one Draft PR is pushed. The package stays active until human creative acceptance; broad capability statuses remain honest if the showcase implements only bounded subsets.
