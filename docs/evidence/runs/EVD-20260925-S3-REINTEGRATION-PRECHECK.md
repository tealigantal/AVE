---
evidence_id: EVD-20260925-S3-REINTEGRATION-PRECHECK
date: 2026-09-25
code_fingerprint: cea20a270eb592204d5b78505180a947544fe180f023daa2c87a758ee6aa1ae2
repository_commit: 36bf33986cff202dd1a46ed8d4e3237382139e24
result: targeted_passed_full_gates_pending
---
# Real source reintegration precheck

Same active integration WP. The 65-second source exposed recursive Base64 regex stack overflow before model dispatch. Replaced with canonical decode/re-encode equality plus unchanged hash and format verification. A 65-second 48k PCM regression and malformed encodings/digest tests pass. Original failed run is retained at LOCALAPPDATA/AVE/acoustic-repair-20260925/host-integration-1790341895416.

The next actual run reached call 19 but rejected a Whisper 0-0 word anchor in an otherwise positive-duration segment. Point anchors are now retained without inventing timing or dropping text; composed segments still require positive duration. Negative, unordered, missing and out-of-range alignments still fail. Focused split-provider tests pass. Full-source rerun in progress, no real completion or acoustic quality claimed. Original call responses retained at host-integration-1790342011800.

Scope bindings for engineering regression; statuses unchanged:
- CAP-RENDER-001; scope_fingerprint: 2e815fc374cab2540480709347d333682145d7ad5391a78b2da7ecbf0035fbfa
- CAP-PRESET-001; scope_fingerprint: 3117e32100f2e4f6b488873ef36482aa74871d68d3966f04ef29818000a07e19
- CAP-FND-001; scope_fingerprint: 0d805e347e68f188ad5865b038d47ce787daa3ce3ecf55237a452a125f3ffb0b
- CAP-CA-GOV-001; scope_fingerprint: 7b2725463a8d338b8a811ae53ac85db4e6a131b911e8282ba14fc133e6fdbda3
- CAP-CA-CONTEXT-001; scope_fingerprint: 6f590ccc62730db5c7051b5078f63ae7da3f9f1924de58c77bdaa2260831b613
- CAP-CA-SKILL-001; scope_fingerprint: 8c65fbd7640a1b1d742a337bce8b50f61088718552fa8a2c0423c88624ccb113
- CAP-CA-DURATION-001; scope_fingerprint: dff08ff02cec701832423b4ec44674ad08b9d87171ca9f99b829d8906902a585
- CAP-CA-STORY-001; scope_fingerprint: f7bdae2a42b982a2e49d4c51d1485f6c0176edcafc2506756f73a847bb0867bd
- CAP-CA-PERMISSION-001; scope_fingerprint: 1a38f71edc60c6ea3fbe8022ba31501252c23733673ffed9fa4b7f2e05123438
- CAP-CA-PIPELINE-001; scope_fingerprint: 999d053502fc8621853b65987a0538274000798a649af245377e7f2d766c6579
- CAP-CA-FEEDBACK-001; scope_fingerprint: 0476db795e52123a3baee80ea4b394e360f77a3c41309afa76c26177a1852e51
- CAP-CA-PRODUCT-001; scope_fingerprint: 0ce37331afeddbbbf8ebc6442d3eafbd52f682d72c3254c02836e85a8e3a6622
- CAP-CA-PRODUCT-002; scope_fingerprint: 87a0c357bd367f951cc338f34b93ec7f945db7519472ff2327c379c23ee44644
- CAP-CA-UX-001; scope_fingerprint: 326e196d73d5d0d10799459d3764373a9e97e13b85466b7c1b21fe1928d14c51
- CAP-CA-EXIT-001; scope_fingerprint: 3baf5553174586e16077d5d23db3a551889bca153cb77ec0230ee06085e0d2bd
- CAP-CA-GOV-003; scope_fingerprint: 60c45034ae7fa9379181ee94036faebae993809d48d14274e4770bc0b9a2732f
- CAP-CA-GOV-002; scope_fingerprint: cde84d6a6f2ce54440168c1813f8e0a9399769ed91d42afd55b1999aec220b00
- CAP-CA-SEC-001; scope_fingerprint: 9b5dda9d66429921f6110615dd9a9887b918bb8efbe4ee1bf27f8e28aa386445
- CAP-CA-RECON-001; scope_fingerprint: f2fcfc77b2e826f500435d1a17aebe6246d697f52b67bf1c0565073561d07311
- CAP-S3-FIRST-LOOP-001; scope_fingerprint: a7f872f3d8c982edd817d94b9969533270d52a8d3e505389228eee43f9d2f52a
