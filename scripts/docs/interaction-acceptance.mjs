import { createHash } from "node:crypto";
import { execFile as execFileCallback } from "node:child_process";
import { lstat, readFile, realpath, writeFile } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { exactWorkPackage, loadProgramModel } from "./program-model.mjs";
import { assertRuntimeBuildProvenance, currentBuildIdentity, digest } from "../docker/build-identity.mjs";
import { validateHumanImportAcceptance } from "./human-import-acceptance.mjs";

const prefix = "WP-S3-RELIABLE-";
const execFile = promisify(execFileCallback);
const policies = {
  "BASELINE-001": { kind: "tooling" },
  "IMPORT-001": { steps: ["WIN-01", "WIN-02", "WIN-08"] },
  "PREVIEW-001": { steps: ["WIN-01", "WIN-03", "WIN-08"] },
  "JOURNEY-001": { steps: ["WIN-04", "WIN-05", "WIN-06", "WIN-07", "WIN-08", "WIN-09"], scenarios: ["C1", "C2", "C3", "C4", "C5", "C6", "C8", "C9"] },
  // The user accepted the unverified WIN-09 risk for P4 and P5 on 2026-11-06.
  "UX-001": { steps: ["WIN-10"] },
  "ACCEPTANCE-001": { steps: ["WIN-01", "WIN-02", "WIN-03", "WIN-04", "WIN-05", "WIN-06", "WIN-07", "WIN-08", "WIN-10"], scenarios: Array.from({ length: 9 }, (_, i) => `C${i + 1}`), continuous: true },
};
const reject = (message) => { throw new Error(`INTERACTION_ACCEPTANCE_REJECTED: ${message}`); };
const object = (value, name) => { if (!value || typeof value !== "object" || Array.isArray(value)) reject(`${name} must be an object`); return value; };
const string = (value, name) => { if (typeof value !== "string" || !value.trim() || value.length > 10000) reject(`${name} is required`); return value; };
const hash = (value, name) => { if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) reject(`${name} digest is invalid`); return value; };
const date = (value, name) => { string(value, name); if (!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) reject(`${name} needs a timezone-qualified time`); return Date.parse(value); };
const unique = (values, name) => { if (!Array.isArray(values) || values.length === 0 || new Set(values).size !== values.length) reject(`${name} must be a nonempty unique array`); return values; };

export function interactionPolicy(workPackage) {
  const id = workPackage.work_package_id;
  if (!id.startsWith(prefix)) {
    if (workPackage.interaction_acceptance !== undefined) reject(`unregistered interaction policy for ${id}`);
    return null;
  }
  const expected = policies[id.slice(prefix.length)];
  if (!expected) reject(`unknown reliable work package ${id}`);
  const configured = object(workPackage.interaction_acceptance, "manifest interaction_acceptance");
  if (expected.kind === "tooling") {
    if (configured.kind !== "tooling" || Object.keys(configured).length !== 1) reject("baseline may only use the tooling policy");
    return expected;
  }
  if (configured.kind !== "product") reject("product package cannot bypass real interaction gate");
  const actual = unique(configured.required_steps, "manifest required_steps").slice().sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected.steps.slice().sort())) reject("manifest required_steps differ from the registered scope");
  if (JSON.stringify(configured.required_scenarios ?? []) !== JSON.stringify(expected.scenarios ?? [])) reject("manifest scenarios differ from the registered scope");
  if (configured.subjective_acceptance_required === true) reject("human feedback is optional, not a completion prerequisite");
  return expected;
}

export async function readVerifiedEvidence(root, reference) {
  object(reference, "evidence reference");
  const file = string(reference.path, "evidence path");
  hash(reference.sha256, "evidence");
  const external = file.startsWith("external:");
  const fileRoot = external ? process.env.AVE_INTERACTION_EVIDENCE_ROOT : root;
  const local = external ? file.slice("external:".length) : file;
  if (!fileRoot || isAbsolute(local) || local.includes("\\") || local.split("/").includes("..") || (!external && !local.startsWith("docs/evidence/"))) reject("evidence must use a contained repository path or an explicitly configured external evidence root");
  const target = resolve(fileRoot, local);
  const actualRoot = await realpath(fileRoot);
  const actual = await realpath(target);
  const sub = relative(actualRoot, actual);
  if (!sub || isAbsolute(sub) || sub === ".." || sub.startsWith(`..${sep}`)) reject("evidence symlink escapes repository");
  if (!(await lstat(target)).isFile()) reject("evidence is not an ordinary file");
  const bytes = await readFile(target);
  if (createHash("sha256").update(bytes).digest("hex") !== reference.sha256) reject(`evidence digest mismatch ${file}`);
  return bytes;
}

