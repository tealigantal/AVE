import assert from "node:assert/strict";
import { digest } from "../../scripts/docker/build-identity.mjs";
import { validateHumanImportAcceptance } from "../../scripts/docs/human-import-acceptance.mjs";
import { createHash } from "node:crypto";

const current = { code_fingerprint: "a".repeat(64), build_input_digest: "b".repeat(64), runtime: { digest: "c".repeat(64), services: ["desktop", "whisper"].map(service => ({ service, build_input_digest: "b".repeat(64), manifest: { files: [] } })) } };
const input = { path: "apps/host.js", bytes: 4, sha256: digest("host") };
current.inputs = { files: [input] };
current.runtime.services[0].manifest = { files: [{ ...input, path: "/opt/ave/app/apps/host.js" }], build_provenance: { schema_version: 1, source_roots: ["apps", "packages", "contracts", "database", "resources/audio", "tools/contract-codegen", "package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "tsconfig.base.json", "scripts/docker/build-desktop.mjs"], source_inputs: [input], source_digest: digest([input]), outputs: [input], output_digest: digest([input]) } };
for (const [source, target, index] of [["docker/start-desktop.sh", "/usr/local/bin/ave-desktop", 0], ["docker/health-desktop.sh", "/usr/local/bin/ave-health", 0], ["docker/configure.py", "/opt/ave/configure.py", 0], ["docker/model-services.template.json", "/opt/ave/model-services.template.json", 0], ["scripts/stage3/yamnet_service.py", "/opt/ave/yamnet_service.py", 0], ["docker/start-whisper.py", "/opt/ave/start-whisper.py", 1]]) {
  const file = { path: source, bytes: 4, sha256: digest("test") };
  current.inputs.files.push(file); current.runtime.services[index].manifest.files.push({ ...file, path: target });
}
const wp = { work_package_id: "WP-S3-RELIABLE-IMPORT-001", acceptance_ids: ["ACC-IMPORT"], required_tests: ["media-import:host:test", "docs:check"] };
const confirmation = { kind: "user-message", author: "human-user", thread_id: "fixture-thread", message_id: "fixture-message", text: "通过，继续", build_input_digest: current.build_input_digest, runtime_digest: current.runtime.digest, procedure_ids: ["existing-nine-materials", "native-chooser-duplicate", "native-chooser-cancel", "unsent-input-refresh-reopen", "stop-remaining-import"] };
const ledger = { code_fingerprint: current.code_fingerprint, commands: [{ command: "media-import:host:test", exit_code: 0, log: { path: "fixture.log" } }] };
const record = { schema_version: 1, record_id: "FIXTURE-NOT-UI-ACCEPTANCE", work_package_id: wp.work_package_id, acceptance_ids: wp.acceptance_ids, build: structuredClone(current), confirmation: { path: "confirmation" }, engineering_ledger: { path: "ledger" }, steps: ["WIN-01", "WIN-02", "WIN-08"].map(step_id => ({ step_id, result: "pass", executor_kind: "human", observed: "synthetic fixture" })), unresolved_blockers: [] };
const readEvidence = async (_root, ref) => Buffer.from(ref.path === "confirmation" ? JSON.stringify(confirmation) : ref.path === "ledger" ? JSON.stringify(ledger) : "fixture log");
const options = { readEvidence, compareBuild: (build, live) => assert.deepEqual(build, live) };
assert.match((await validateHumanImportAcceptance(".", record, wp, current, options)).machine_claim, /no agent UI observation/);
const changedCurrent = { ...current, code_fingerprint: "d".repeat(64), build_input_digest: "e".repeat(64) };
const completedWp = { ...wp, status: "completed" };
assert.match((await validateHumanImportAcceptance(".", record, completedWp, changedCurrent, { ...options, mode: "static" })).machine_claim, /historical accepted build only/);
await assert.rejects(validateHumanImportAcceptance(".", record, completedWp, changedCurrent, options), /Expected values/);
await assert.rejects(validateHumanImportAcceptance(".", record, { ...wp, status: "active" }, changedCurrent, { ...options, mode: "static" }), /Expected values/);
ledger.code_fingerprint = "0".repeat(64);
await assert.rejects(validateHumanImportAcceptance(".", record, completedWp, changedCurrent, { ...options, mode: "static" }), /engineering source drift/);
ledger.code_fingerprint = current.code_fingerprint;
const corruptHistorical = structuredClone(record); corruptHistorical.build.inputs.files[0].sha256 = "0".repeat(64);
await assert.rejects(validateHumanImportAcceptance(".", corruptHistorical, completedWp, changedCurrent, { ...options, mode: "static" }), /SOURCE_DRIFT/);
async function refused(change, pattern) { const copy = structuredClone(record); change(copy); await assert.rejects(validateHumanImportAcceptance(".", copy, wp, current, options), pattern); }
await refused(r => r.steps.pop(), /missing steps/);
await refused(r => r.steps[0].result = "not-run", /missing confirmed/);
await refused(r => r.steps[0].executor_kind = "agent", /missing confirmed/);
await refused(r => r.steps[2].step_id = "WIN-01", /duplicate/);
await refused(r => r.steps.push(r.steps[0]), /duplicate/);
await refused(r => r.record_id = "", /identity missing/);
await refused(r => r.unresolved_blockers.push("failure"), /unresolved blockers/);
await refused(r => r.acceptance_ids = ["WRONG"], /binding mismatch/);
await assert.rejects(validateHumanImportAcceptance(".", record, { ...wp, work_package_id: "WP-S3-RELIABLE-PREVIEW-001" }, current, options), /unsupported package/);
await assert.rejects(validateHumanImportAcceptance(".", record, wp, current, { ...options, mode: "unknown" }), /unknown verification/);
confirmation.text = "未执行";
await assert.rejects(validateHumanImportAcceptance(".", record, wp, current, options), /explicit human/);
confirmation.text = "通过，继续"; confirmation.runtime_digest = "0".repeat(64);
await assert.rejects(validateHumanImportAcceptance(".", record, wp, current, options), /product build drift/);
confirmation.runtime_digest = current.runtime.digest; ledger.commands[0].exit_code = 1;
await assert.rejects(validateHumanImportAcceptance(".", record, wp, current, options), /check missing or failed/);
ledger.commands[0].exit_code = 0; ledger.code_fingerprint = "0".repeat(64);
await assert.rejects(validateHumanImportAcceptance(".", record, wp, current, options), /engineering source drift/);
ledger.code_fingerprint = current.code_fingerprint;
const previewWp = { work_package_id: "WP-S3-RELIABLE-PREVIEW-001", acceptance_ids: ["ACC-PREVIEW"], required_tests: ["media-browse:host:test", "docs:check"] };
const previewRecord = { ...structuredClone(record), work_package_id: previewWp.work_package_id, acceptance_ids: previewWp.acceptance_ids, steps: ["WIN-01", "WIN-03", "WIN-08"].map(step_id => ({ step_id, result: "pass", executor_kind: "human", observed: "synthetic gate fixture only" })) };
confirmation.procedure_ids = ["existing-nine-materials", "full-images-zoom-reset", "full-videos-audio-seek-fullscreen", "independent-audio-and-switch-release", "close-reopen-preserves-work"];
ledger.commands[0].command = "media-browse:host:test";
await validateHumanImportAcceptance(".", previewRecord, previewWp, current, options);
const missingPlayback = structuredClone(previewRecord); missingPlayback.steps[1].result = "not-run";
await assert.rejects(validateHumanImportAcceptance(".", missingPlayback, previewWp, current, options), /missing confirmed WIN-03/);
confirmation.procedure_ids.pop();
await assert.rejects(validateHumanImportAcceptance(".", previewRecord, previewWp, current, options), /procedure mismatch/);

const journeyPackage = {
  work_package_id: "WP-S3-RELIABLE-JOURNEY-001",
  acceptance_ids: ["ACC-S3-RELIABLE-JOURNEY-001"],
  required_tests: ["typecheck", "interaction-acceptance:test", "docs:check"],
  interaction_acceptance: {
    kind: "product",
    required_steps: ["WIN-04", "WIN-05", "WIN-06", "WIN-07", "WIN-08", "WIN-09"],
    required_scenarios: ["C1", "C2", "C3", "C4", "C5", "C6", "C8", "C9"],
    subjective_acceptance_required: false,
  },
};
const journeyEvidenceIds = [
  "EVD-20261004-S3-RELIABLE-JOURNEY-IMPLEMENTATION",
  "EVD-20261004-S3-RELIABLE-JOURNEY-TESTING",
  "EVD-20261005-S3-RELIABLE-JOURNEY-RESUME",
  "EVD-20261005-S3-RELIABLE-JOURNEY-DIRECT",
  "EVD-20261005-S3-RELIABLE-JOURNEY-CLOSEOUT",
  "EVD-20261005-S3-RELIABLE-JOURNEY-FORGET",
  "EVD-20261005-S3-RELIABLE-JOURNEY-MUSIC-PREPARED",
  "EVD-20261005-S3-RELIABLE-JOURNEY-MUSIC-RUNTIME",
  "EVD-20261005-S3-RELIABLE-JOURNEY-HUMAN-CONFIRMED",
];
const sha = (value) => createHash("sha256").update(value).digest("hex");
const journeyAcceptedBuild = structuredClone(current);
const journeyConfirmation = {
  kind: "user-message", author: "human-user", source_kind: "current-conversation",
  work_package_id: journeyPackage.work_package_id, text: "人工通过，应该进入p4了吧",
  build_input_digest: journeyAcceptedBuild.build_input_digest,
  runtime_digest: journeyAcceptedBuild.runtime.digest,
  accepted_output_sha256: "5".repeat(64),
};
const journeyBytes = new Map();
const saveEvidence = (path, contents) => {
  const bytes = Buffer.from(contents);
  journeyBytes.set(path, bytes);
  return { path, sha256: sha(bytes) };
};
saveEvidence("docs/evidence/assets/reliable-journey/p3-human-accepted-build.json", JSON.stringify(journeyAcceptedBuild));
saveEvidence("docs/evidence/assets/reliable-journey/p3-human-confirmation.json", JSON.stringify(journeyConfirmation));
const journeySupportingEvidence = journeyEvidenceIds.map((evidence_id) => {
  const path = `docs/evidence/runs/${evidence_id}.md`;
  const header = `---\nevidence_id: ${evidence_id}\nwork_package_id: WP-S3-RELIABLE-JOURNEY-001\ncapability_ids: [CAP-S3-RELIABLE-JOURNEY-001]\nacceptance_ids: [ACC-S3-RELIABLE-JOURNEY-001]\nresult: blocked\n---\n`;
  return { evidence_id, ...saveEvidence(path, `${header}${evidence_id === "EVD-20261005-S3-RELIABLE-JOURNEY-MUSIC-RUNTIME" ? journeyConfirmation.accepted_output_sha256 : "historical evidence fixture"}`) };
});
const journeyLedger = {
  code_fingerprint: current.code_fingerprint,
  known_debt_ids: ["DEBT-DOC-008-CREATIVE-ASSISTANT-STAGE3-RENDER-VALIDATION", "DEBT-S3-PROJECT-DELETE-DOCS-GATE"],
  docs_check_findings: ["evidence applicability CAP-RENDER-001", "latest evidence fingerprint mismatch creative-assistant-stage3"],
  commands: [
    { command: "typecheck", exit_code: 0, log: saveEvidence("docs/evidence/assets/reliable-journey/typecheck.log", "typecheck passed") },
    { command: "interaction-acceptance:test", exit_code: 0, log: saveEvidence("docs/evidence/assets/reliable-journey/interaction.log", "acceptance validator passed") },
    { command: "docs:check", exit_code: 1, log: saveEvidence("docs/evidence/assets/reliable-journey/docs-check.log", "evidence applicability CAP-RENDER-001\nlatest evidence fingerprint mismatch creative-assistant-stage3\n[ELIFECYCLE] Command failed with exit code 1") },
  ],
};
const journeyLedgerRef = saveEvidence("docs/evidence/assets/reliable-journey/p3-formal-closeout-ledger.json", JSON.stringify(journeyLedger));
const journeyRecord = {
  schema_version: 1,
  record_id: "P3-HISTORICAL-HUMAN-CLOSEOUT-FIXTURE",
  current_runtime_status: "verified",
  work_package_id: journeyPackage.work_package_id,
  acceptance_ids: journeyPackage.acceptance_ids,
  build: structuredClone(current),
  accepted_build: journeySupportingEvidence.length && { path: "docs/evidence/assets/reliable-journey/p3-human-accepted-build.json", sha256: sha(journeyBytes.get("docs/evidence/assets/reliable-journey/p3-human-accepted-build.json")) },
  confirmation: { path: "docs/evidence/assets/reliable-journey/p3-human-confirmation.json", sha256: sha(journeyBytes.get("docs/evidence/assets/reliable-journey/p3-human-confirmation.json")) },
  supporting_evidence: journeySupportingEvidence,
  engineering_ledger: journeyLedgerRef,
};
const journeyReadEvidence = async (_root, ref) => journeyBytes.get(ref.path);
const journeyOptions = { readEvidence: journeyReadEvidence, compareBuild: (build, verified) => assert.deepEqual(build, verified) };
const journeyResult = await validateHumanImportAcceptance(".", journeyRecord, journeyPackage, current, journeyOptions);
assert.deepEqual(journeyResult.verified_steps, [], "P3 package-level user confirmation must not invent step records");
assert.match(journeyResult.machine_claim, /historical product build/);
const sourceOnlyJourneyRecord = { ...journeyRecord, record_id: "P3-SOURCE-ONLY-CLOSEOUT-FIXTURE", current_runtime_status: "not-running", build: { ...structuredClone(current) } };
delete sourceOnlyJourneyRecord.build.runtime;
const sourceOnlyJourneyResult = await validateHumanImportAcceptance(".", sourceOnlyJourneyRecord, journeyPackage, current, {
  ...journeyOptions,
  compareBuild: (build, verified, _mode, options) => {
    if (options?.runtimeRequired !== false) return assert.deepEqual(build, verified);
    const expected = { ...structuredClone(verified) };
    delete expected.runtime;
    assert.deepEqual(build, expected);
    assert.deepEqual(options, { runtimeRequired: false });
  },
});
assert.match(sourceOnlyJourneyResult.machine_claim, /without a current runtime observation/);
await assert.rejects(validateHumanImportAcceptance(".", { ...sourceOnlyJourneyRecord, build: structuredClone(current) }, journeyPackage, current, {
  ...journeyOptions,
  compareBuild: (build, verified, _mode, options) => {
    if (options?.runtimeRequired !== false) return assert.deepEqual(build, verified);
    assert.deepEqual(options, { runtimeRequired: false });
    if (build.runtime !== undefined) throw new Error("source-only identity must not claim a current runtime");
  },
}), /source-only identity must not claim a current runtime/);
await assert.rejects(validateHumanImportAcceptance(".", journeyRecord, { ...journeyPackage, interaction_acceptance: { ...journeyPackage.interaction_acceptance, required_steps: ["WIN-04"] } }, current, journeyOptions), /scope differs/);
const journeyMessageBytes = journeyBytes.get("docs/evidence/assets/reliable-journey/p3-human-confirmation.json");
journeyConfirmation.text = "通过，继续";
journeyBytes.set("docs/evidence/assets/reliable-journey/p3-human-confirmation.json", Buffer.from(JSON.stringify(journeyConfirmation)));
await assert.rejects(validateHumanImportAcceptance(".", journeyRecord, journeyPackage, current, journeyOptions), /explicit P3 user acceptance/);
journeyBytes.set("docs/evidence/assets/reliable-journey/p3-human-confirmation.json", journeyMessageBytes);
await assert.rejects(validateHumanImportAcceptance(".", { ...journeyRecord, accepted_build: { ...journeyRecord.accepted_build, path: "docs/evidence/assets/other-build.json" } }, journeyPackage, current, journeyOptions), /accepted P3 build reference/);
const journeyFailedLedger = structuredClone(journeyLedger);
journeyFailedLedger.commands[0].exit_code = 1;
journeyBytes.set(journeyLedgerRef.path, Buffer.from(JSON.stringify(journeyFailedLedger)));
await assert.rejects(validateHumanImportAcceptance(".", journeyRecord, journeyPackage, current, journeyOptions), /engineering check failed: typecheck/);
journeyFailedLedger.commands[0].exit_code = 0;
journeyFailedLedger.known_debt_ids = [];
journeyBytes.set(journeyLedgerRef.path, Buffer.from(JSON.stringify(journeyFailedLedger)));
await assert.rejects(validateHumanImportAcceptance(".", journeyRecord, journeyPackage, current, journeyOptions), /not bound to DOC-008/);
console.log("Human acceptance gates bind P1/P2 procedures and the existing package-level P3 confirmation without fabricated steps");
