---
evidence_id: EVD-20260925-S3-WORD-ALIGNMENT-GATES
date: 2026-09-25
code_fingerprint: 1051ade0c70e5f2033239b6d7ca9e5ba6b8d75e81d152851833a0a5e80212cbd
repository_commit: 36bf33986cff202dd1a46ed8d4e3237382139e24
result: word_alignment_real_path_and_engineering_gates_passed_checkpoint_incomplete
---
# Word alignment and bounded transcript projection

User requested actual word timestamps and bounding the final end to the uploaded audio. Same integration package, no candidate/package completion. Both granularities are requested; new responses without word alignment fail. Segment projection uses aligned first and last words, exact RationalTime, and final-end limiting. Raw decimal segment/word values stay in child output and hashes; no inference text rewritten. Wholly out-of-range words, intermediate overflow, invalid alignment and unordered segments fail without observation/draft/Timeline publication. Historical segment-only proofs remain readable; request deployment identity changes.

Focused split tests and full pnpm run check passed (exit 0), followed by pnpm run acceptance:final:synthetic (exit 0). Controlled tests cover serialized multipart fields, original end retention, nonzero source origin, exact boundary, negative failures with zero commit, and clamped observation persistence/reopen. Root self-review checked all changed production consumers; no new schemas, fallback or broader refactoring.

Actual recorded-source test (12-second interval) returned 16 aligned words; last aligned end 11.98 seconds. Production split provider completed 2 calls (Whisper then Qwen), once each, without retries; final limiting did not trigger on this successful sample. Qwen description accuracy remains unaccepted. Full response and raw SSE remain outside Git at LOCALAPPDATA/AVE/acoustic-repair-20260925/real-audio-1790340929571. Results hash eb5e425a08442842153f422169fc67aa11e1e5a4d69e6cf68e1d2a0a42cfe430; Whisper raw response hash bba61057b1716410d1f48a36d8ed536182a0e09bd07bc0cfa985606cd675e33f; audio hash 497a891f2d9fbc6f0c021b1d2a050ff3edfdd28933ef232fbf991c1f4b345409.

Preserved failures: original segment-only end 12.48 exceeded 12; first word-enabled request failed HTTP 500 with cuBLAS NOT_SUPPORTED under int8_float16. Direct same-weight CUDA float32 diagnosis returned words ending 11.98, then only the ave-whisper container was recreated using saved Compose float32 configuration and the actual service path passed. No other container, provider model, key or environment-key source changed. Local Compose backup retained. Float32 is a measured compatibility choice for this RTX 5070 Laptop; no general performance or hardware portability claim.

Original failed runs, logs and raw data remain immutable. A local report-reading script initially used Windows GBK; corrected UTF-8 without additional inference. No private media/context/key is committed. No new Preview/Master/QC, workbench recording or held-out personalized creation outcome is claimed. Broader checkpoint and its existing debts remain incomplete/blocked.

Validation logs outside Git:
- word-full-check.log: SHA256 3985081c5489d21f485d162a0b2f8188d56d1031e20328d25ce2d99625e4d0fd
- word-final-synthetic.log: SHA256 808ee2be19b86adf6d26d7db235b2963715d55f148e292583e025e6bcde27184

Engineering applicability only; capability statuses unchanged:
- CAP-RENDER-001; scope_fingerprint: 8d6ca70edcaea14ca34abbe13f596ffd1c4d11837dcdaa12192debece753597b
- CAP-PRESET-001; scope_fingerprint: e336ff2e42541f509c1e03590e498edf983d004e6c8bad90d6f49a106b74001c
- CAP-FND-001; scope_fingerprint: 76de322f43245a58e56f54a530c50391efe13c9e69c8faa03ecca057c74336c3
- CAP-CA-GOV-001; scope_fingerprint: 7b2725463a8d338b8a811ae53ac85db4e6a131b911e8282ba14fc133e6fdbda3
- CAP-CA-CONTEXT-001; scope_fingerprint: f129b14e47763b1ce408a2ad7cdfe166c9635e0af4eda9f8126b49ad1ff58c15
- CAP-CA-SKILL-001; scope_fingerprint: cb65616250976bb24f4e58f250e817693012ebe459b36480b2e1e4fac4d6cdf7
- CAP-CA-DURATION-001; scope_fingerprint: 7cc92fc21d2e2a81ade1007305662f44a4386c270cc03b30be1e633f39635841
- CAP-CA-STORY-001; scope_fingerprint: 8ef636e60cb643c3c9bd4aa0105e7bbd2bbed37c1bfcd85ac7a7d3de88e0aea6
- CAP-CA-PERMISSION-001; scope_fingerprint: dfc8808e241dbe878855daf34e8ed6e9cc77c1e615a30dd6fb91a08d3148d68f
- CAP-CA-PIPELINE-001; scope_fingerprint: bcec1096d425760e267871f44d964147145bfc216191ffb61d593c2bc73137b5
- CAP-CA-FEEDBACK-001; scope_fingerprint: 2945ecd056a5899bee72be3f6ac227e64cdad92b321d09b6240f24321d01bb02
- CAP-CA-PRODUCT-001; scope_fingerprint: 21f439fa4af3daa174c69c9cb8b3cf25c94a5cac0deb3f2cd01ba7470a37e1d9
- CAP-CA-PRODUCT-002; scope_fingerprint: 69f623a0a050cf2eabee98edd7dc800d0a0d3bc1431619e5ab277be3d798e363
- CAP-CA-UX-001; scope_fingerprint: a3b1f78bef8a9f6b2e5cc4dd39e665a14ce94a0725ebaa6f03da81eeb219b0f9
- CAP-CA-EXIT-001; scope_fingerprint: 5fbf14a5bc522d5b2310a0a25d59effe3ea02d27c6a298f0166aee8397996ceb
- CAP-CA-GOV-003; scope_fingerprint: 60c45034ae7fa9379181ee94036faebae993809d48d14274e4770bc0b9a2732f
- CAP-CA-GOV-002; scope_fingerprint: cde84d6a6f2ce54440168c1813f8e0a9399769ed91d42afd55b1999aec220b00
- CAP-CA-SEC-001; scope_fingerprint: 9b5dda9d66429921f6110615dd9a9887b918bb8efbe4ee1bf27f8e28aa386445
- CAP-CA-RECON-001; scope_fingerprint: f2fcfc77b2e826f500435d1a17aebe6246d697f52b67bf1c0565073561d07311
- CAP-S3-FIRST-LOOP-001; scope_fingerprint: 3b8cecfff54e350e7e92a012fbaf0f2c86efc6c7438ac38a336084d3d2c044fa