async function probeRecording(root, reference) {
  const external = reference.path.startsWith("external:");
  const target = resolve(external ? process.env.AVE_INTERACTION_EVIDENCE_ROOT : root, external ? reference.path.slice(9) : reference.path);
  const { stdout } = await execFile(process.env.AVE_FFPROBE ?? "ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", target], { timeout: 30000, maxBuffer: 1024 * 1024, windowsHide: true });
  const value = JSON.parse(stdout);
  const duration = Number(value.format?.duration);
  if (!Number.isFinite(duration) || duration <= 0 || !value.streams?.some((stream) => stream.codec_type === "video")) reject("recording is not a valid time-bounded video");
  return { duration, audio: value.streams.some((stream) => stream.codec_type === "audio") };
}

function compareBuild(record, current, mode, { runtimeRequired = true } = {}) {
  object(record, "build identity");
  if (!/^[a-f0-9]{40,64}$/.test(record.repository_commit ?? "")) reject("repository commit missing");
  for (const field of ["code_fingerprint", "build_input_digest", "dirty_build_diff_digest"]) {
    hash(record[field], field);
    if ((mode !== "static" || field !== "dirty_build_diff_digest") && record[field] !== current[field]) reject(`current ${field} drift`);
  }
  if (mode !== "static" && record.repository_commit !== current.repository_commit) reject("repository commit drift");
  if (!runtimeRequired) {
    if (record.runtime !== undefined) reject("source-only identity must not claim a current runtime");
    return;
  }
  object(record.runtime, "runtime identity");
  hash(record.runtime.digest, "runtime identity");
  if (!current.runtime || current.runtime.digest !== record.runtime.digest) reject("running image/runtime identity drift");
  if (!Array.isArray(record.runtime.services) || record.runtime.services.length !== 2) reject("two service image identities required");
  for (const service of ["desktop", "whisper"]) {
    const matches = record.runtime.services.filter((entry) => entry.service === service);
    if (matches.length !== 1) reject(`unique ${service} identity required`);
    const entry = matches[0];
    if (!/^sha256:[a-f0-9]{64}$/.test(entry.image_id ?? "")) reject(`${service} image ID invalid`);
    hash(entry.runtime_digest, `${service} runtime`);
    hash(entry.configuration_digest, `${service} configuration`);
    if (digest({ manifest: entry.manifest, tools: entry.tools, build_input_digest: entry.build_input_digest }) !== entry.runtime_digest) reject(`${service} runtime manifest digest mismatch`);
    const currentEntry = current.runtime.services.find((item) => item.service === service);
    if (!currentEntry || ["image_id", "runtime_digest", "configuration_digest", "build_input_digest"].some((field) => entry[field] !== currentEntry[field])) reject(`${service} runtime drift`);
  }
  if (digest(record.runtime.services.map(({ service, image_id, configuration_digest, runtime_digest }) => ({ service, image_id, configuration_digest, runtime_digest }))) !== record.runtime.digest) reject("runtime summary digest mismatch");
}

