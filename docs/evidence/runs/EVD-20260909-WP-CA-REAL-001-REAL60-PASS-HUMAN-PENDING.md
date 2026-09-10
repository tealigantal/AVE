---
evidence_id: EVD-20260909-WP-CA-REAL-001-REAL60-PASS-HUMAN-PENDING
work_package_id: WP-CA-REAL-001
repository_commit: 743c6e0690ba052c8919084078b1704ba7f3ff85
code_fingerprint: 4cf79e9074dd00348f442f17dc0e8c7440439789742f9eccad906908dc10232c
date: 2026-09-09
result: bounded_real60_technical_pass_human_pending
---
# User-selected real-source redo

The user rejected synthetic viewing copies and explicitly selected the existing input directory. A single 65-second actual performance source was hashed and visually sampled every five seconds. Existing attribution declares CC BY 3.0; this is not independently revalidated license provenance. Observations are system visual samples, not ASR, human-reviewed annotations or autonomous semantic understanding. Source SHA-256: 60a2244d40c28ad7a6c9da1e37d24ecb163696bd3118ca8e3b451cc1f0f3592c. Private media and local paths remain outside Git.

The shared MaterialCase/Host runner now explicitly selects current duration-60s-v1 for this bounded review. No legacy manifest fallback, duplicate source padding, direct Timeline writes or alternate final compositor was added. Two-minute main cases retain six independent hashed originals. Actual A uses source 5–65 seconds; B uses 1.5–61.5 seconds. Both remain chronological with original synchronous audio. A accepted tail trim changes source end 65 to 64 seconds, giving 59 seconds. These are two continuous windows, not proof of rich multi-source story editing.

First attempt B at source zero was correctly rejected by existing SILENCE QC. Direct silencedetect showed source silence from zero to approximately 1.399 seconds. B was moved to 1.5 seconds; no QC waiver or audio synthesis was introduced. Failed-run data stays isolated in engineering diagnostics.

## Executed checks

MaterialCase tests (60-second positive, six-source 2-minute guard, unsupported blueprint, exact total, feedback variance), typecheck, full pnpm run check and acceptance:final:synthetic passed. Process-local PYTHONUTF8=1 accommodates the user's Unicode output location. Real stage2-product-workspace:real passed: three complete Preview/Master records, full decode, interval/seam/source-audio comparisons, canonical Product accepted/rejected feedback, stale and permission denial preservation, and separate human-project preparation. Electron playback/rejection/reopen passed: 59 second Preview; current binding; persisted rejected feedback. Read-only independent agent review found no blocker; unused blueprint export was removed and review instructions now derive revised duration.

Automated playback is not human listening or acceptance. Human sheets remain blank. Subjective pacing, music cut quality and story usefulness require direct viewing. REAL-001 returns to blocked; DEBT-CA-STAGE2-003 and DEBT-CA-REAL-001-TEST-DESIGN remain active; EXIT-002 remains pending. No capability status was promoted and docs:complete was not invoked.

The previous synthetic viewing videos and entry were deleted and replaced with actual-source copies. Recursive deletion of the old technical run was rejected by automatic tool policy (blocked by policy); it remains external and is not presented as current review.

## Portable outputs

```json
[
  {
    "candidate": "a",
    "label": "before",
    "master_sha256": "23650d2684e06269411e48bc04e8d56851704150e34663805278d84154ea7e97",
    "preview_sha256": "23650d2684e06269411e48bc04e8d56851704150e34663805278d84154ea7e97",
    "duration": "60.000000",
    "qc": "passed",
    "checks": 110,
    "timeline_version": 1
  },
  {
    "candidate": "a",
    "label": "after",
    "master_sha256": "1dbf77f4d05536cc078bc4fa20ffddd8c79eebdc755ce4f43c39a238f4ddce99",
    "preview_sha256": "1dbf77f4d05536cc078bc4fa20ffddd8c79eebdc755ce4f43c39a238f4ddce99",
    "duration": "59.000000",
    "qc": "passed",
    "checks": 110,
    "timeline_version": 2
  },
  {
    "candidate": "b",
    "label": "before",
    "master_sha256": "b6327547ac9723b88c3345f21235e6ec0949768021ed70c8b2683797bf18977d",
    "preview_sha256": "b6327547ac9723b88c3345f21235e6ec0949768021ed70c8b2683797bf18977d",
    "duration": "60.000000",
    "qc": "passed",
    "checks": 110,
    "timeline_version": 1
  }
]
```

