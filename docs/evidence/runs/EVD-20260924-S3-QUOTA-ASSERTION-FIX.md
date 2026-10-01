---
evidence_id: EVD-20260924-S3-QUOTA-ASSERTION-FIX
date: 2026-09-24
code_fingerprint: 6ac94f108707794376ecfa23cbd19ebbf12bf49078dc1c7d6ef4a090c9ceb1a9
repository_commit: 3521aa8a5d019fb49dd486a11a424bc937857db1
result: obsolete_interface_assertion_fixed_full_gates_pending
---
# Current Renderer contract assertion correction

Full check session 50772 exited 1 at renderer:workbench:test after all registered
Stage2 and Stage3 tests, architecture, architecture regressions, CI workflow,
feature-boundary and feature-behavior tests passed. Expected current user scope;
actual assertion required retired max_cost/max_calls fields. The user explicitly
removed product ceilings and ADR-0029 replaces that interface. Root replaced
only the obsolete scope expectations with provider/model/protected_refs and added
an explicit denial of the retired quota interface. Existing routes, data consent,
expiry, preservation, race, privacy and single-interface assertions remain.
Targeted renderer:workbench:test and Stage2 workspace property test exited 0.
The required full check will run again on this changed fingerprint; no skip.
Original failure OS TEMP/ave-stage3-selected-design-check.log, SHA-256 2ab100743446aa9cacdb3a9d8cf92fd6cb2a8440f9bfc801b49340fec6ffa964.

Read-only provider re-review found no remaining blocker in HTTP body cleanup,
null choices, deployment identity, redirects or SSE lifetime (static review only).
To diagnose regional credentials, model-list GET requests were also made to
Singapore, US and Hong Kong official DashScope endpoints; all returned 401.
No media/context or generation request was sent and no region was auto-selected.
Official endpoint source: https://www.alibabacloud.com/help/en/model-studio/base-url
Regional diagnostics OS TEMP/ave-stage3-qwen-regional-discovery.json, SHA-256 67de74cda947b14a086ca629fa6c57c8e368f06666e9347ff17edf97ef2be29f.
Real multimodal configuration remains an external blocker; first-loop acceptance
and Git delivery remain incomplete. The same integration package is active.

Engineering applicability bindings without status promotion:
- CAP-RENDER-001; scope_fingerprint: 813ae8db7a62d413123b6ee15ac20203c5e56e0a847b9c2156712bf4e49eacd7
- CAP-PRESET-001; scope_fingerprint: 0ee3b012ac3ffe859a50a178190c805fb541e260d6564b165638dc8a0bfd75fd
- CAP-FND-001; scope_fingerprint: 04493f4f07a1f646ee362551ba3a36b4c5b10d7be2b9b49f974aa1b396edd213
- CAP-CA-GOV-001; scope_fingerprint: f927edaec47a76b1bc08ee269b68380a5793ea38dd026ddb51791bb8fe074d49
- CAP-CA-CONTEXT-001; scope_fingerprint: a66de820a6555d019bc9d2aaf08111a08095cc859cb152cb5e834ab34c3717a8
- CAP-CA-SKILL-001; scope_fingerprint: bd182875f2c236b5fd2ddef530d807bd28581adbd269cf46df253b5d1a984603
- CAP-CA-DURATION-001; scope_fingerprint: abd30ebaeb75543510e25ddd8f70ccafd1354628c664b73c905f87015fec0912
- CAP-CA-STORY-001; scope_fingerprint: 4ec58a81b4ed73d9b499e075ebbc03b9d792caadb1f9597953a9b78d8efa9cfe
- CAP-CA-PERMISSION-001; scope_fingerprint: d281424dc86d2959b65e6258a0a23b711c10cf43899a35bb82403903a4efc8f5
- CAP-CA-PIPELINE-001; scope_fingerprint: ed8e651596999ecc79cc74a691af86936194ab48c52d4e280104bd0e8c505863
- CAP-CA-FEEDBACK-001; scope_fingerprint: cb608d310efa3fad57e6ab83c610f8de43c85f725dd998ef89461bd069a767d3
- CAP-CA-PRODUCT-001; scope_fingerprint: a243facfe8e33fe9bba34d5b7b00056af738a00c67d8438c80b33001a7b0ba7e
- CAP-CA-PRODUCT-002; scope_fingerprint: f41760c1cac91d6fb3e667f1638494d4b687035370c335b704634febdc4df8fc
- CAP-CA-UX-001; scope_fingerprint: f2c777d32caf6e2b1747b4eed0596d5b370804dd86895b98c0433d6b38f739bb
- CAP-CA-EXIT-001; scope_fingerprint: a1d3987fd5e120279b362e5cf5acf1b54a531e95bb8331f1f2762205bd3f58e4
- CAP-CA-GOV-003; scope_fingerprint: 60c45034ae7fa9379181ee94036faebae993809d48d14274e4770bc0b9a2732f
- CAP-CA-GOV-002; scope_fingerprint: cde84d6a6f2ce54440168c1813f8e0a9399769ed91d42afd55b1999aec220b00
- CAP-CA-SEC-001; scope_fingerprint: af8b86e8c168072070860a67c7177d119e72ba5b9bce794312a1586f951d33e5
- CAP-CA-RECON-001; scope_fingerprint: f2fcfc77b2e826f500435d1a17aebe6246d697f52b67bf1c0565073561d07311
- CAP-S3-FIRST-LOOP-001; scope_fingerprint: 345dd342949e03b2d3319c373c04a30d24e29891163d69aa60abbe2409bace13