export async function validateInteractionRecord(root, record, workPackage, current, { readEvidence = readVerifiedEvidence, probe = probeRecording, mode = "live" } = {}) {
  const policy = interactionPolicy(workPackage);
  if (!policy || policy.kind === "tooling") reject("not a product interaction record");
  object(record, "record");
  if (record.schema_version !== 1) reject("unsupported interaction record version");
  string(record.record_id, "record_id"); string(record.attempt_id, "attempt_id");
  if (record.work_package_id !== workPackage.work_package_id) reject("record work package mismatch");
  if (JSON.stringify(record.acceptance_ids) !== JSON.stringify(workPackage.acceptance_ids)) reject("acceptance binding mismatch");
  const start = date(record.started_at, "started_at"), end = date(record.finished_at, "finished_at");
  if (end <= start) reject("record time interval invalid");
  const executor = object(record.executor, "executor");
  string(executor.id, "executor id"); string(executor.tool_version, "executor tool version");
  if (!["human", "browser-automation", "native-automation"].includes(executor.kind)) reject("executor must describe actual UI operations");
  const environment = object(record.environment, "environment");
  if (!/^Windows\b/i.test(string(environment.os, "os"))) reject("Windows real operation required");
  for (const field of ["application", "browser", "timezone", "screen", "scaling", "audio_output", "audio_capture"]) string(environment[field], `environment ${field}`);
  compareBuild(record.build, current, mode);
  assertRuntimeBuildProvenance({ ...current, runtime: record.build.runtime });
  unique(record.sources?.map((source) => source.source_id), "sources");
  for (const source of record.sources) {
    hash(source.sha256, "source"); string(source.license_or_authorization, "source rights");
    if (!Number.isSafeInteger(source.bytes) || source.bytes < 1) reject("source size invalid");
    if (source.evidence?.sha256 !== source.sha256 || (await readEvidence(root, source.evidence)).byteLength !== source.bytes) reject("source reference identity/size mismatch");
  }
  if (!Array.isArray(record.steps)) reject("steps missing");
  unique(record.steps.map((step) => step.step_id), "steps");
  const scenarioIds = new Set();
  const probes = new Map();
  const continuousRecordings = [];
  let previousStepEnd = start;
  for (const expected of policy.steps) if (!record.steps.some((step) => step.step_id === expected)) reject(`missing required step ${expected}`);
  for (const step of record.steps) {
    if (!/^WIN-(?:0[1-9]|10)$/.test(step.step_id)) reject("unknown step ID");
    if (step.result !== "pass") reject(`${step.step_id} is ${step.result ?? "missing"}, not pass`);
    for (const field of ["preconditions", "action", "expected", "observed", "persistent_state", "recovery_observed"]) string(step[field], `${step.step_id} ${field}`);
    const stepStart = date(step.started_at, "step start"), stepEnd = date(step.finished_at, "step end");
    if (stepEnd <= stepStart || stepStart < start || stepEnd > end) reject("step outside recording interval");
    if (stepStart < previousStepEnd) reject("steps overlap or are out of order");
    previousStepEnd = stepEnd;
    const refs = object(step.object_refs, "object refs");
    string(refs.project_id, "project_id");
    for (const [key, value] of Object.entries(refs)) string(value, `object ref ${key}`);
    const requiredRefs = { "WIN-01": ["batch_id", "asset_id"], "WIN-02": ["batch_id"], "WIN-03": ["asset_id"], "WIN-04": ["request_id", "draft_id", "render_id"], "WIN-05": ["draft_id", "timeline_id"], "WIN-06": ["request_id", "profile_snapshot_id"], "WIN-07": ["draft_id", "render_id", "export_id", "output_sha256"] }[step.step_id] ?? [];
    for (const key of requiredRefs) string(refs[key], `${step.step_id} ${key}`);
    if (refs.output_sha256) hash(refs.output_sha256, "output");
    const route = object(step.ui_provenance, "UI provenance");
    if (route.executor_kind !== executor.kind || !["browser-ui", "electron-ui"].includes(route.surface)) reject("executor/UI provenance mismatch");
    if (step.step_id === "WIN-01" && route.file_selection !== "native-dialog") reject("injected files cannot replace real file selection");
    if (step.step_id === "WIN-04" && route.authorization !== "interactive") reject("mock/backend authorization cannot replace UI consent");
    if (step.step_id === "WIN-07" && route.open_downloaded_file !== "actual-file") reject("download start does not prove a saved file opened");
    if (step.negative_test !== undefined) {
      object(step.negative_test, "negative test");
      string(step.negative_test.error_code, "negative error code");
      if (step.negative_test.correct_state !== true || step.negative_test.recovery_available !== true) reject("negative case lacks correct state/recovery");
    }
    if (!Array.isArray(step.scenarios)) reject("scenarios missing");
    for (const scenario of step.scenarios) { if (!/^C[1-9]$/.test(scenario)) reject("invalid scenario"); scenarioIds.add(scenario); }
    const media = unique(step.evidence?.map((item) => item.evidence_id), "step evidence");
    let recording = false, sound = false, log = false, stateBound = false;
    for (const evidence of step.evidence) {
      await readEvidence(root, evidence);
      if (!["recording", "screenshot", "log", "host-state", "output", "attachment"].includes(evidence.kind)) reject("invalid evidence kind");
      if (evidence.kind === "recording") {
        if (!Number.isFinite(evidence.start_seconds) || !Number.isFinite(evidence.end_seconds) || evidence.start_seconds < 0 || evidence.end_seconds <= evidence.start_seconds) reject("recording segment invalid");
        if (!Number.isFinite(evidence.duration_seconds) || evidence.end_seconds > evidence.duration_seconds) reject("recording segment outside media duration");
        if (evidence.end_seconds - evidence.start_seconds < (step.step_id === "WIN-09" ? 30 : 1)) reject("recording segment too short");
        if (evidence.executor_kind !== executor.kind) reject("recording executor mismatch");
        const key = `${evidence.path}:${evidence.sha256}`;
        if (!probes.has(key)) probes.set(key, await probe(root, evidence));
        const actual = probes.get(key);
        if (Math.abs(actual.duration - evidence.duration_seconds) > 0.1 || evidence.end_seconds > actual.duration + 0.01) reject("declared recording duration disagrees with actual media");
        if (evidence.audible_capture === true && !actual.audio) reject("claimed audio capture is absent from recording");
        const captureStart = date(evidence.captured_at, "recording captured_at");
        const segmentStart = captureStart + evidence.start_seconds * 1000;
        const segmentEnd = captureStart + evidence.end_seconds * 1000;
        if (segmentStart > stepStart || segmentEnd < stepEnd) reject("recording segment does not cover step wall time");
        continuousRecordings.push({ key, captureStart, duration: actual.duration });
        recording = true; sound ||= evidence.audible_capture === true;
      }
      log ||= evidence.kind === "log";
      if (evidence.kind === "host-state") {
        const state = JSON.parse((await readEvidence(root, evidence)).toString("utf8"));
        if (state.schema_version !== 1 || state.step_id !== step.step_id || state.attempt_id !== record.attempt_id || state.build_input_digest !== record.build.build_input_digest) reject("Host state context/build mismatch");
        if (!state.object_refs || Object.keys(state.object_refs).length !== Object.keys(refs).length || Object.entries(refs).some(([key, value]) => state.object_refs[key] !== value)) reject("Host state object identity mismatch");
        if (!Array.isArray(state.sources) || state.sources.length !== record.sources.length || new Set(state.sources.map((source) => source.source_id)).size !== state.sources.length || state.sources.some((source) => !record.sources.some((item) => item.source_id === source.source_id && item.sha256 === source.sha256 && item.bytes === source.bytes))) reject("Host state source identity mismatch");
        string(state.persistent_state_digest, "persistent state digest"); hash(state.persistent_state_digest, "persistent state");
        if (step.negative_test && (state.error_code !== step.negative_test.error_code || state.affected_operation_committed !== false)) reject("negative state differs from declared failure");
        if (step.step_id === "WIN-07" && (state.qc_status !== "passed" || state.output_sha256 !== refs.output_sha256)) reject("export state/QC identity mismatch");
        stateBound = true;
      }
    }
    if (!recording || !log || !stateBound) reject("recording, diagnostics and bound Host state required for each step");
    if (["WIN-03", "WIN-04", "WIN-06", "WIN-07"].includes(step.step_id) && (!sound || typeof step.listening_observed !== "string" || !step.listening_observed.trim())) reject("silent recording/waveform cannot replace listening evidence");
    if (step.step_id === "WIN-07" && !step.evidence.some((item) => item.kind === "output" && item.sha256 === refs.output_sha256)) reject("actual exported output digest not bound");
    if (step.step_id === "WIN-09" && (!step.negative_test || step.issue_after_unrelated_success !== "still-queryable")) reject("persistent failure recovery not proven");
  }
  if (policy.continuous) {
    const first = continuousRecordings[0];
    if (!first || continuousRecordings.some((entry) => entry.key !== first.key || entry.captureStart !== first.captureStart) || first.captureStart > start || first.captureStart + first.duration * 1000 < end) reject("final journey requires one continuous recording covering the full operation interval");
  }
  for (const scenario of policy.scenarios ?? []) if (!scenarioIds.has(scenario)) reject(`missing scenario ${scenario}`);
  const review = object(record.independent_review, "independent review");
  if (review.result !== "pass" || review.reviewer_id === executor.id) reject("independent review missing or not independent");
  string(review.reviewer_id, "reviewer"); string(review.observation, "review observation");
  if (!["human", "agent"].includes(review.reviewer_kind)) reject("invalid reviewer type");
  if (date(review.reviewed_at, "reviewed_at") < end) reject("review precedes completed operation");
  await readEvidence(root, review.evidence);
  if (!Array.isArray(record.unresolved_blockers) || record.unresolved_blockers.length) reject("unresolved blockers");
  if (!Array.isArray(record.prior_attempts)) reject("prior attempts declaration missing");
  unique(record.prior_attempts.length ? record.prior_attempts.map((attempt) => attempt.attempt_id) : ["none"], "prior attempts");
  for (const attempt of record.prior_attempts) {
    if (attempt.attempt_id === record.attempt_id) reject("attempt cannot replace itself");
    if (!Array.isArray(attempt.failed_steps) || !attempt.failed_steps.length || attempt.failed_steps.some((id) => !record.steps.some((step) => step.step_id === id))) reject("prior failure lacks matching revalidation");
    string(attempt.repair_identity, "repair identity");
    await readEvidence(root, attempt.evidence);
  }
  return { record_id: record.record_id, attempt_id: record.attempt_id, verified_steps: record.steps.map((step) => step.step_id), machine_claim: "record integrity and current identity only; real actions require independent observation" };
}

