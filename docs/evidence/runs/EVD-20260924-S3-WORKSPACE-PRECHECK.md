---
evidence_id: EVD-20260924-S3-WORKSPACE-PRECHECK
date: 2026-09-24
code_fingerprint: 3be884a69d7cdfe55dc99a505ab6dfd1fb8cce7c0a76e76bee372e4648120e4c
repository_commit: 3521aa8a5d019fb49dd486a11a424bc937857db1
result: targeted_workspace_pass_full_gates_pending
---
# Persistent workspace and literal-text validation

A newly registered Host helper projects validated persistent records without
raw model context, sampling bytes, local paths, QC diagnostic messages or old
profile bodies. Adoption choices carry their actual historical transition ref;
drafts retain exact execution/edit identities and independent render/QC summaries.
One profile queue state supplies consent, active principles, correction predecessor
result digests and exact registration/exclusion states. Project extraction is
separate from profile registration; forgetting does not reconstruct principles
from historical project output. A profile await is followed by Host session and
project-snapshot checks. Reads never send, learn, adopt or mark viewed.

Targeted tests passed: stage3:workspace:test, stage3:profile:test,
stage3-learning-host, stage3-manual-draft-host, direct TypeScript, architecture,
timeline:host:test, undo-redo:test, timeline-redo:test and basic-vlog-toolkit:test.
Manual testing uses actual encoded synthetic media, independent WAV, Preview/
Master and QC, with controlled model replies. Workspace tests use real SQLite
records and deliberate failure/race injection; they prove no real-model semantics.
Both reviewers were read-only, inspected the final focused changes and reported
no remaining blocker; they did not independently execute tests.

A real regression was reproduced first: literal caption text 1n was converted
into bigint by the old generic Host reader, causing caption.text.trim failure
on the next manual edit. The fixed reader restores only typed timing slots and
preserves captions, words, IDs, string keyframe values and custom metadata.
The same actual-media manual path now passes including render and reopen.
Original and fixed OS TEMP logs (SHA-256):
- ave-stage3-literal-original-20260924.log: a89204e3b6c1aac7bd32d64a9f3c2b779635946b4fb613f24b6e5536c9260c3f
- ave-stage3-literal-fixed-20260924.log: 19e0e66e83bfc7f3a68afdd40b2e3333e7cd2fd9d283cf74f477e97b45af60ec
Other development failures: tsc first omitted the repository config; the new
storage export needed the existing runtime-boundary export declaration; the
first workspace fixture lacked its imported asset. Each was corrected before
rerunning. No effective test assertion was removed. The allowed-path audit
found 170 changed paths and none outside the active package.

Current full gates are still pending. Desktop still exposes its old Stage2
product workflow and fixed topology; replacing those consumers, safe IPC data/
errors and persistent input/player state is required. Actual provider counting/
tariff configuration and approved source/learning/design/data/cost inputs are
also outstanding. No external model call, private upload, real work/recording,
commit/push/PR, merge or release. The package stays active, Stage3 stays specified,
and no candidate, acceptance row or Stage Exit is promoted.

Engineering applicability bindings, without status promotion:
- CAP-RENDER-001; scope_fingerprint: bacb20bfb41dc0cd6d8cd4bcd8ec215daca9d2d7ade6f4bfd68473e4af7558e8
- CAP-PRESET-001; scope_fingerprint: 5ac65e9fcbb284ef0cef072be32997a228eefc10aa3b3575c31a95d6e5d908b6
- CAP-FND-001; scope_fingerprint: 41b85319e6a9760f51e389d12eb477791222e9e5e5eb0950d53a25c4faa2f02b
- CAP-CA-GOV-001; scope_fingerprint: 48d833c6e12eedbb46e6456f2cc7d3c5c66f1ddd1ff743d4d583a3b113306e97
- CAP-CA-CONTEXT-001; scope_fingerprint: c10382baf466f4ddf8f030ea54c38b30c0b35e7dd6cf7d5da465bc428318eac2
- CAP-CA-SKILL-001; scope_fingerprint: e65028b20627af947c90e1e76fc0ee2e461bfb0e0d8b3ed630d23d4e051491a7
- CAP-CA-DURATION-001; scope_fingerprint: d885aab9393c0c29f7ced2fff85fcc27bbf9e7fbd2d898451c0102d5db294fcb
- CAP-CA-STORY-001; scope_fingerprint: a2679160c1e1af9c4f8307c6a0d7131bb2565bd85eba7b9d05b333abd3a03ecf
- CAP-CA-PERMISSION-001; scope_fingerprint: f61a4f06235fe95be88338b093bb489cd16aa3ec5b701bca8f92fc907d6edf71
- CAP-CA-PIPELINE-001; scope_fingerprint: fbc998bd632036211acb20d3fbde0446408edd7a133635f1e404a1d13c18d6f2
- CAP-CA-FEEDBACK-001; scope_fingerprint: 885c26e08656e6388e8540a4eb8059ad6c047e8a483b7e976e0d5f438b11739a
- CAP-CA-PRODUCT-001; scope_fingerprint: 6afc8880ff3adbb2a10309c6557b4460356881127c0f87009cb16fdef83b00cf
- CAP-CA-PRODUCT-002; scope_fingerprint: c992826a1ae5861f16bcf6d3ded157766c2e685be6b4dbf4ddca8f0955602539
- CAP-CA-UX-001; scope_fingerprint: ae5c4a0d5d8d28cb0da8d8fb4ec818413c74255ab24d2e7ff7654a6e9bb5f061
- CAP-CA-EXIT-001; scope_fingerprint: 290df79635cd990dc6ecc6fd843714f6ed219048650ff3d4bb7ae8187ce6ea51
- CAP-CA-GOV-003; scope_fingerprint: 33eb92acf8555b0865735744f099ac09feeb683e02fa73a802e63419940eb49d
- CAP-CA-GOV-002; scope_fingerprint: cde84d6a6f2ce54440168c1813f8e0a9399769ed91d42afd55b1999aec220b00
- CAP-CA-SEC-001; scope_fingerprint: ba8ef779118d97220ba7c39ba0d752beda282a858eebd75f42bceac07f19bbe3
- CAP-CA-RECON-001; scope_fingerprint: d3f9bf4d015778da8450ca4e4cb29517ca9369861c22c867efdc1a898ba3d55b
- CAP-S3-FIRST-LOOP-001; scope_fingerprint: 21750fc05ae485697c3e949a0ca0f599d462521d613f07f19d08a0a08f9edaba
