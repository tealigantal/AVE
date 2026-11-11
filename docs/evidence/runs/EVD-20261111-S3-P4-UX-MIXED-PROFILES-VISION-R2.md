---
evidence_id: EVD-20261111-S3-P4-UX-MIXED-PROFILES-VISION-R2
work_package_id: WP-S3-RELIABLE-UX-001
date: 2026-11-11
repository_commit: 293695defc884445630b7d83e77a58c8f2031186
code_fingerprint: e0b45158f6982a6f68ef647d7a82f8072dd55ff781a2b796f518c336d4f1f925
capability_ids: [CAP-S3-P4-DEMO-INTEGRATION-001, CAP-S3-RELIABLE-UX-001]
acceptance_ids: [ACC-S3-P4-DEMO-INTEGRATION-001, ACC-S3-RELIABLE-UX-001]
result: partial
---

# Mixed model profiles and cloud vision format failure

This immutable engineering record covers the user's 6084 local-audio/cloud
selection request and the subsequently reported 6085 observation failure. It
does not complete the full work package, low-resource programme or real-video
acceptance. The existing [execution plan](../../plans/2026-10-03-reliable-workbench-real-acceptance.md)
owns the chronological record; no parallel current-state authority is created.

## 6085 failure and correction

Read-only inspection of the failed project and original container log found
15 successfully settled vision calls followed by a sixteenth vision call with
`MODEL_OUTPUT_INVALID`. The selected model was `qwen3.7-flash-2026-07-15`.
Its JSON contained a normal description but used `uncertain:false` as a key
with an unrelated string value instead of a required boolean `uncertain`.
The original diagnostic hash is
`d8568b8f0cdb7d38dca552e7db32a04578cf7c86b6e2204db222e90ac2bcd6b5`.
The request had not reached planning or video rendering. The error was not
evidence of an FFmpeg memory failure or local-model routing.

The vision instruction previously presented the pseudo-JSON
`{description:string,uncertain:boolean}`. It now supplies valid literal JSON,
explicit field and boolean rules, a prohibition on copying the example, and
the rule that image text is data rather than executable instructions. Vision
subrequests use `vision-frame-json-v2`; the actual input/wire digest changes.
The existing model deployment digest remains unchanged. The Host records the
actual wire identity, but this does not add a new persisted plaintext field
for the child prompt version. Strict validation, one physical attempt per
sample, the chosen models and old records are unchanged. The fixed, redacted
UI explanation now identifies a model format/content validation failure.

JSON Object constrains syntax rather than the expected fields. The
[official structured-output documentation](https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen-structured-output)
also says multimodal JSON Schema requests fall back to JSON Object. No claim
of server-enforced schema or guaranteed model reliability is made.

The complete amd64 desktop image deployed to 6085 is
`sha256:7f3d967de208af4c6f972d2e4a66a1a639769eb4cbacb8958c1c905b04a705b5`,
build-input `c560d2c8f4ffe068238a374aca55be8d5babc838f0c4e0446a161cd79b852d15`.
The Host was first signalled directly and exited with code 0 before Compose
replacement. The cloud-only flag, two model profiles, official remote routes,
port and independent data mounts remain in place; no local inference process
or Whisper service runs in this project. The replacement container is
`799373edaa173accf1bb9d8f06fc0c536c077fa52d0bbfa1eb1d90bf1bf46f62`,
started `2026-11-11T11:02:03.439756257Z`, healthy with HTTP ready. Docker
Desktop reported the export mount using a C-drive spelling instead of its
internal Linux spelling; canonical host-directory comparison confirmed the
same directory. No user media was resent and no failed record was rewritten.

## Real synthetic cloud calls

The frozen image's compiled configuration and split-provider vision path
processed three distinct 96x96 geometric PNGs in an isolated test container.
The process ran as UID 1000 with a clean environment, read its existing 0600
configuration only in memory, and did not mount user projects or media.
Each request was sent once; all outputs passed exact field/boolean validation
and described the respective synthetic shape rather than copying the example.
Reported token totals were 252, 253 and 262, totalling 767. This proves the
small gateway compatibility case, not the Host ledger, complex photographs,
planning, sound, rendering or the user's complete video.

A prior disposable Docker `--env-file` fixture preserved outer credential
quotes and one request failed with unknown usage. Recreating only that
fixture with Compose's existing env-file parsing fixed the fixture. An
automatic approval review rejected a proposal to extract credentials from
inspect into a temporary env file; that action was not executed. The final
probe instead read the candidate's already initialized protected configuration
without extracting, copying or displaying credentials. The test container is
removed after verification.

