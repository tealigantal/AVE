---
evidence_id: EVD-20261002-S3-DOCKER-CLEAN-PINNED-PRECHECK
work_package_id: WP-S3-DOCKER-002
date: 2026-10-02
code_fingerprint: 61270cc36e72aeaeac8b66eea1754ad70697abab0ff5e0c19515b84e20a99101
capability_ids: [CAP-S3-DOCKER-CLEAN-001]
acceptance_ids: [ACC-S3-DOCKER-CLEAN-001]
result: precheck
---
# Pinned Worker precheck

Initial full check passed through worker:render-graph:test then explicitly failed the Pillow12.3.0 assertion: system Python has 11.2.1. Existing isolated worker-runtime/Scripts/python.exe verified at 12.3.0; no install or assertion change. Subsequent validation selects it via PATH and AVE_PYTHON. Normalize only three pending source files with CR/extra EOF whitespace; no semantics change. Prior statuses stay unchanged; pins indicate scope applicability while final checks are pending. Actual two-service startup, HTTP reopen/close and pinned CPU startup without network/GPU already passed.

- CAP-RENDER-001; scope_fingerprint: 6ed20e3ec15aec8925a41b0d58df9a7899bf85eb19652c72da247c5b64ac3798
- CAP-PRESET-001; scope_fingerprint: 771dccb7616c2e51dfcbb3cb21d07aa5cdb181ca9ac5a7c12bc4ab490697f2c6
- CAP-FND-001; scope_fingerprint: 7be55119344c03efa2d312ac04cdfbce580c18d69cb95d51c53925fc0a247ab7
- CAP-CA-GOV-001; scope_fingerprint: 70db40a61b0552d6de09cd709573f4fe2c11d2123da965e55246fa3a34fdd3c9
- CAP-CA-CONTEXT-001; scope_fingerprint: c0f0379a46333302865587382d74de877f391c1c91124e4b238367911301a5d9
- CAP-CA-SKILL-001; scope_fingerprint: 94b49b81383f2de93e539b0ef7dcb94c502886ce464c522bbe4de42c14fe0ad9
- CAP-CA-DURATION-001; scope_fingerprint: 0ba67f9040ee6310b741fe794f34dd905e9af92f7d5a2fb1260fd3cb80150c4f
- CAP-CA-STORY-001; scope_fingerprint: be5b62f409beef534450c3e2d0676ecc73ebae612b7552478f20eaa8545ac389
- CAP-CA-PERMISSION-001; scope_fingerprint: 9efbc767d5612096e7288a3d2eeebf5971c6b719e976e74d039f984da63a24a1
- CAP-CA-PIPELINE-001; scope_fingerprint: c7cf71036dfa2fbc7f41a62b5ac18df1dbdbbc86cd5d2fb12dc8a7beb6b2a631
- CAP-CA-FEEDBACK-001; scope_fingerprint: 0876022380b8765ee8951246d81cf623c0a6f47cb16ba054c58d38462e0323f8
- CAP-CA-PRODUCT-001; scope_fingerprint: 58a1d78588fa029d91c1f10c666de8cae5bcc0a81f6abc7a27bb5287f8808802
- CAP-CA-PRODUCT-002; scope_fingerprint: 75997d2140c0f902ef62b55716fb094cad0d7f89ad539927d99d987f0d42980a
- CAP-CA-UX-001; scope_fingerprint: 8eeabdeacf39eac1646937f342d50a49342fef4ea6689c4b289485fc7adcca4f
- CAP-CA-EXIT-001; scope_fingerprint: 050265cceebb2104d1a362a27d80d2007dd687b11f7fb476cc49a33387d34c0c
- CAP-CA-GOV-003; scope_fingerprint: 8da17ec3b7511fa0153be0d64543583ee5be47c72cbadd20df6c4f5b58cd55fa
- CAP-CA-GOV-002; scope_fingerprint: 57725c6883bf97d3090293138370eb5e7617ad7a8aaa1b29c9b4529cf6de505a
- CAP-CA-SEC-001; scope_fingerprint: 42ec5fe8daac8a6c1ab87e014fd03f1065ced7515baa2d18ef3a828ea560cac3
- CAP-CA-RECON-001; scope_fingerprint: 966daf3871bfd7ece095b1049d8aad072f2a2d2aefb4c160cd3e2d2e1b39b594
- CAP-S3-FIRST-LOOP-001; scope_fingerprint: ccacf0b06db884999f15a1c78e940da77137aeb109c8fc56698fdee60b019eaf
- CAP-S3-SKILL-001; scope_fingerprint: fe5ef8e39bf8108b5ee910eb3c7f721f9ef83e4b738d6e25f64b5600f62b584f
- CAP-S3-DOCKER-001; scope_fingerprint: aa392d07eed96db0fceb87f226d0d2cb7372b7c16c5ce125450dc07f7b4a23b4
- CAP-S3-WEB-001; scope_fingerprint: d3a7d172dbf862957bf50490ad1eeff016d41ac42af271278b628f951d924b9c
