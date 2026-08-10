---
evidence_id: EVD-20260805-WP-VLOG-002-PRECHECK
date: 2026-08-05
work_package_id: WP-VLOG-002
repository_commit: worktree-before-human-review
code_fingerprint: eff15adb26c2bc1cee301c4b407e02fa2463456caa84fc45e6b4dd14da7237f9
capability_ids: [CAP-TL-001, CAP-KF-001, CAP-XFORM-001, CAP-COMP-001, CAP-TIME-001, CAP-TRANS-001, CAP-COLOR-001, CAP-MASK-001, CAP-TEXT-001, CAP-AUDIO-001, CAP-RENDER-001, CAP-PRESET-001]
acceptance_ids: [ACC-001, ACC-002, ACC-003, ACC-004, ACC-005, ACC-006, ACC-007, ACC-008, ACC-009, ACC-010, ACC-011, ACC-012, ACC-013, ACC-014, ACC-015, ACC-016, ACC-017, ACC-018, ACC-019]
commands: ["pnpm run check", "pnpm run acceptance:basic-vlog:real-review", "dev-cli verify-project/inspect-project/migrate-project"]
result: machine_validation_passed_human_review_pending
environment: "Windows local checkout; CC BY 3.0 Wikimedia performance media and generated derivatives remain outside the repository; no media committed"
artifacts: ["C:/Users/24179/Videos/AVE-final-20260805-basic-vlog-v11/renders/preview.mp4", "C:/Users/24179/Videos/AVE-final-20260805-basic-vlog-v11/renders/master.mp4", "C:/Users/24179/Videos/AVE-final-20260805-basic-vlog-v11/REVIEW.json", "C:/Users/24179/Videos/AVE-final-20260805-basic-vlog-v11/SOURCE-ATTRIBUTION.md"]
remaining_risks: ["Human visual/audio review is pending; no commit, push or PR is authorized before acceptance."]
---

# WP-VLOG-002 machine precheck evidence

The fail-closed semantic hash mismatch was reproduced with real Chinese-caption media and repaired without weakening Worker identity validation. Host and Worker now use UTF-8 for JSON-lines, and FFmpeg/FFprobe subprocess output is decoded as UTF-8. A hostile inherited code page and a Unicode media path are automated regressions.

Encoded Basic Vlog checks repeatedly proved 9:16 pixels, loudness/true-peak bounds, Music attenuation and recovery after a shorter Dialogue source ends, and A/V boundary fades. The Project Host review path imported authorized local media by reference, used Timeline Commands, generated proxy-backed Preview and original-backed Master, passed QC, persisted an atomic Render Bundle, and survived close/reopen.

User review established that the earlier generated tone and source audio were not suitable for judging a real edit. A reviewed CC BY 3.0 live performance from Wikimedia Commons now supplies real singing, music dynamics and stage video. A short local narration creates an audible Ducking interval followed by a long recovery interval; attribution is copied into the review project.

The real AAC fixture exposed encoding peak rebound: the pre-encode `-1 dBTP` target became `-0.69 dBFS` after AAC and correctly failed QC. Normalization now retains 0.5 dB of internal AAC headroom while final QC continues to enforce the requested ceiling; the focused encoded regression requires that headroom. Visual inspection also exposed default black captions, so static captions now render white with a black border and the hostile-codepage test asserts that style.

The v11 review project is integrity `ok` at schema version 19. Master is 360x640 H.264/AAC, approximately 12.1 seconds, normalized to -14.37 LUFS with -1.27 dB true peak. The complete `pnpm run check` passed against this fingerprint. Human visual/audio acceptance remains open, so this remains machine Evidence rather than completion Evidence.

## 2026-08-10 automation revalidation supplement

The automation-only change at code fingerprint
`3c844a9406e93cde7572d3588152a639083cd71c185f802459b0eff7c07afe62`
was revalidated with the repository regression suite. It does not alter the
media, Project Host, RenderGraph, or acceptance conclusions recorded above.