// A public receipt retains only verified identities, media metadata and sanitized Host state.
// It attests local integrity checks, never substitutes for independent observation of UI actions.
export async function createInteractionReceipt(root, record, workPackage, current) {
  const artifacts = new Map();
  const media = new Map();
  const key = (reference) => `${reference.path}:${reference.sha256}`;
  const result = await validateInteractionRecord(root, record, workPackage, current, {
    readEvidence: async (base, reference) => {
      const bytes = await readVerifiedEvidence(base, reference);
      const entry = { path: reference.path, sha256: reference.sha256, bytes: bytes.byteLength };
      if (reference.kind === "host-state") {
        const state = JSON.parse(bytes.toString("utf8"));
        entry.host_state = Object.fromEntries(["schema_version", "step_id", "attempt_id", "build_input_digest", "object_refs", "sources", "persistent_state_digest", "error_code", "affected_operation_committed", "qc_status", "output_sha256"].filter((field) => state[field] !== undefined).map((field) => [field, state[field]]));
      }
      artifacts.set(key(reference), entry);
      return bytes;
    },
    probe: async (base, reference) => {
      const value = await probeRecording(base, reference);
      media.set(key(reference), { path: reference.path, sha256: reference.sha256, ...value });
      return value;
    },
  });
  return { schema_version: 1, record_sha256: createHash("sha256").update(JSON.stringify(record)).digest("hex"), build: record.build, artifacts: [...artifacts.values()].sort((a, b) => a.path.localeCompare(b.path)), media: [...media.values()].sort((a, b) => a.path.localeCompare(b.path)), result };
}