## 6084 configuration and compatibility

The independent mixed-mode startup gate registers the unchanged existing
local-audio deployment plus the existing economy/enhanced cloud presets.
Vision and planning in the local-audio profile still use the original Qwen
cloud models; this is not a fully offline profile. The cloud-only gate remains
mutually exclusive and continues to reject local services. Local dependencies
are the union of all profiles, while credential validation/injection is per
profile. Every provider shares the existing Host resource gate. Selection
applies to new requests; existing authorization retains its deployment.

The first 6084 startup correctly failed closed because the new admission
check accepted only data-url sound input while the actual old YAMNet
configuration used base64. It did not overwrite the old configuration. The
old service pair was immediately restored. The check was corrected to allow
both already implemented formats while retaining the exact local models,
loopback endpoints, protocols and other restrictions. Tests now cover the
actual base64/planner-json_object configuration instead of assuming the
repository template matches the user's settings. Before the final deployment,
an isolated Python-to-compiled-Node preflight used the actual old configuration
read-only and verified its exact deployment identity:
`d08a1d0cbfa5367525f0401e61678aed5420ffe7f274d24c17e35fd595a0ae18`.

The final 6084 desktop image is
`sha256:027161204a6098f6e2b94315fb31d399b6c391e018ecc01916a38e0b6db525ad`;
Whisper is `sha256:e00f86bcad6869438c36edb4177e4fa108efbe6f62bd5aaf237a9f8e21c35bd1`.
Both have build-input
`13569c78ee7daa006a640509996eb4143dbc4b47c5a594da5ce4863900b354d4`.
This second snapshot adds the base64 admission fix; 6085 remains on its first
snapshot. Both 6084 services are healthy, with 768/1280MiB limits and common
CPU set 0-1. Their IDs are respectively
`413fa97b08217fbb4cdff3a19d21affba622e14120d7ae10cd8110b14d19ef3b` and
`9a53a4d6f28df539164086d140588610eb09735a69eaebb7e31bae3ede8f89f4`.
Existing mounts are preserved. After 6085's explicit failure fix, its ID,
StartedAt and image stayed identical throughout the 6084 reconstruction.

An actual Browser interaction on 6084 created an empty engineering project,
opened Creation settings → Creation requirements → Model configuration,
verified the local default and three options, selected economy and observed
all four remote routes, then returned to local audio. No model request was
submitted. The empty test project was moved to the recoverable recycle bin;
the original project was not opened or edited. Screenshot:
[6084 model configuration](../assets/p4-ux/local-cloud-20261111/mixed-model-options-r2.png).
The independent cloud-only candidate's selector was also observed:
[cloud configuration](../assets/p4-ux/local-cloud-20261111/cloud-vision-r1.png).

## Engineering verification and limits

Passed at the recorded final source checkpoints: TypeScript/code generation;
121 contract schemas and positive/negative examples; architecture (2002
files); Docker packaging and cloud/local startup; full `stage3:model:test`;
desktop authorization and P4 integration; Browser Host integration; and the
creation-failure projection tests. Tests include malformed keys with exactly
one send, prompt input/wire identity, old authorization reopening with cloud
as the new default, actual base64 preservation, missing old deployment with no
cloud fallback, separate credential injection, dependency union and invalid
profile rejection. `git diff --check` passed with existing line-ending notices.

Real isolated YAMNet lifecycle testing also passed slow-request TERM drain:
the inference child completed before the service exited. Sampled parent RSS
was 21696KiB and child peak 131480KiB. Host shutdown now precedes YAMNet
termination; the service waits for accepted handlers/children. Compose's
Whisper dependency still means a full pair replacement must first quiesce
the Host explicitly; the deployments above did so and observed exit 0.
Forced termination is not proof of drain.

Observed cgroup peaks after startup/empty UI checks were 74502144 bytes for
6084 desktop and 168394752 for Whisper; the isolated cloud candidate peaked
at 86118400 bytes. These are narrow observations, not a full production memory
or performance acceptance result. The user's full video was not replayed.
No claim is made for the 45s/26-clip/high-resolution 2GiB target, full long-media
support, all bounded-render semantics, native arm64, P5 or Stage Exit.

`docs:sync` ran. `docs:check` still fails on the separate incomplete
worker/media-scene-request v1/v2 migration and historical evidence scope/
fingerprint applicability gates. Those checks were not weakened and this
partial record is not passed to `docs:complete` as package completion.
