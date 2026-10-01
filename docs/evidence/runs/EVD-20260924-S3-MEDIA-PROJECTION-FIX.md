---
evidence_id: EVD-20260924-S3-MEDIA-PROJECTION-FIX
date: 2026-09-24
code_fingerprint: a74347cd30895542f7f4345d01acaa9680350c09e2a253cce0d57e8319895fa9
repository_commit: 3521aa8a5d019fb49dd486a11a424bc937857db1
result: media_projection_contract_assertion_fixed_full_gates_pending
---
# Filename projection consumer correction

Full check session 58747 exited 1 at workbench:host:test after the previously
failing Renderer architecture gate passed. The UI now uses basename display_name
instead of raw asset hashes; the exact-field assertion still expected the old
projection. Root added display_name to the exact allowed fields and concrete
Windows/POSIX Unicode basename checks. The new checks deny full location_ref and
private parent paths and assert unknown filename stays null. Existing permission,
private metadata, actual import/jobs, reopen and recovery-zero-write checks remain.
Focused workbench:host:test exited 0. Only this test changed after the preceding
fingerprint. Required full check and final synthetic will run on this final source.
Original failures remain immutable outside Git. No test was skipped or relaxed.

Current-process and User-scope DashScope credentials were compared without
printing values and are identical; no alternate QWEN/AVE model key was present.
The real provider blocker is not stale process environment. No real film,
model understanding, recording, human acceptance, commit/push/PR or completion.

OS TEMP log hashes:
- ave-stage3-selected-design-check-fixed.log: 19908c4e9bced8ade3264e1caaa16f7d63de01b5da878a91bae0d912a8bc409e
- ave-stage3-media-projection-fixed.log: d1e3bfbed209f3b20d8047acce2844aecf9e6250652d1442170725382c22eec8

Engineering applicability bindings without status promotion:
- CAP-RENDER-001; scope_fingerprint: 4056528fe13ae36d2e28ae89205fec3a29670c567b724fae782cca7cc87ed080
- CAP-PRESET-001; scope_fingerprint: e6c0e471c39c05ff5f4d36140dfc51847b0735f590b291804e39b719aa4597b6
- CAP-FND-001; scope_fingerprint: 613b0c7030abda0cc0f92df35665837952e7b754957018e6546c461415a1ad5f
- CAP-CA-GOV-001; scope_fingerprint: f927edaec47a76b1bc08ee269b68380a5793ea38dd026ddb51791bb8fe074d49
- CAP-CA-CONTEXT-001; scope_fingerprint: e5c57f1f7419930aa76982a4f14cd01b1c8ce3cfa283b3c915f17ce56639fdac
- CAP-CA-SKILL-001; scope_fingerprint: bd182875f2c236b5fd2ddef530d807bd28581adbd269cf46df253b5d1a984603
- CAP-CA-DURATION-001; scope_fingerprint: abd30ebaeb75543510e25ddd8f70ccafd1354628c664b73c905f87015fec0912
- CAP-CA-STORY-001; scope_fingerprint: cb0ac9062fde40880d68bcc32e55ed6fe0abab44ce67e6e5cb9ec64c070869a8
- CAP-CA-PERMISSION-001; scope_fingerprint: d281424dc86d2959b65e6258a0a23b711c10cf43899a35bb82403903a4efc8f5
- CAP-CA-PIPELINE-001; scope_fingerprint: 6a3d13141a35e33f1a343e4fd9ce7fd2fd9b477256a1af182c0d3d1fee587241
- CAP-CA-FEEDBACK-001; scope_fingerprint: f40bb499a752dcca8da8f9eae59d7d5c93b1a2db659881e536e8a5b8c7566f96
- CAP-CA-PRODUCT-001; scope_fingerprint: 5121a30211f41ffc4d7066f486631b71c0f5fbe0d29ad0fc881c747f8ddd9b0f
- CAP-CA-PRODUCT-002; scope_fingerprint: 197194d2cc306b119216fd7954a7c29cc2004f540e439d7c566ab792ae82ddab
- CAP-CA-UX-001; scope_fingerprint: 5886622d2cafba8f6b09eaed310669923a56a47b4bfd61917fb339058dbf68f5
- CAP-CA-EXIT-001; scope_fingerprint: 5ca07fff1ff6d3139fe03eee84f1deda09eb5c5c84ccc7f954a50bc163a63a03
- CAP-CA-GOV-003; scope_fingerprint: 60c45034ae7fa9379181ee94036faebae993809d48d14274e4770bc0b9a2732f
- CAP-CA-GOV-002; scope_fingerprint: cde84d6a6f2ce54440168c1813f8e0a9399769ed91d42afd55b1999aec220b00
- CAP-CA-SEC-001; scope_fingerprint: af8b86e8c168072070860a67c7177d119e72ba5b9bce794312a1586f951d33e5
- CAP-CA-RECON-001; scope_fingerprint: f2fcfc77b2e826f500435d1a17aebe6246d697f52b67bf1c0565073561d07311
- CAP-S3-FIRST-LOOP-001; scope_fingerprint: 188e2ed3774d9eb7292e571901b682aadfc849bf0f3a57f46141268a87923551