export async function assertInteractionCompletion(root, workPackage, header, { identityResolver = currentBuildIdentity, mode = "live" } = {}) {
  const policy = interactionPolicy(workPackage);
  if (!policy || policy.kind === "tooling") return;
  if (header.get("result") !== "passed") reject("product completion evidence result must be passed");
  if (header.has("human_confirmation_record")) {
    if (header.has("interaction_record")) reject("ambiguous human and recording evidence");
    const record = JSON.parse((await readVerifiedEvidence(root, { path: header.get("human_confirmation_record"), sha256: header.get("human_confirmation_record_sha256") })).toString("utf8"));
    if (header.get("code_fingerprint") !== record.build?.code_fingerprint) reject("human evidence header/build fingerprint mismatch");
    const sourceOnlyP3Closeout = record.work_package_id === "WP-S3-RELIABLE-JOURNEY-001" && record.current_runtime_status === "not-running";
    const current = await identityResolver(root, { runtime: !sourceOnlyP3Closeout });
    const historicalP3Closeout = mode === "static" && sourceOnlyP3Closeout && ["completed", "accepted"].includes(workPackage.status);
    const verifiedBuild = historicalP3Closeout ? record.build : mode === "static" ? { ...current, runtime: record.build.runtime } : current;
    const result = await validateHumanImportAcceptance(root, record, workPackage, verifiedBuild, { readEvidence: readVerifiedEvidence, compareBuild, mode });
    if (!historicalP3Closeout) return result;
    return {
      ...result,
      machine_claim: "immutable P3 closeout source and engineering evidence verified against the recorded historical build; no current P4 source, runtime, UI, or human acceptance is claimed",
    };
  }
  const reference = { path: header.get("interaction_record"), sha256: header.get("interaction_record_sha256") };
  const record = JSON.parse((await readVerifiedEvidence(root, reference)).toString("utf8"));
  const receiptReference = { path: header.get("interaction_receipt"), sha256: header.get("interaction_receipt_sha256") };
  if (receiptReference.path?.startsWith("external:")) reject("CI integrity receipt must be public repository evidence");
  const receipt = JSON.parse((await readVerifiedEvidence(root, receiptReference)).toString("utf8"));
  if (mode === "live") {
    const actual = await createInteractionReceipt(root, record, workPackage, await identityResolver(root));
    if (JSON.stringify(receipt) !== JSON.stringify(actual)) reject("local integrity receipt differs from live verification");
    return actual.result;
  }
  if (mode !== "static") reject("unknown verification mode");
  if (receipt.schema_version !== 1 || receipt.record_sha256 !== createHash("sha256").update(JSON.stringify(record)).digest("hex") || JSON.stringify(receipt.build) !== JSON.stringify(record.build)) reject("CI receipt record/build binding mismatch");
  if (!Array.isArray(receipt.artifacts) || !Array.isArray(receipt.media)) reject("CI receipt manifests missing");
  const current = await identityResolver(root);
  // CI verifies the recorded runtime binding; local completion verifies the live runtime.
  const result = await validateInteractionRecord(root, record, workPackage, { ...current, runtime: record.build.runtime }, {
    mode: "static",
    readEvidence: async (base, ref) => {
      if (!ref.path?.startsWith("external:")) return readVerifiedEvidence(base, ref);
      const entry = receipt.artifacts.find((item) => item.path === ref.path && item.sha256 === ref.sha256);
      if (!entry || !Number.isSafeInteger(entry.bytes) || entry.bytes < 1) reject("private evidence is absent from locally verified receipt");
      if (ref.kind === "host-state") {
        if (!entry.host_state) reject("private Host state missing from receipt");
        return Buffer.from(JSON.stringify(entry.host_state));
      }
      return { byteLength: entry.bytes };
    },
    probe: async (_base, ref) => {
      const entry = receipt.media.find((item) => item.path === ref.path && item.sha256 === ref.sha256);
      if (!entry || !Number.isFinite(entry.duration) || entry.duration <= 0 || typeof entry.audio !== "boolean") reject("locally verified media metadata missing");
      return entry;
    },
  });
  return { ...result, machine_claim: "CI record/receipt integrity and current build inputs only; live runtime and private artifacts were checked at local completion" };
}

