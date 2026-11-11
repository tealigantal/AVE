import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { currentBuildIdentity, digest } from "../../scripts/docker/build-identity.mjs";
import { assertInteractionCompletion, createInteractionReceipt, interactionPolicy, parseEvidenceHeader, readVerifiedEvidence, validateInteractionRecord } from "../../scripts/docs/interaction-acceptance.mjs";
import { completeWork } from "../../scripts/docs/complete-work.mjs";
import { fingerprint } from "../../scripts/docs/fingerprint.mjs";
import { exactWorkPackage, loadProgramModel } from "../../scripts/docs/program-model.mjs";
import { sync } from "../../scripts/docs/sync.mjs";
import "./human-import-acceptance.test.mjs";

const run = promisify(execFileCallback);
const root = await mkdtemp(resolve(tmpdir(), "ave-interaction-gate-"));
const put = async (path, value) => { await mkdir(resolve(root, path, ".."), { recursive: true }); await writeFile(resolve(root, path), typeof value === "string" || Buffer.isBuffer(value) ? value : JSON.stringify(value, null, 2) + "\n"); };
const wp = { work_package_id: "WP-S3-RELIABLE-IMPORT-001", acceptance_ids: ["ACC-IMPORT"], capability_ids: ["CAP-IMPORT"], dependencies: [], allowed_paths: [], specification_files: [], status: "active", interaction_acceptance: { kind: "product", required_steps: ["WIN-01", "WIN-02", "WIN-08"], required_scenarios: [], subjective_acceptance_required: false } };
const current = { repository_commit: "a".repeat(40), code_fingerprint: "b".repeat(64), build_input_digest: "c".repeat(64), dirty_build_diff_digest: "d".repeat(64), runtime: { digest: "e".repeat(64), services: ["desktop", "whisper"].map((service) => ({ service, image_id: "sha256:" + "f".repeat(64), runtime_digest: "1".repeat(64), configuration_digest: "2".repeat(64) })) } };
current.inputs = { files: [{ path: "apps/host.js", bytes: 4, sha256: digest("host") }] };
const outputs = [{ path: "apps/host.js", bytes: 4, sha256: digest("host") }];
current.runtime.services[0].manifest = { files: outputs.map((item) => ({ ...item, path: `/opt/ave/app/${item.path}` })), build_provenance: { schema_version: 1, source_roots: ["apps", "packages", "contracts", "database", "resources/audio", "tools/contract-codegen", "package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "tsconfig.base.json", "scripts/docker/build-desktop.mjs"], source_inputs: current.inputs.files, source_digest: digest(current.inputs.files), outputs, output_digest: digest(outputs) } };
current.inputs.files = [...current.inputs.files];
for (const [source, target, index] of [["docker/start-desktop.sh", "/usr/local/bin/ave-desktop", 0], ["docker/health-desktop.sh", "/usr/local/bin/ave-health", 0], ["docker/configure.py", "/opt/ave/configure.py", 0], ["docker/model-services.template.json", "/opt/ave/model-services.template.json", 0], ["scripts/stage3/yamnet_service.py", "/opt/ave/yamnet_service.py", 0], ["docker/start-whisper.py", "/opt/ave/start-whisper.py", 1]]) {
  const input = { path: source, bytes: 4, sha256: digest("test") };
  current.inputs.files.push(input);
  current.runtime.services[index].manifest ??= { files: [] };
  current.runtime.services[index].manifest.files.push({ ...input, path: target });
}
for (const service of current.runtime.services) { service.build_input_digest = current.build_input_digest; service.tools = {}; service.runtime_digest = digest({ manifest: service.manifest, tools: service.tools, build_input_digest: service.build_input_digest }); }
current.runtime.digest = digest(current.runtime.services.map(({ service, image_id, configuration_digest, runtime_digest }) => ({ service, image_id, configuration_digest, runtime_digest })));
try {
  const repositoryRoot = process.cwd();
  const repositoryModel = await loadProgramModel(repositoryRoot);
  const { workPackage: p3WorkPackage } = exactWorkPackage(repositoryModel.programs, "WP-S3-RELIABLE-JOURNEY-001");
  const p3EvidenceId = p3WorkPackage.interaction_evidence_id;
  assert.ok(p3EvidenceId, "completed P3 acceptance remains bound to its immutable closeout evidence");
  const p3Header = parseEvidenceHeader(await readFile(resolve(repositoryRoot, `docs/evidence/runs/${p3EvidenceId}.md`), "utf8"));
  const currentRepositoryIdentity = await currentBuildIdentity(repositoryRoot, { runtime: false });
  assert.notEqual(p3Header.get("code_fingerprint"), currentRepositoryIdentity.code_fingerprint, "test must exercise historical P3 source drift");
  const historicalP3Audit = await assertInteractionCompletion(repositoryRoot, p3WorkPackage, p3Header, {
    identityResolver: async () => currentRepositoryIdentity,
    mode: "static",
  });
  assert.match(historicalP3Audit.machine_claim, /historical build; no current P4 source/);

  await run("git", ["init"], { cwd: root });
  const recording = "docs/evidence/assets/recording.mp4";
  await mkdir(resolve(root, "docs/evidence/assets"), { recursive: true });
  await run(process.env.AVE_FFMPEG ?? "ffmpeg", ["-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", "color=c=blue:s=32x32:r=2:d=40", "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=8000:duration=40", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", resolve(root, recording)], { windowsHide: true });
  const recordingHash = digest(await readFile(resolve(root, recording)));
  await put("docs/evidence/assets/state.log", "Synthetic validator boundary fixture; NOT AVE UI acceptance.\n");
  const log = { evidence_id: "LOG", kind: "log", path: "docs/evidence/assets/state.log", sha256: digest(await readFile(resolve(root, "docs/evidence/assets/state.log"))) };
  const video = { evidence_id: "VIDEO", kind: "recording", path: recording, sha256: recordingHash, captured_at: "2026-10-03T10:00:00Z", start_seconds: 0, end_seconds: 35, duration_seconds: 40, executor_kind: "browser-automation", audible_capture: true };
  const evidence = [video, log];
  const record = {
    schema_version: 1, record_id: "STRUCTURE-FIXTURE", attempt_id: "BOUNDARY-01", work_package_id: wp.work_package_id, acceptance_ids: wp.acceptance_ids,
    executor: { kind: "browser-automation", id: "synthetic-validator-fixture", tool_version: "fixture-v1" },
    environment: { os: "Windows test fixture", application: "Synthetic validator only", browser: "not an AVE UI run", timezone: "Asia/Shanghai", screen: "fixture", scaling: "100%", audio_output: "fixture", audio_capture: "generated fixture, not listening acceptance" },
    started_at: "2026-10-03T10:00:00Z", finished_at: "2026-10-03T10:02:00Z", build: current,
    sources: [{ source_id: "fixture-source", sha256: recordingHash, bytes: (await readFile(resolve(root, recording))).length, evidence: { path: recording, sha256: recordingHash }, license_or_authorization: "generated test fixture" }],
    steps: ["WIN-01", "WIN-02", "WIN-08"].map((step_id, index) => ({ step_id, started_at: `2026-10-03T10:00:${String(index * 10).padStart(2, "0")}Z`, finished_at: `2026-10-03T10:00:${String(index * 10 + 9).padStart(2, "0")}Z`, result: "pass", preconditions: "validator fixture", action: "synthetic structure", expected: "validate binding", observed: "synthetic structure only", persistent_state: "fixture", recovery_observed: "fixture recovery", object_refs: { project_id: "project-fixture", batch_id: "batch-fixture", asset_id: "asset-fixture" }, scenarios: [], ui_provenance: { executor_kind: "browser-automation", surface: "browser-ui", file_selection: "native-dialog" }, evidence: structuredClone(evidence) })),
    independent_review: { result: "pass", reviewer_id: "fixture-reviewer", reviewer_kind: "agent", reviewed_at: "2026-10-03T10:03:00Z", observation: "boundary fixture only; not real interaction review", evidence: log },
    unresolved_blockers: [], prior_attempts: [],
  };
  for (const step of record.steps) {
    const path = `docs/evidence/assets/${step.step_id}-state.json`;
    await put(path, { schema_version: 1, step_id: step.step_id, attempt_id: record.attempt_id, build_input_digest: current.build_input_digest, object_refs: step.object_refs, sources: record.sources.map(({ source_id, sha256, bytes }) => ({ source_id, sha256, bytes })), persistent_state_digest: digest("synthetic state") });
    step.evidence.push({ evidence_id: `STATE-${step.step_id}`, kind: "host-state", path, sha256: digest(await readFile(resolve(root, path))) });
  }
  const result = await validateInteractionRecord(root, record, wp, current);
  assert.match(result.machine_claim, /integrity.*only/);
  const clone = (value) => JSON.parse(JSON.stringify(value));
  async function refused(change, pattern) { const copy = clone(record); change(copy); await assert.rejects(validateInteractionRecord(root, copy, wp, current), pattern); }
  await refused((copy) => copy.steps.pop(), /missing required step/);
  await refused((copy) => copy.steps.push(copy.steps[0]), /unique array/);
  await refused((copy) => copy.steps[0].result = "not-run", /not-run/);
  await refused((copy) => copy.steps[0].result = "fail", /not pass/);
  await refused((copy) => copy.build.code_fingerprint = "9".repeat(64), /code_fingerprint drift/);
  await refused((copy) => copy.build.runtime.services[0].image_id = "sha256:" + "9".repeat(64), /runtime drift/);
  await refused((copy) => copy.executor.kind = "human", /provenance mismatch/);
  await refused((copy) => copy.steps[0].ui_provenance.file_selection = "injected-file", /injected files/);
  await refused((copy) => copy.steps[0].recovery_observed = "", /recovery_observed is required/);
  await refused((copy) => copy.steps[0].negative_test = { error_code: "FAIL", correct_state: false, recovery_available: true }, /negative case/);
  await refused((copy) => copy.steps[0].evidence[0].duration_seconds = 4000, /duration disagrees/);
  await refused((copy) => copy.steps[0].evidence[0].end_seconds = 50, /outside media/);
  await refused((copy) => copy.steps[1].started_at = copy.steps[0].started_at, /overlap/);
  await refused((copy) => copy.steps[0].evidence[0].captured_at = "2026-10-03T10:01:00Z", /cover step/);
  await refused((copy) => copy.steps[0].object_refs.batch_id = "unbound-batch", /object identity mismatch/);
  await refused((copy) => copy.sources[0].bytes++, /identity\/size mismatch/);
  await refused((copy) => copy.independent_review.reviewer_id = copy.executor.id, /not independent/);
  await refused((copy) => copy.prior_attempts = [{ attempt_id: copy.attempt_id, failed_steps: ["WIN-01"], repair_identity: "fix", evidence: log }], /replace itself/);
  await assert.rejects(readVerifiedEvidence(root, { path: "docs/evidence/../outside", sha256: log.sha256 }), /contained repository/);
  await assert.rejects(readVerifiedEvidence(root, { path: log.path, sha256: "0".repeat(64) }), /digest mismatch/);
  assert.throws(() => interactionPolicy({ ...wp, interaction_acceptance: { kind: "tooling" } }), /cannot bypass/);
  assert.throws(() => interactionPolicy({ ...wp, interaction_acceptance: { ...wp.interaction_acceptance, required_steps: ["WIN-01"] } }), /registered scope/);
  assert.throws(() => parseEvidenceHeader("---\nresult: passed\nresult: passed\n---\n"), /duplicate/);

  // P5 may be executed and reviewed by automation; human aesthetic approval is optional.
  // This generated-media fixture exercises the validator, never product UI acceptance.
  const finalWp = { ...wp, work_package_id: "WP-S3-RELIABLE-ACCEPTANCE-001", interaction_acceptance: {
    kind: "product", required_steps: ["WIN-01", "WIN-02", "WIN-03", "WIN-04", "WIN-05", "WIN-06", "WIN-07", "WIN-08", "WIN-10"],
    required_scenarios: Array.from({ length: 9 }, (_, i) => `C${i + 1}`),
  } };
  assert.equal(interactionPolicy(finalWp).continuous, true);
  const uxWp = { ...wp, work_package_id: "WP-S3-RELIABLE-UX-001", interaction_acceptance: {kind:"product",required_steps:["WIN-10"],required_scenarios:[]} };
  assert.deepEqual(interactionPolicy(uxWp).steps,["WIN-10"]);
  assert.throws(()=>interactionPolicy({...uxWp,interaction_acceptance:{...uxWp.interaction_acceptance,required_steps:["WIN-09"]}}),/registered scope/);
  const journeyWp = { ...wp, work_package_id: "WP-S3-RELIABLE-JOURNEY-001", interaction_acceptance: {kind:"product",required_steps:["WIN-04","WIN-05","WIN-06","WIN-07","WIN-08","WIN-09"],required_scenarios:["C1","C2","C3","C4","C5","C6","C8","C9"]} };
  assert.ok(interactionPolicy(journeyWp).steps.includes("WIN-09"));
  assert.throws(()=>interactionPolicy({...finalWp,interaction_acceptance:{...finalWp.interaction_acceptance,required_steps:finalWp.interaction_acceptance.required_steps.filter(step=>step!=="WIN-02")}}),/registered scope/);
  assert.throws(() => interactionPolicy({ ...finalWp, interaction_acceptance: { ...finalWp.interaction_acceptance, subjective_acceptance_required: true } }), /human feedback is optional/);
  const finalVideoPath = "docs/evidence/assets/final-fixture.mp4";
  await run(process.env.AVE_FFMPEG ?? "ffmpeg", ["-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", "color=c=blue:s=32x32:r=2:d=310", "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=8000:duration=310", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", resolve(root, finalVideoPath)], { windowsHide: true });
  const finalVideo = { ...video, path: finalVideoPath, sha256: digest(await readFile(resolve(root, finalVideoPath))), duration_seconds: 310 };
  const finalRecord = { ...clone(record), work_package_id: finalWp.work_package_id, finished_at: "2026-10-03T10:05:00Z", steps: [] };
  finalRecord.independent_review.reviewed_at = "2026-10-03T10:06:00Z";
  for (const [index, step_id] of finalWp.interaction_acceptance.required_steps.entries()) {
    const step = { ...clone(record.steps[0]), step_id,
      started_at: new Date(Date.parse(record.started_at) + index * 30000).toISOString(),
      finished_at: new Date(Date.parse(record.started_at) + (index + 1) * 30000).toISOString(),
      object_refs: { project_id: "project-fixture", batch_id: "batch-fixture", asset_id: "asset-fixture", request_id: "request-fixture", draft_id: "draft-fixture", render_id: "render-fixture", timeline_id: "timeline-fixture", profile_snapshot_id: "profile-fixture", export_id: "export-fixture", output_sha256: log.sha256 },
      ui_provenance: { executor_kind: "browser-automation", surface: "browser-ui", file_selection: "native-dialog", authorization: "interactive", open_downloaded_file: "actual-file" },
      listening_observed: "Synthetic tone fixture only, not a real listening result",
      scenarios: index < 9 ? [`C${index + 1}`] : [],
      evidence: [{ ...finalVideo, start_seconds: index * 30, end_seconds: (index + 1) * 30 }, log],
    };
    const state = { schema_version: 1, step_id, attempt_id: finalRecord.attempt_id, build_input_digest: current.build_input_digest, object_refs: step.object_refs, sources: record.sources.map(({ source_id, sha256, bytes }) => ({ source_id, sha256, bytes })), persistent_state_digest: digest("synthetic final state") };
    if (step_id === "WIN-07") { step.evidence.push({ ...log, evidence_id: "OUTPUT", kind: "output" }); state.qc_status = "passed"; state.output_sha256 = log.sha256; }
    if (step_id === "WIN-09") { step.negative_test = { error_code: "FIXTURE_ERROR", correct_state: true, recovery_available: true }; step.issue_after_unrelated_success = "still-queryable"; state.error_code = "FIXTURE_ERROR"; state.affected_operation_committed = false; }
    const path = `docs/evidence/assets/final-${step_id}-state.json`;
    await put(path, state);
    step.evidence.push({ evidence_id: `STATE-${step_id}`, kind: "host-state", path, sha256: digest(await readFile(resolve(root, path))) });
    finalRecord.steps.push(step);
  }
  assert.equal((await validateInteractionRecord(root, finalRecord, finalWp, current)).verified_steps.length, 9);
  const discontinuous = clone(finalRecord);
  discontinuous.finished_at = "2026-10-03T10:05:20Z";
  await assert.rejects(validateInteractionRecord(root, discontinuous, finalWp, current), /one continuous recording/);
  const missingFinalStep = clone(finalRecord); missingFinalStep.steps.pop();
  await assert.rejects(validateInteractionRecord(root, missingFinalStep, finalWp, current), /missing required step/);

  // Exercise the actual completion transaction, not only the validator function.
  await put("package.json", "{}\n");
  await put("docs/program/PROGRAM_REGISTRY.yaml", { docs_schema_version: "1", active_program_id: "test", programs: [{ program_id: "test", directory: "docs/program/test", specification_root: "docs/specifications/test", status: "ongoing" }] });
  await put("docs/program/test/EXECUTION_MANIFEST.yaml", { program_id: "test", work_packages: [wp] });
  await put("docs/program/test/CAPABILITY_MATRIX.yaml", [{ capability_id: "CAP-IMPORT", acceptance_ids: ["ACC-IMPORT"], work_package_ids: [wp.work_package_id], status: "tested", evidence_ids: ["EVD-TEST"] }]);
  await put("docs/program/test/ACCEPTANCE_MATRIX.yaml", [{ acceptance_id: "ACC-IMPORT", capability_ids: ["CAP-IMPORT"], status: "tested", evidence_ids: ["EVD-TEST"] }]);
  await put("docs/program/test/STATE.yaml", { program_id: "test", active_work_package: wp.work_package_id, code_fingerprint: "old", debts: [] });
  await mkdir(resolve(root, "docs/current"), { recursive: true });
  await sync(false, root);
  await run("git", ["-c", "user.name=Validator fixture", "-c", "user.email=validator@example.invalid", "add", "package.json"], { cwd: root });
  await run("git", ["-c", "user.name=Validator fixture", "-c", "user.email=validator@example.invalid", "commit", "-m", "Synthetic baseline"], { cwd: root });
  current.repository_commit = (await run("git", ["rev-parse", "HEAD"], { cwd: root })).stdout.trim();
  await put("package.json", "{\n}\n");
  current.dirty_build_diff_digest = digest((await run("git", ["diff", "HEAD", "--binary", "--", "package.json"], { cwd: root })).stdout);
  current.code_fingerprint = await fingerprint(root);
  await sync(false, root);
  record.build = current;
  const recordPath = "docs/evidence/assets/record.json";
  const recordBytes = JSON.stringify(record);
  await put(recordPath, recordBytes);
  const receiptPath = "docs/evidence/assets/receipt.json";
  const receipt = await createInteractionReceipt(root, record, wp, current);
  const receiptBytes = JSON.stringify(receipt);
  await put(receiptPath, receiptBytes);
  const header = `---\nevidence_id: EVD-TEST\nwork_package_id: ${wp.work_package_id}\ncode_fingerprint: ${current.code_fingerprint}\ncapability_ids: [CAP-IMPORT]\nacceptance_ids: [ACC-IMPORT]\nresult: passed\ninteraction_record: ${recordPath}\ninteraction_record_sha256: ${digest(recordBytes)}\ninteraction_receipt: ${receiptPath}\ninteraction_receipt_sha256: ${digest(receiptBytes)}\n---\n`;
  await put("docs/evidence/runs/EVD-TEST.md", header);
  const governed = ["docs/program/test/EXECUTION_MANIFEST.yaml", "docs/program/test/CAPABILITY_MATRIX.yaml", "docs/program/test/ACCEPTANCE_MATRIX.yaml", "docs/program/test/STATE.yaml", "docs/program/PROGRAM_REGISTRY.yaml", "docs/current/STATUS.md", "docs/current/WORK.md", "docs/current/VALIDATION.md", "docs/current/DEBT.md", "docs/DOCUMENT_INDEX.md"];
  const snapshot = () => Promise.all(governed.map(async (file) => [file, await readFile(resolve(root, file), "utf8")]));
  const before = await snapshot();
  const options = { identityResolver: async () => ({ ...current, build_input_digest: "0".repeat(64) }) };
  await assert.rejects(completeWork(root, wp.work_package_id, "EVD-TEST", options), /build_input_digest drift/);
  await assert.rejects(completeWork(root, wp.work_package_id, "EVD-TEST", { ...options, mode: "static" }), /build_input_digest drift/);
  assert.deepEqual(await snapshot(), before, "rejected product completion must leave all programme/generated files byte-identical");
  await put("docs/evidence/runs/EVD-TEST.md", header.replace("result: passed", "result: failed\nresult: passed"));
  await assert.rejects(completeWork(root, wp.work_package_id, "EVD-TEST", { identityResolver: async () => current }), /duplicate/);
  assert.deepEqual(await snapshot(), before, "duplicate completion header must leave governance byte-identical");
  await put("docs/evidence/runs/EVD-TEST.md", header);
  await assert.rejects(assertInteractionCompletion(root, wp, parseEvidenceHeader(header.replace("result: passed", "result: failed")), { identityResolver: async () => current }), /result must be passed/);
  const staticResult = await assertInteractionCompletion(root, wp, parseEvidenceHeader(header), { identityResolver: async () => ({ ...current, runtime: undefined }), mode: "static" });
  assert.match(staticResult.machine_claim, /CI record\/receipt/);
  await assertInteractionCompletion(root, wp, parseEvidenceHeader(header), { identityResolver: async () => ({ ...current, repository_commit: "9".repeat(40), dirty_build_diff_digest: digest("") }), mode: "static" });
  await assert.rejects(assertInteractionCompletion(root, wp, parseEvidenceHeader(header), { identityResolver: async () => ({ ...current, repository_commit: "9".repeat(40), dirty_build_diff_digest: digest("") }) }), /dirty_build_diff_digest drift/);
  await run("git", ["add", "package.json"], { cwd: root });
  await run("git", ["-c", "user.name=Validator fixture", "-c", "user.email=validator@example.invalid", "commit", "-m", "Same accepted source bytes"], { cwd: root });
  const committedIdentity = { ...current, code_fingerprint: await fingerprint(root), repository_commit: (await run("git", ["rev-parse", "HEAD"], { cwd: root })).stdout.trim(), dirty_build_diff_digest: digest((await run("git", ["diff", "HEAD", "--binary", "--", "package.json"], { cwd: root })).stdout) };
  assert.notEqual(committedIdentity.repository_commit, current.repository_commit);
  assert.equal(committedIdentity.code_fingerprint, current.code_fingerprint);
  await assertInteractionCompletion(root, wp, parseEvidenceHeader(header), { identityResolver: async () => committedIdentity, mode: "static" });
  const privateRoot = await mkdtemp(resolve(tmpdir(), "ave-private-gate-"));
  const previousEvidenceRoot = process.env.AVE_INTERACTION_EVIDENCE_ROOT;
  try {
    process.env.AVE_INTERACTION_EVIDENCE_ROOT = privateRoot;
    const privateRecord = clone(record);
    const references = [...privateRecord.sources.map((item) => item.evidence), ...privateRecord.steps.flatMap((item) => item.evidence), privateRecord.independent_review.evidence];
    const copied = new Set();
    for (const ref of references) {
      const target = ref.path.split('/').at(-1);
      if (!copied.has(target)) { await copyFile(resolve(root, ref.path), resolve(privateRoot, target)); copied.add(target); }
      ref.path = `external:${target}`;
    }
    const privateReceipt = await createInteractionReceipt(root, privateRecord, wp, current);
    const privateRecordPath = "docs/evidence/assets/private-record.json", privateReceiptPath = "docs/evidence/assets/private-receipt.json";
    const privateBytes = JSON.stringify(privateRecord), privateReceiptBytes = JSON.stringify(privateReceipt);
    await put(privateRecordPath, privateBytes); await put(privateReceiptPath, privateReceiptBytes);
    const privateHeader = parseEvidenceHeader(header.replace(recordPath, privateRecordPath).replace(digest(recordBytes), digest(privateBytes)).replace(receiptPath, privateReceiptPath).replace(digest(receiptBytes), digest(privateReceiptBytes)));
    delete process.env.AVE_INTERACTION_EVIDENCE_ROOT;
    await assertInteractionCompletion(root, wp, privateHeader, { identityResolver: async () => ({ ...current, runtime: undefined }), mode: "static" });
    await assert.rejects(assertInteractionCompletion(root, wp, privateHeader, { identityResolver: async () => current }), /explicitly configured external/);
    const broken = clone(privateReceipt); broken.artifacts = broken.artifacts.filter((item) => !item.path.includes("WIN-01-state"));
    const brokenBytes = JSON.stringify(broken); await put(privateReceiptPath, brokenBytes); privateHeader.set("interaction_receipt_sha256", digest(brokenBytes));
    await assert.rejects(assertInteractionCompletion(root, wp, privateHeader, { identityResolver: async () => current, mode: "static" }), /absent from locally verified/);
  } finally {
    if (previousEvidenceRoot === undefined) delete process.env.AVE_INTERACTION_EVIDENCE_ROOT; else process.env.AVE_INTERACTION_EVIDENCE_ROOT = previousEvidenceRoot;
    await rm(privateRoot, { recursive: true, force: true });
  }
  await completeWork(root, wp.work_package_id, "EVD-TEST", { identityResolver: async () => current });
  const completed = JSON.parse(await readFile(resolve(root, governed[0]), "utf8")).work_packages[0];
  assert.equal(completed.status, "completed");
  assert.equal(completed.interaction_evidence_id, "EVD-TEST");
  console.log("interaction integrity/media/provenance/failure refusal and real completion zero-write transaction passed; fixtures are NOT UI acceptance");
} finally { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); }
