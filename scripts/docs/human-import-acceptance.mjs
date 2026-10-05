import { assertRuntimeBuildProvenance } from "../docker/build-identity.mjs";

// P1 and P2 use verified engineering/build bindings plus explicit human feedback.
// The active package's prescribed human procedure owns the acceptance scope.
export async function validateHumanImportAcceptance(root, record, workPackage, current, { readEvidence, compareBuild, mode = "live" }) {
  const fail = (message) => { throw new Error(`HUMAN_IMPORT_ACCEPTANCE_REJECTED: ${message}`); };
  if (!["live", "static"].includes(mode)) fail("unknown verification mode");
  const procedures = {
    "WP-S3-RELIABLE-IMPORT-001": { steps: ["WIN-01", "WIN-02", "WIN-08"], ids: ["existing-nine-materials", "native-chooser-duplicate", "native-chooser-cancel", "unsent-input-refresh-reopen", "stop-remaining-import"] },
    "WP-S3-RELIABLE-PREVIEW-001": { steps: ["WIN-01", "WIN-03", "WIN-08"], ids: ["existing-nine-materials", "full-images-zoom-reset", "full-videos-audio-seek-fullscreen", "independent-audio-and-switch-release", "close-reopen-preserves-work"] },
  };
  const procedure = procedures[workPackage.work_package_id];
  if (!procedure || record.schema_version !== 1 || record.work_package_id !== workPackage.work_package_id) fail("unsupported package or record");
  if (typeof record.record_id !== "string" || !record.record_id.trim()) fail("record identity missing");
  if (JSON.stringify(record.acceptance_ids) !== JSON.stringify(workPackage.acceptance_ids)) fail("acceptance binding mismatch");
  // A completed package's static audit verifies its immutable accepted build.
  // Live completion always compares the current source and actual running build.
  const historical = mode === "static" && ["completed", "accepted"].includes(workPackage.status);
  const verifiedBuild = historical ? record.build : current;
  compareBuild(record.build, verifiedBuild, mode);
  assertRuntimeBuildProvenance({ ...verifiedBuild, runtime: record.build.runtime });
  const confirmation = JSON.parse((await readEvidence(root, record.confirmation)).toString("utf8"));
  const located = (confirmation.thread_id && confirmation.message_id) || confirmation.source_kind === "current-conversation";
  if (confirmation.kind !== "user-message" || confirmation.author !== "human-user" || !located || !["通过，继续", "人工审核通过，继续"].includes(confirmation.text?.trim())) fail("explicit human confirmation missing");
  if (confirmation.build_input_digest !== record.build.build_input_digest || confirmation.runtime_digest !== record.build.runtime.digest) fail("confirmed product build drift");
  const required = procedure.ids;
  if (JSON.stringify(confirmation.procedure_ids) !== JSON.stringify(required)) fail("confirmation procedure mismatch");
  if (!Array.isArray(record.steps) || record.steps.length !== 3 || new Set(record.steps.map(s => s.step_id)).size !== 3) fail("duplicate or missing steps");
  for (const id of procedure.steps) {
    const step = record.steps.find(s => s.step_id === id);
    if (!step || step.result !== "pass" || step.executor_kind !== "human" || !step.observed?.trim()) fail(`missing confirmed ${id}`);
  }
  if (!Array.isArray(record.unresolved_blockers) || record.unresolved_blockers.length) fail("unresolved blockers");
  if (record.engineering_disposition === "deferred-by-user") {
    // A human acceptance with explicitly deferred checks is not green engineering
    // evidence. Keep this exception bound to the accepted P2 product build.
    if (workPackage.work_package_id !== "WP-S3-RELIABLE-PREVIEW-001" || record.engineering_ledger) fail("unsupported engineering deferral");
    const instruction = JSON.parse((await readEvidence(root, record.validation_instruction)).toString("utf8"));
    if (instruction.kind !== "user-message" || instruction.author !== "human-user" || instruction.source_kind !== "current-conversation" || instruction.work_package_id !== workPackage.work_package_id || instruction.build_input_digest !== record.build.build_input_digest || instruction.runtime_digest !== record.build.runtime.digest || instruction.text !== "好的，继续修复问题，这些都应该很简单就能完成的，修完先不用验证检测，修完直接重构容器，我亲自看，然后你修完继续任务，如无必须不用跑全量检测") fail("explicit build-bound validation instruction missing");
    return { record_id: record.record_id, verified_steps: record.steps.map(s => s.step_id), machine_claim: "human reported P2 UI acceptance; engineering checks explicitly deferred by user and not claimed passed; no agent observation, recording, subjective review, Stage Exit or Release" };
  }
  const requiredCommands = workPackage.required_tests.filter(command => command !== "docs:check");
  const ledger = JSON.parse((await readEvidence(root, record.engineering_ledger)).toString("utf8"));
  if (ledger.code_fingerprint !== verifiedBuild.code_fingerprint) fail("engineering source drift");
  if (!Array.isArray(ledger.commands) || new Set(ledger.commands.map(c => c.command)).size !== ledger.commands.length) fail("engineering ledger invalid");
  for (const command of requiredCommands) {
    const entry = ledger.commands.find(c => c.command === command);
    if (!entry || entry.exit_code !== 0) fail(`engineering check missing or failed: ${command}`);
    await readEvidence(root, entry.log);
  }
  return { record_id: record.record_id, verified_steps: record.steps.map(s => s.step_id), machine_claim: `${historical ? "historical accepted build only; " : ""}human reported UI acceptance and verified engineering/build bindings; no agent UI observation, recording, subjective review or Stage Exit claimed` };
}