## Current technical applicability

Full regression refreshes technical scope only and retains historical acceptance limits.

- CAP-RENDER-001; scope_fingerprint: c3c3f0018236db19440ddff0b25944078f0110ed19fe57367fff15e24806a2fb
- CAP-PRESET-001; scope_fingerprint: dd0f6d77c5da9562b3e5e6590b0fd1cea765e35cab6f4610e48f9647879d1ab5
- CAP-FND-001; scope_fingerprint: f0b7faba5a639356008aad76444702165b9d08874898388914415ded88dd1345
- CAP-CA-GOV-001; scope_fingerprint: b7a95f322b1c6a4c8b19d86ef1170c5649a32ea36896b8c44667cda3f3f79f98
- CAP-CA-CONTEXT-001; scope_fingerprint: 54cb697a931fdd8382ce8b63a78b52c59dafbb50d6a61ea38eb4a69bc6fcd3c5
- CAP-CA-SKILL-001; scope_fingerprint: e72ea291d8eb2a6b523921cfc7fa6293f0e48700ba6a2ab546a42af012eee027
- CAP-CA-DURATION-001; scope_fingerprint: e45e91ff642ab8b09dbda63bf08e29cb2d236ae5c63f8cd1b8734a1b37474ae3
- CAP-CA-STORY-001; scope_fingerprint: c5752c61eb64b3f778cb06b6cd0779a15e69f5864ab1ab1fd693520eefba38f5
- CAP-CA-PERMISSION-001; scope_fingerprint: 13eef4a28ef09e67e641e93712db22fcb807fb0ae745f9199216fee7650abef9
- CAP-CA-PIPELINE-001; scope_fingerprint: bf2502340f5dce659fac252e5e670485433cd09793b1d8a45663265a88459f83
- CAP-CA-FEEDBACK-001; scope_fingerprint: 6967f4e1ce326e3b426fa2d01dff83eaa46215296bc2b00e6417b99fecb32fa8
- CAP-CA-PRODUCT-001; scope_fingerprint: 367c4448e624757fcd32b095ad09fdf372b0c95444a897711d00577aa0ac93e9
- CAP-CA-PRODUCT-002; scope_fingerprint: b4059f4ebfe015ba5a9b9bb193d2b59b9fa3791c60c9ea4a506dd58e966bc242
- CAP-CA-UX-001; scope_fingerprint: 3b7c44bc6962630b6b39c0175e58e52ddad1ef0b2f308ba2fa1440ca50cf37de
- CAP-CA-EXIT-001; scope_fingerprint: f86a77b9f334f75248be74ffd0dfd7f720b9c9b5de019e0fd06e52ae7b88cd80
- CAP-CA-GOV-003; scope_fingerprint: 33eb92acf8555b0865735744f099ac09feeb683e02fa73a802e63419940eb49d
- CAP-CA-GOV-002; scope_fingerprint: cde84d6a6f2ce54440168c1813f8e0a9399769ed91d42afd55b1999aec220b00
- CAP-CA-SEC-001; scope_fingerprint: abb2879f1424e3dfdcc096630fdf4e6f8b3c011484ddb354d9317f0d54e93000
- CAP-CA-RECON-001; scope_fingerprint: d0e03348969e73ffd0bb675bc8e950ad4c91014bc1725c01f3e869819b15b104
