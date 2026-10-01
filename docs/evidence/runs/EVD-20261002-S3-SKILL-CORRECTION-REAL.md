---
evidence_id: EVD-20261002-S3-SKILL-CORRECTION-REAL
work_package_id: WP-S3-SKILL-001
date: 2026-10-02
code_fingerprint: 880a6798dc0c1f958b507ae6100239ef06ccde8ea6e4a80f0c7339f4761bd06b
result: real_planner_preview_master_qc_reopen_passed_final_gates_pending
---
# Corrected two-call real operation

Run skill-planner-1790870868492, model run 64d1a808-b6b9-47ac-a0a1-22a4400db4a6. Reused the already authorized immutable public speech source, exact existing model/service configuration and fresh isolated project. Actual first call sent 12 full-body candidates: W03/Q01/S05/S01/S09/E05/E02/E08/A03/A02/V04/E04. No 64-definition payload. Actual physical Planner calls: 2. Full-body first call selected W03 and S09 as decision_only, A03 as no_change, V04 as edit_proposed. The only effect binds V04 to /captions with exact transcript evidence and verbatim-captions capability. No edit was manufactured for the other applicable Skills.

Host committed Timeline v1, 8 seconds and two shots. Preview and Master both passed unchanged QC. Close/reopen preserved exact Timeline and effects without replay. These are automated real-model/real-media technical results, not human aesthetic/listening acceptance. Raw context/media/project and local absolute paths remain outside Git; report logical artifact is skill-planner-1790870868492/result.json.

The prior operation skill-planner-1790870015656 failed at Whisper before Planner because WSL lost GPU access. User explicitly authorized broader Docker Desktop/WSL recovery; original containers were restored, host/container GPU visibility and transcription recovered. Only then was this new operation executed with unchanged model configuration. No hidden retry, fallback or model switch occurred.

Intermediate full check stopped at an overlooked three-call fixture assertion in stage3-split-model. Related downstream fixtures were corrected to require exactly two calls, one measurement receipt and the same final/state/zero-write assertions. This was a test consumer correction, not weakening QC. That failed full check is not final green. Targeted Stage3 regression is completing; final source full check/synthetic and remote CI remain pending.

Scope bindings establish regression applicability only; existing Stage Exit debts remain unchanged.
- CAP-RENDER-001; scope_fingerprint: cc8a7d136ad4ab965cfbaa4e78d79e1a601e47f15ea3385ce8412782e23322d2
- CAP-PRESET-001; scope_fingerprint: 7c2a7a92c06f442cb2a57309a041848eae1ee451e0cea31a00e27e1fc40cad9c
- CAP-FND-001; scope_fingerprint: f2348338f85b09a08aeef94644ac4c122a61da76f4faeb8b3224ed2725dcde7a
- CAP-CA-GOV-001; scope_fingerprint: 70db40a61b0552d6de09cd709573f4fe2c11d2123da965e55246fa3a34fdd3c9
- CAP-CA-CONTEXT-001; scope_fingerprint: f8bc6828cec437075b4e099f6757f9653ca8f7a2f1fa9349fff8207c741f3316
- CAP-CA-SKILL-001; scope_fingerprint: 519a11b79d87a98946be6e045bc5f81784f7fd6575b4d9c01081bdede9250a95
- CAP-CA-DURATION-001; scope_fingerprint: 0ba67f9040ee6310b741fe794f34dd905e9af92f7d5a2fb1260fd3cb80150c4f
- CAP-CA-STORY-001; scope_fingerprint: c1bea25eb9345b901602ea154cc68a95e53f324ab1954abcdce04cffd7e31651
- CAP-CA-PERMISSION-001; scope_fingerprint: 1ec6cd8f7091d988e1ecf8f124847cafb8a1449cec549418fd1227d7828e4e2f
- CAP-CA-PIPELINE-001; scope_fingerprint: 46224943ff56732032ee4254b2a3b4942807dfaa52fe206e097f1ff6c3039a37
- CAP-CA-FEEDBACK-001; scope_fingerprint: 8a86f9bf3faa14310c6a084115f0dda6c75b8ec45f81a2e9f6fde305a91ca7b3
- CAP-CA-PRODUCT-001; scope_fingerprint: 55b3673de69ce8862ba76666f0624a95cd3e844338ca729fefd07a73fe5862d2
- CAP-CA-PRODUCT-002; scope_fingerprint: 1c32c41c4ec17b9f3fea06369d291aa977b5696208991103f4f755e0190b5425
- CAP-CA-UX-001; scope_fingerprint: 4c5413fa4a6646c8efba46dca60217e3638d5f19eb29200d4f9013ffdfeff314
- CAP-CA-EXIT-001; scope_fingerprint: fd97bc9b00fa3f67f2d5552bc69f698661b55b36c1c5cb5096cd1e0a2cf303b1
- CAP-CA-GOV-003; scope_fingerprint: a356ece5dda1d8447080db4fdfe1959ac11d6eddeee13f568102f84673dd0906
- CAP-CA-GOV-002; scope_fingerprint: cde84d6a6f2ce54440168c1813f8e0a9399769ed91d42afd55b1999aec220b00
- CAP-CA-SEC-001; scope_fingerprint: 42ec5fe8daac8a6c1ab87e014fd03f1065ced7515baa2d18ef3a828ea560cac3
- CAP-CA-RECON-001; scope_fingerprint: 966daf3871bfd7ece095b1049d8aad072f2a2d2aefb4c160cd3e2d2e1b39b594
- CAP-S3-FIRST-LOOP-001; scope_fingerprint: 945b6f6115d82310ee71fd7da48b9023e2ebcfb21b721aa5e8fee6ad91ad6b6e
- CAP-S3-SKILL-001; scope_fingerprint: fe5ef8e39bf8108b5ee910eb3c7f721f9ef83e4b738d6e25f64b5600f62b584f
