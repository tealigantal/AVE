---
evidence_id: EVD-20260924-S3-DESKTOP-LIFECYCLE-PRECHECK
date: 2026-09-24
code_fingerprint: 029314d0e58a42b72bcead8606da5d21bf4c5206111562c3b39590cbfc8a01a6
repository_commit: 3521aa8a5d019fb49dd486a11a424bc937857db1
result: targeted_desktop_lifecycle_pass_regressions_pending
---
# Desktop operation and resource lifetime

Main now owns one persistent local ProfileRepository and injects it into Host.
Every entered IPC handler is tracked to its actual completion. Native-dialog
waits alone can be detached after invalidation; late resolve/reject cannot re-enter
Host. Project changes invalidate session generations, including reopening the same
project. Transitions exclude their own handler from drain; quit prevents a queued
transition from opening a new project. Admission closes before producer drain,
Host close and profile close. Failure preserves the cause and requires explicit
retry. Main startup installs the quit barrier before fallible registration.

Storage retains completed cleanup stages. A profile data-handle close failure
retains the exclusive owner lock. Project checkpoint, closed-DB acknowledgement,
malformed/rebound owner and lock-release failures are not empty success. Host
retains its retiring session for cleanup retry. Imports bind their original
session through actual asynchronous verification.

Passed targeted checks: stage3:desktop:test (real SQLite/Host/manager and controlled
failure scheduling), existing stage3-lifecycle-host test, direct TypeScript,
architecture (323 source files), desktop:boundary, git diff --check and the actual
Electron runtime smoke. The latter now requires natural process exit 0, native
quit and completed shutdown, with no uncaught exception. A watchdog kill is failure.
The allowed-path audit found 159 changed governed paths and none outside scope.

Original failures are retained in the ExecPlan. Removing the previous forced-exit
success exposed an actual Object-has-been-destroyed exception: the native closed
callback accessed webContents after destruction. Capturing the ID while alive
and unregistering by that ID fixed the actual Electron exit. The diagnostic log
contains the failure stack; its fixed-source successor passed. It is not a retry
of unchanged code to manufacture success.

OS TEMP logs and SHA-256 (first is the preserved failure):
- ave-stage3-desktop-electron-diagnostic-20260924.log: ab18957832a677c5f851196ef67c9f0afc2be24be1abfd6246d2dbfbe144192c
- ave-stage3-desktop-electron-fixed-20260924.log: 2bb33b148ce97a99019ac1e69c7f59a7c913f5d88b75f94ff51f5b300574f748

Stage2 and Stage3 regressions are running on the frozen source; full check and
final synthetic acceptance are pending. No current product request/draft Renderer
replacement or real creation journey is claimed. Old Stage2 product entry points
remain to be replaced together in this task, rather than kept as aliases in the
finished product. This change does not redesign the approved visual surface.

WP-S3-INTEGRATION-001 remains active and Stage3 remains specified. Approved source
and learning scope, exact design original and bounded provider/data/cost authority
remain missing for real steps. No real model call, creative work/recording,
commit/push/PR, merge or release. The following bindings refresh regression
applicability only; historical human acceptance and capability status are unchanged.

- CAP-RENDER-001; scope_fingerprint: 15d3ae667cf24402e3f9f4123bb393eb21f1cd9c7485d4962d438fa92cdf33e4
- CAP-PRESET-001; scope_fingerprint: f200315ac4305472ee681b583f966cfe04fee1b94e7f444e736a9dbde2d7a67b
- CAP-FND-001; scope_fingerprint: c0130d0bfa39a0deebc972bfa86f30d5a5c4fafe310d32777ded694d38fb9e4c
- CAP-CA-GOV-001; scope_fingerprint: 1b055b485633f2a64a34f27cf5c43f83febde086113e776e411e7c8829291e07
- CAP-CA-CONTEXT-001; scope_fingerprint: 6f4b376a1ac984f31683a4d5c7d7df10d3c1c78e8ce4ef35f8318c16debe88a9
- CAP-CA-SKILL-001; scope_fingerprint: 56447d1009664d15b379348bdac78681203cd964b4fa528e282ac76ed3e57b18
- CAP-CA-DURATION-001; scope_fingerprint: 3114467a8621ea82ea4977537351648aeae293a68edb654369abe9f94787eb99
- CAP-CA-STORY-001; scope_fingerprint: 137ec4c289d0ee1581b1d4029390fa2cdf211f5aa7d4fbe58daf2fe7334d8a1e
- CAP-CA-PERMISSION-001; scope_fingerprint: 00be42ab2e96540f156ff4d38c4baf22ab5884a12b51764db6b47cf243bfd541
- CAP-CA-PIPELINE-001; scope_fingerprint: 10e20296864f6c1e170fb856a65a2f418ae8fc3d966fe90d971b5ee40175c8d8
- CAP-CA-FEEDBACK-001; scope_fingerprint: 4d85f9657661b3a85996183849d3b492b6b01b23a399407c7e5c301dc0679be5
- CAP-CA-PRODUCT-001; scope_fingerprint: d1f6227df5c0aeacd417f2976a8d1d86d45a52cd576f58652faceee555e248c3
- CAP-CA-PRODUCT-002; scope_fingerprint: 803e30adc3085a60028954b72757cb4c858e51e878691659f67657d2c1abddf0
- CAP-CA-UX-001; scope_fingerprint: 3af5b7e35fc7f5ee2e42aa1df44c581f4c1292309f3bfb15ad262e8efd12f8bb
- CAP-CA-EXIT-001; scope_fingerprint: df50fbf78bc5a8fa595a5c158d20beb5e2fec348bf8438fca54a1e187cd687a4
- CAP-CA-GOV-003; scope_fingerprint: 33eb92acf8555b0865735744f099ac09feeb683e02fa73a802e63419940eb49d
- CAP-CA-GOV-002; scope_fingerprint: cde84d6a6f2ce54440168c1813f8e0a9399769ed91d42afd55b1999aec220b00
- CAP-CA-SEC-001; scope_fingerprint: 9d57fb14dc9593d8747eee6fb0eb5dd2fe8991a6e5e54732ccc00f8e5712e342
- CAP-CA-RECON-001; scope_fingerprint: d3f9bf4d015778da8450ca4e4cb29517ca9369861c22c867efdc1a898ba3d55b
- CAP-S3-FIRST-LOOP-001; scope_fingerprint: 42cf95eaca762182951cb4e33936266574cca3e561055b7f33ee3ca371c88405
