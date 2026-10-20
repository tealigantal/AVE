import { assertRuntimeBuildProvenance } from "../docker/build-identity.mjs";

// P1 and P2 use verified engineering/build bindings plus explicit human feedback.
// The active package's prescribed human procedure owns the acceptance scope.
const journeyPackageId = "WP-S3-RELIABLE-JOURNEY-001";
const journeyAcceptanceId = "ACC-S3-RELIABLE-JOURNEY-001";
const journeyHumanText = "人工通过，应该进入p4了吧";
const journeyConfirmationPath = "docs/evidence/assets/reliable-journey/p3-human-confirmation.json";
const journeyAcceptedBuildPath = "docs/evidence/assets/reliable-journey/p3-human-accepted-build.json";
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
const journeySteps = ["WIN-04", "WIN-05", "WIN-06", "WIN-07", "WIN-08", "WIN-09"];
const journeyScenarios = ["C1", "C2", "C3", "C4", "C5", "C6", "C8", "C9"];

function evidenceHeaderFields(bytes, id) {
  const text = bytes.toString("utf8");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) throw new Error(`HUMAN_IMPORT_ACCEPTANCE_REJECTED: supporting Evidence header missing: ${id}`);
  return new Map(match[1].split(/\r?\n/).filter(Boolean).map((line) => {
    const separator = line.indexOf(":");
    if (separator < 1) throw new Error(`HUMAN_IMPORT_ACCEPTANCE_REJECTED: invalid supporting Evidence header: ${id}`);
    return [line.slice(0, separator).trim(), line.slice(separator + 1).trim().replace(/^["']|["']$/g, "")];
  }));
}

async function validateJourneyHumanAcceptance(root, record, workPackage, current, { readEvidence, compareBuild, mode }) {
  const fail = (message) => { throw new Error(`HUMAN_IMPORT_ACCEPTANCE_REJECTED: ${message}`); };
  const policy = workPackage.interaction_acceptance;
  if (policy?.kind !== "product"
    || JSON.stringify([...policy.required_steps].sort()) !== JSON.stringify([...journeySteps].sort())
    || JSON.stringify(policy.required_scenarios) !== JSON.stringify(journeyScenarios)
    || policy.subjective_acceptance_required !== false) fail("P3 interaction scope differs from its registered acceptance");
  if (record.schema_version !== 1 || record.work_package_id !== journeyPackageId) fail("unsupported P3 confirmation record");
  if (!record.record_id?.trim()) fail("P3 record identity missing");
  if (JSON.stringify(record.acceptance_ids) !== JSON.stringify([journeyAcceptanceId])
    || JSON.stringify(workPackage.acceptance_ids) !== JSON.stringify([journeyAcceptanceId])) fail("P3 acceptance binding mismatch");
  if (!["verified", "not-running"].includes(record.current_runtime_status)) fail("P3 current runtime status must be explicit");

  // A stopped service is not restarted for historical acceptance formalization.
  // Source-only closeout remains bound to the current source; the immutable build below
  // independently proves which product runtime the user accepted.
  const runtimeRequired = record.current_runtime_status === "verified";
  compareBuild(record.build, current, mode, { runtimeRequired });
  if (record.accepted_build?.path !== journeyAcceptedBuildPath) fail("accepted P3 build reference is not the recorded product identity");
  const acceptedBuild = JSON.parse((await readEvidence(root, record.accepted_build)).toString("utf8"));
  compareBuild(acceptedBuild, acceptedBuild, "static");
  try { assertRuntimeBuildProvenance(acceptedBuild); }
  catch (error) { fail(`accepted P3 build provenance invalid: ${error.message}`); }

  if (record.confirmation?.path !== journeyConfirmationPath) fail("P3 user confirmation reference is not the recorded conversation message");
  const confirmation = JSON.parse((await readEvidence(root, record.confirmation)).toString("utf8"));
  if (confirmation.kind !== "user-message"
    || confirmation.author !== "human-user"
    || confirmation.source_kind !== "current-conversation"
    || confirmation.work_package_id !== journeyPackageId
    || confirmation.text?.trim() !== journeyHumanText) fail("explicit P3 user acceptance is missing");
  if (confirmation.build_input_digest !== acceptedBuild.build_input_digest
    || confirmation.runtime_digest !== acceptedBuild.runtime?.digest
    || !/^[a-f0-9]{64}$/.test(confirmation.accepted_output_sha256 ?? "")) fail("P3 acceptance is not bound to its accepted build and output");

  if (!Array.isArray(record.supporting_evidence)
    || JSON.stringify(record.supporting_evidence.map((entry) => entry.evidence_id)) !== JSON.stringify(journeyEvidenceIds)) fail("P3 supporting Evidence set differs from the recorded closeout");
  for (const [index, id] of journeyEvidenceIds.entries()) {
    const reference = record.supporting_evidence[index];
    if (reference.path !== `docs/evidence/runs/${id}.md`) fail(`P3 supporting Evidence path mismatch: ${id}`);
    const fields = evidenceHeaderFields(await readEvidence(root, reference), id);
    if (fields.get("evidence_id") !== id
      || fields.get("work_package_id") !== journeyPackageId
      || fields.get("capability_ids") !== `[CAP-S3-RELIABLE-JOURNEY-001]`
      || fields.get("acceptance_ids") !== `[${journeyAcceptanceId}]`) fail(`P3 supporting Evidence binding mismatch: ${id}`);
  }
  const musicEvidence = record.supporting_evidence.find((entry) => entry.evidence_id === "EVD-20261005-S3-RELIABLE-JOURNEY-MUSIC-RUNTIME");
  const musicText = (await readEvidence(root, musicEvidence)).toString("utf8");
  if (!musicText.includes(confirmation.accepted_output_sha256)) fail("accepted P3 output is absent from the recorded music handoff Evidence");

  const ledger = JSON.parse((await readEvidence(root, record.engineering_ledger)).toString("utf8"));
  if (ledger.code_fingerprint !== current.code_fingerprint) fail("P3 engineering ledger source drift");
  if (!Array.isArray(ledger.commands) || ledger.commands.length !== workPackage.required_tests.length
    || new Set(ledger.commands.map((entry) => entry.command)).size !== ledger.commands.length) fail("P3 engineering ledger invalid");
  for (const command of workPackage.required_tests) {
    const entry = ledger.commands.find((item) => item.command === command);
    if (!entry || !Number.isInteger(entry.exit_code)) fail(`P3 engineering result missing: ${command}`);
    const log = await readEvidence(root, entry.log);
    if (command !== "docs:check" && entry.exit_code !== 0) fail(`P3 engineering check failed: ${command}`);
    if (command === "docs:check") {
      const text = log.toString("utf8");
      const findings = text.split(/\r?\n/).filter((line) => /^(?:generated drift |evidence applicability |latest evidence fingerprint mismatch )/.test(line));
      if (entry.exit_code === 0 && findings.length) fail("P3 docs:check ledger says passed but contains findings");
      if (entry.exit_code !== 0) {
        if (entry.exit_code !== 1 || !findings.length) fail("P3 docs:check failed without a classified finding");
        if (findings.some((line) => !/^evidence applicability CAP-[A-Z0-9-]+$/.test(line)
          && line !== "latest evidence fingerprint mismatch creative-assistant-stage3")) fail("P3 docs:check contains a finding outside the documented historical applicability debt");
        if (JSON.stringify([...(ledger.docs_check_findings ?? [])].sort()) !== JSON.stringify([...findings].sort())) fail("P3 docs:check findings are not fully recorded");
        if (findings.includes("evidence applicability CAP-RENDER-001")
          && !ledger.known_debt_ids?.includes("DEBT-DOC-008-CREATIVE-ASSISTANT-STAGE3-RENDER-VALIDATION")) fail("P3 render applicability finding is not bound to DOC-008");
        if (findings.includes("evidence applicability CAP-S3-PROJECT-DELETE-001")
          && !ledger.known_debt_ids?.includes("DEBT-S3-PROJECT-DELETE-DOCS-GATE")) fail("P3 deletion applicability finding is not bound to its documented debt");
      } else if ((ledger.docs_check_findings ?? []).length) fail("P3 docs:check passing ledger lists stale findings");
    }
  }
  return {
    record_id: record.record_id,
    verified_steps: [],
    machine_claim: `${record.current_runtime_status === "not-running" ? "current source and engineering checks verified without a current runtime observation; " : "current source/runtime and engineering checks verified; "}user explicitly reported P3 acceptance for the bound historical product build; no steps or recordings were invented, later code changes are not human-accepted by this record, and Stage Exit/Release are not claimed`,
  };
}

export async function validateHumanImportAcceptance(root, record, workPackage, current, { readEvidence, compareBuild, mode = "live" }) {
  const fail = (message) => { throw new Error(`HUMAN_IMPORT_ACCEPTANCE_REJECTED: ${message}`); };
  if (!["live", "static"].includes(mode)) fail("unknown verification mode");
  if (workPackage.work_package_id === journeyPackageId) return validateJourneyHumanAcceptance(root, record, workPackage, current, { readEvidence, compareBuild, mode });
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
