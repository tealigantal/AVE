---
evidence_id: EVD-20261015-S3-ANIMATED-MEDIA-IMPLEMENTATION
work_package_id: WP-S3-ANIMATED-MEDIA-001
capability_ids: [CAP-S3-ANIMATED-MEDIA-001]
acceptance_ids: [ACC-S3-ANIMATED-MEDIA-001]
date: 2026-10-15
code_fingerprint: b05b83e122ba97a797771ec011fd4c7c7982a50764998410f361201915ecb747
result: passed_engineering
---
# Animated GIF and WebP implementation evidence

## Applicability

- CAP-S3-ANIMATED-MEDIA-001; scope_fingerprint: 8da5c570e091b8409cf1d78aa7cb54265891e52f2b99274c7d95a2fb65821c5a

## Executed verification

- `pnpm run stage3:mixed-media:test` passed after the final FFmpeg timestamp change. It ran static media and real import regressions, extensionless JPEG/GIF/WebP probes, unequal GIF/WebP frame timing, alpha preservation, worker sampling/scene scan, actual Host preview and Timeline edit, Preview/Master render, original SHA256 retention, and project reopen.
- `pnpm run worker:python:lint` passed; `pnpm run worker:python:typecheck`, `pnpm run contracts:check`, and `pnpm run typecheck` passed.
- `pnpm run stage3:check` and `pnpm run architecture` passed.
- The rebuilt Docker Compose desktop and whisper services both reported healthy. Inside the rebuilt desktop container, generated a transparent three-frame GIF with 70/130/210ms delays; `prepare_video` produced 410ms media with BGRA pixels and frame PTS exactly 0/70/200/410ms. Container FFmpeg is 5.1.9.
- Existing container volumes were retained. Test-generated files were confined to temporary directories and removed by test cleanup. No original media was deleted.

## Boundaries

One decoded animation play defines finite source duration; Timeline duration controls repetition. FFV1/Matroska BGRA derivatives are generated in temporary worker/job workspaces, and the immutable original remains the imported SHA256 asset. Timing outside the millisecond grid and non-positive delays fail closed. Automated Host tests are not a claim of manual UI acceptance, P4 acceptance, Stage Exit, or whole-project completion.

`pnpm run docs:check` was attempted after synchronization. It reported pre-existing evidence-applicability findings across unrelated historical capabilities. The new package capability's scope fingerprint and current programme latest-evidence fingerprint both match; historical Evidence was not rewritten.
