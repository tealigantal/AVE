---
evidence_id: EVD-20261003-S3-MEDIA-CLOSEOUT-PROGRESS5
work_package_id: WP-S3-MEDIA-CLOSEOUT-001
capability_ids: [CAP-S3-MEDIA-CLOSEOUT-001]
acceptance_ids: [ACC-S3-MEDIA-CLOSEOUT-001]
date: 2026-10-03
code_fingerprint: c4b86d4e9a30382550801f75e00f21f6242fe60e64beaa642e59aa4f337a4d6c
result: in_progress_real_journeys_and_final_checks_pending
---
# P5 committed fades and retained real recovery

Both actual browser and Electron initial mixed drafts passed two real planner calls, dual QC, full decode and playback. Their first manual music gain (-18 to -21 dB) caused silence detection within the explicitly committed two-second final fade (10.830417 to 12.010667 of a 12-second work). Original failure objects and v1/v2 histories are preserved. QC now accepts only interval-bound committed fades, after source hashes and every full audio stream's strict-zero measurement. A non-fading nonzero overlapping voice or other contributor keeps silence blocking. Actual PCM/encoded regression covers accepted final fade, blocking middle silence and blocking missing overlapping voice. Ruff/mypy and TypeScript checks pass. Both retained actual projects were normally reopened and the gain successfully rerendered. Actual photo/voice previews passed; Electron picture/caption precision and manual original-site SFX passed. Remaining full journey steps are pending, without another initial model call or rewriting prior proof.

Independent review found an extra-video grade collision; old grade reuse is now limited to video-main and the exact non-managed track is preserved in regression. Full check passed Stage2/Stage3 and architecture, then found the obsolete media projection field assertion; it now validates media_kind/image facts, cover-art classification, unknown facts and private-field filtering. The focused Host test passes. Images project only declared safe fields and absent stream facts do not invent audio. A concurrent local code-generation write met a Windows file-sharing error; TypeScript without generation then passed, and future generator operations are serialized. Full final checks and human acceptance remain pending.

## Applicability
- CAP-RENDER-001; scope_fingerprint: 9a9f31116ff4f7b12394c71b0069e1c188de20f4fe303aa91fdae857fb0fcd34
- CAP-PRESET-001; scope_fingerprint: 0459b9cdf08bed98abc7d73f7ade9400a738c5df43bcea51b3452e6a4271381d
- CAP-FND-001; scope_fingerprint: 4b020a433ffadc0635b9920b2d58621670d27574dd3ce61fbb8a139575e4f837
- CAP-CA-GOV-001; scope_fingerprint: dee82ed1099499be6b827b6aeb53f532c3b0c4ab186a197b23a5400b4ea976f4
- CAP-CA-CONTEXT-001; scope_fingerprint: 197a2c04a66746df67af0200153e71ea5d364831b63557f94b02745654eacc05
- CAP-CA-SKILL-001; scope_fingerprint: 86fbf231b88bad3e66f6e051e5a7b47d7f41ceaeaed7e2767fccc67a5fded6ca
- CAP-CA-DURATION-001; scope_fingerprint: 8117ead82a126b496b7fa8074de8ecee2f8a4cf7f80b61502c25c68a293152ab
- CAP-CA-STORY-001; scope_fingerprint: e421a24c1e69199c2c2f78362d2edd64a6f0662e814310c1d8bfcbf77bac27b0
- CAP-CA-PERMISSION-001; scope_fingerprint: c43226ecab30aba4a16da191540afe624730ebe1d64ba6283862a81f7ca1eeec
- CAP-CA-PIPELINE-001; scope_fingerprint: 2927ae6373046d5707c3001a9d172c58b583fe9abb5ade61c9609a7d7e94f7b9
- CAP-CA-FEEDBACK-001; scope_fingerprint: a0f48646b67f43bbbbf1a8fa9f3848b53d7d155fa66254530fc3b0066f4f71ac
- CAP-CA-PRODUCT-001; scope_fingerprint: cb462eb49ca9a27f10b39b111c09b3c25eb3c3ea74bcc05254a57f3af142d779
- CAP-CA-PRODUCT-002; scope_fingerprint: 89bdaec676f02e634031d1e1eec0ed96ad8d496e1562e5db420485a966372725
- CAP-CA-UX-001; scope_fingerprint: 7b4757625ffe3519b01a912d039428ebc6bd0926252a8e7792a9e64798e3527e
- CAP-CA-EXIT-001; scope_fingerprint: b282b19e0037f6f4abd704ccae6dd7f92bdd0ffed8826b27be58bd99bd5df7ba
- CAP-CA-GOV-003; scope_fingerprint: 1dc11fd58a6f098f1133ba18709d28350bc844daeb35ca22741656443893ad4d
- CAP-CA-GOV-002; scope_fingerprint: b59d428fd30193f8bfa9f48312ebbaded43874ba42aa2b793e5ef359e7cfb0d0
- CAP-CA-SEC-001; scope_fingerprint: e75d54dc9116930d077f5715e24bfb1fc062ef4d7b15ffc6a5f16943e7488e88
- CAP-CA-RECON-001; scope_fingerprint: 966daf3871bfd7ece095b1049d8aad072f2a2d2aefb4c160cd3e2d2e1b39b594
- CAP-S3-FIRST-LOOP-001; scope_fingerprint: d5295a80161486379ea03010ee51ec4d3ace1ec8704f2d21f9957cbde0931432
- CAP-S3-SKILL-001; scope_fingerprint: 8f25c5955fee9b78fc72cbc3c78084e3118f30ce2dccdf7960486664ddc5d00a
- CAP-S3-DOCKER-001; scope_fingerprint: e72e7f6f538b496c1b8008385982ed1989210c68ad705287867ba86407659e39
- CAP-S3-WEB-001; scope_fingerprint: 975acafe3ddc9b0d4d3402287088da34ab4aecb4500442ea86c1c548f9599a86
- CAP-S3-DOCKER-CLEAN-001; scope_fingerprint: 93c9558e7f8fd696727294c0c42218ca5a73b454bacbdd07eacba5a8a0b3be27
- CAP-S3-MEDIA-001; scope_fingerprint: da00dc3b61ed2c941cef802932b3b2dd4f93b10e368653bf3eda4a5dd0911626
- CAP-S3-AUDIO-PACK-001; scope_fingerprint: 2b61bd1232b88f6998033e43a33b8ceb9880dbb09ad8ec3f247d30aa9115d76c
- CAP-S3-SOUNDTRACK-001; scope_fingerprint: 7776f3663b8d784f2f93eb58cd80fc61c731ca0f93ca7ebc20a05b1e63907061
- CAP-S3-PRECISION-001; scope_fingerprint: fd5021e18a30037b7b37db1e30c166e937d734270b04d166d1c0d03851b41c73
