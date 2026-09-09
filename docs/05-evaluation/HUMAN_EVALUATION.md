# Human Evaluation

## When human review is mandatory

Human review is required for story quality, creator identity, sensitive or
factual representation, picture/audio/pacing acceptance, subjective semantic
parity, licensed attribution presentation, and final delivery. Machine probes
remain mandatory for technical facts and cannot be waived by a favorable view.

## Review package

The reviewer receives the Creative Contract, intended audience/duration,
candidate or baseline comparison, encoded media, exact artifact identity,
decision explanations, declared blockers/fallbacks, QC summary, and a short
rubric. Do not reveal system identity during blinded comparison.

## Rubric

Use a 1–5 score plus reason and blocker for:

- story clarity and completeness;
- evidence/factual fidelity;
- creator voice and sensitive representation;
- shot choice, pacing, continuity, and omissions;
- captions, composition, and visual readability;
- dialogue, music, transitions, loudness, and listening comfort;
- usefulness of explanations and alternatives;
- perceived control, confidence, and willingness to continue or publish.

A blocking safety, rights, factuality, missing-content, or technical-semantic
failure overrides the average score.

## Procedure

1. Verify media opens and identity matches the review manifest.
2. Watch the complete Master under the intended conditions; do not score from a
   montage or marker-only clip unless that is the bounded artifact.
3. Score independently before group discussion.
4. Record exact timecodes, observation, expected outcome, and severity.
5. Resolve whether feedback is subjective preference, factual correction,
   capability blocker, or execution defect.
6. Retain accepted/rejected scope and artifact hash in Evidence.

## Stage 2 material-driven review entry

`pnpm run stage2:acceptance prepare <fresh-external-directory>` writes a Chinese
read-only review entry, material preparation instructions and an unfilled rubric.
`validate` checks `AVE_REAL_MEDIA_MANIFEST.stage2_case`; `run` additionally
executes the shared Host/Product preparation and real encoding. Existing
Pipeline and Product real commands require that same case; a missing
`stage2_case` is rejected rather than routed to a single-source workflow.
The Product real command then runs the retained automated Electron playback,
exact one-second feedback rejection and reopen checks on the generated
technical project. The optional synthetic material case exercises the same
native helper. Its mocked confirmations do not touch the separate `human-*`
projects and never establish direct-human acceptance. The current numeric UI
requires an eligible one-second suggestion for this automated journey; a case
without one is blocked at this interaction check, not silently accepted.
The TypeScript `MaterialCase` in `tests/integration/stage2-material-case.ts` is a
thin external test-input definition, not a product protocol. Private paths and
content remain outside Git. Six distinct hashes reject exact duplicates but do
not prove independent camera originals; a human must verify that provenance.

Freeze the per-run threshold before viewing: each applicable item needs at
least 3/5 (basically acceptable), with no unresolved blocker. Unused captions or
music packaging are N/A, never full marks. Record artifact, timecode, observation,
expected result and severity; accept, request repair/review, or reject are all
valid outcomes. Candidate choice is never predetermined.

Keep three layers separate: deterministic protocol regression; authorized
real-media automated precheck; direct human creative acceptance. The retained
synthetic single-source/60-second fixtures and native confirmation mocks establish only
their engineering coverage. `createStage2HumanReview` simulates an identity;
neither it nor a playback threshold proves human viewing or approval.

The shared run labels supplied candidate provenance and preserves two full
candidate outputs plus accepted-tail-trim before/after outputs, a separate
rejection/reopen record and source-aware interval measurements. It creates
fresh `human-*` projects with Story approval still pending, using the canonical
topology. Their Contract/Evidence/Direction preparation is explicitly automated,
not a new human acceptance. Open these projects in the existing Electron Product
to select and approve Story, generate/approve/execute Intent, render, review the
displayed range/extent change, accept one legal feedback revision, reject another,
and reopen. Real native confirmations must stay enabled. The report is read-only.

The main case must have content-grounded observations before Story planning,
12 or more meaningful Evidence choices, actual source-range differences in two
candidate dimensions, exact current Feasibility Beat count, unit-speed 120-second
first cuts and a content-safe tail with ending reserve and variance headroom.
Role budgets may differ from the default allocation only within existing bounds;
no fixed-window slicing, fabricated ASR, loop padding or implicit ripple.
The automatic checks decode complete files and intervals inside every clip,
later-half/tail and seams; source audio cannot silently disappear. Detailed
picture/freeze and listening judgments remain explicitly pending human review.
Missing authorized material blocks REAL-001 and its EXIT-002 dependency.

## Claim boundary

Acceptance applies only to the viewed artifact, scenario, source, and stated
capability boundary. One appealing combined video does not accept every
component family or unseen variant.
