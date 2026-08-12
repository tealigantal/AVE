# WP-ADV-002 Advanced Family Real-Media Acceptance Suite

## User-visible outcome

The user receives eleven separate encoded acceptance videos for ACC-001 through ACC-011 in one repository-external folder, plus a plain-language index describing exactly what each video exercises and when. Automation verifies the formal authority path and objective media facts; the user performs the visual and audio acceptance.

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
- `docs/plans/2026-08-12-advanced-family-acceptance-suite.md`

## Dependencies

- WP-ADV-001
- WP-FND-001

## Allowed and forbidden paths

Allowed paths are the exact machine-readable list in `EXECUTION_MANIFEST.yaml`. Generated contracts change only through codegen. `docs/current/**` and `docs/DOCUMENT_INDEX.md` change only through `docs:sync`.

Forbidden paths are `apps/desktop/**` and `docs/archive/**`.

## Required behavior

- Each original ACC-001 through ACC-011 scenario is represented by its own committed Timeline, target-neutral RenderGraph and encoded verified-Original Master.
- The eleven retained videos share one external review folder and each has exact expected observations and timecodes in the index.
- Invalid tangent, crop, handles, optical-flow policy, tracking loss, matte/font/graphic/LUT assets, clipping and nested cycles fail closed without Timeline mutation or a successful bundle.
- Preview/Master semantics, project reopen, media identity and provenance remain authoritative for every case.

## Evidence requirements

Create immutable PRECHECK Evidence with the current fingerprint, exact commands, manifest digest, eleven output hashes, semantic identities and objective probes. Human acceptance is recorded only after the user watches the retained videos.

## Definition of Done

All focused and aggregate tests pass; eleven independent real-media Masters, machine reports and one index exist in a single external folder; the Draft PR contains the implementation and PRECHECK Evidence. The package remains active until the user reports the acceptance result.