export function parseEvidenceHeader(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) reject("evidence header missing");
  const entries = match[1].split(/\r?\n/).filter(Boolean).map((line) => { const separator = line.indexOf(":"); if (separator < 1) reject("invalid evidence header"); return [line.slice(0, separator).trim(), line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "")]; });
  if (new Set(entries.map(([key]) => key)).size !== entries.length) reject("duplicate evidence header field");
  return new Map(entries);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [id, recordPath, recordHash, receiptPath] = process.argv.slice(2);
  if (!id || !recordPath || !recordHash || !receiptPath) reject("usage: WP-ID RECORD-PATH RECORD-SHA256 RECEIPT-PATH");
  if (!receiptPath.startsWith("docs/evidence/assets/") || receiptPath.includes("\\") || receiptPath.split("/").includes("..")) reject("receipt output must be contained repository evidence");
  const root = process.cwd();
  const model = await loadProgramModel(root);
  const { workPackage } = exactWorkPackage(model.programs, id);
  const record = JSON.parse((await readVerifiedEvidence(root, { path: recordPath, sha256: recordHash })).toString("utf8"));
  const receipt = await createInteractionReceipt(root, record, workPackage, await currentBuildIdentity(root));
  const bytes = JSON.stringify(receipt, null, 2) + "\n";
  // Existing receipts are immutable. The caller creates the owned evidence directory explicitly.
  const parent = await realpath(resolve(root, receiptPath, ".."));
  const sub = relative(await realpath(root), parent);
  if (isAbsolute(sub) || sub === ".." || sub.startsWith(`..${sep}`)) reject("receipt output symlink escapes repository");
  await writeFile(resolve(root, receiptPath), bytes, { flag: "wx" });
  console.log(`interaction_receipt: ${receiptPath}\ninteraction_receipt_sha256: ${createHash("sha256").update(bytes).digest("hex")}`);
}
