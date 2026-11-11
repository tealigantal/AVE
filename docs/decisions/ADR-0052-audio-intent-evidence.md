# ADR-0052 — Evidence-bound initial audio intent

Date: 2026-11-08. Status: implementation and validation in progress.

## Context

An initial creation requested environmental sound and interview speech. An authorized interview source was observed and included in planning context, yet the model produced no independent audio and chose video segments whose audio was digital zero. Graph-execution QC warned about silence, but could not infer that the independent interview was required by the request.

## Decision

New initial-draft planning roots use a versioned audio-intent projection. The planning model interprets the request and reports required, not requested, or ambiguous audio, binding any asserted requirement to the original request text and authorized observation or transcript evidence. Authorization or the presence of an audio file alone does not establish an intent to use it. Ambiguous or unsupported intent fails explicitly rather than silently choosing or inventing sound.

For a declared requirement, the Host verifies the cited evidence against the actual selected source intervals and simulated Timeline audio participation, routing and gain before commit. Planning and historical proof reconstruction use the same version-bound checks; old roots retain their original interpretation. Existing render QC remains a separate verification of execution and cannot prove subjective sound quality or complete semantic understanding.

Model interpretation can still misunderstand a user's request; evidence binding does not prove full natural-language comprehension. In particular a false `not_requested` classification is not reliably detectable by this projection. Current audio observations do not provide interval-bound proof of non-silence, so an explicitly interpreted ambient or generic source-audio requirement fails as insufficient evidence; this is an unimplemented capability, not successful environmental-sound validation. A certain transcript can establish speech evidence, while actual sound and listening remain separate checks. No audio source is automatically inserted and no claim is made that permission, a nonzero signal or a technical QC pass alone proves the creative request was fulfilled.

## Verification

Tests must cover explicit, absent and ambiguous requirements, request/evidence/source binding, actual allocated intervals and routing, historic roots, and fail-closed cases. Real audio output and user-facing behavior remain separate validation.
