import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fingerprint } from "./fingerprint.mjs";
import {
  activeWorkPackages,
  assertProgramTopology,
  computeReadyWorkPackages,
  resolveSpecification,
  withProgramPublication,
} from "./program-model.mjs";

const root = process.cwd();
const header = "<!-- GENERATED FILE: Do not edit manually. Update machine-readable program files and run pnpm docs:sync. -->\n";
export const normalizeGeneratedText = (value) => value.replace(/\r\n/g, "\n");

export async function prepareSync(modelRoot, value, codeFingerprint = undefined) {
  const resolvedFingerprint = codeFingerprint ?? await fingerprint(modelRoot);
  for (const program of value.programs) {
    program.state.next_ready_work_packages = computeReadyWorkPackages(value.programs, program);
    program.state.code_fingerprint = resolvedFingerprint;
  }
  return { modelValue: value, codeFingerprint: resolvedFingerprint, entries: syncTextEntries(value) };
}

export async function model(modelRoot = root, options = {}) {
  return withProgramPublication(modelRoot, async ({ loadModel }) => {
    const value = await loadModel();
    assertProgramTopology(value.registry, value.programs);
    return (await prepareSync(modelRoot, value)).modelValue;
  }, options);
}

function renderDebt(programs) {
  const debts = programs.flatMap((program) => (program.state.debts ?? []).map((debt) => ({
    programId: program.manifest.program_id,
    ...debt,
  })));
  if (debts.length === 0) return "No active deliberate debt is registered. Open a new EVD and record a debt entry before marking a blocked compromise as passed.\n";
  return `| Programme | Debt | Status | Capabilities | Acceptance | Exit condition |\n| --- | --- | --- | --- | --- | --- |\n${debts.map((debt) => `| ${debt.programId} | ${debt.debt_id}: ${debt.summary} | ${debt.status} | ${debt.capability_ids.join(", ")} | ${debt.acceptance_ids.join(", ")} | ${debt.exit_condition} |`).join("\n")}\n`;
}

export function render(modelValue) {
  const activeEntries = activeWorkPackages(modelValue.programs);
  const activeEntry = activeEntries[0];
  const activeProgramId = activeEntry?.program.manifest.program_id ?? modelValue.registry.active_program_id ?? null;
  const programmeRows = modelValue.programs.map((program) => `| ${program.manifest.program_id} | ${program.state.active_work_package ?? "none"} | ${program.state.next_ready_work_packages.join(", ") || "none"} | ${program.state.latest_evidence_id ?? "none"} |`).join("\n");
  const statusRows = modelValue.programs.flatMap((program) => Object.entries(program.capabilities.reduce((grouped, capability) => {
    (grouped[capability.status] ??= []).push(capability.capability_id);
    return grouped;
  }, {})).map(([status, capabilities]) => `| ${program.manifest.program_id} | ${status} | ${capabilities.join(", ")} |`)).join("\n");
  const active = activeEntry?.workPackage;
  const activeProgram = activeEntry?.program;
  const specificationLinks = active && activeProgram
    ? active.specification_files.map((file) => resolveSpecification(activeProgram.registration, file)).join(", ")
    : "";
  const readyBacklog = modelValue.programs.flatMap((program) => program.state.next_ready_work_packages.map((id) => `${program.manifest.program_id}/${id}`));
  const workBody = active && activeProgram
    ? `## ${active.work_package_id}: ${active.title}\n\nProgramme: ${activeProgram.manifest.program_id}\n\nCapability IDs: ${active.capability_ids.join(", ")}\n\nSpecifications: ${specificationLinks}\n\nAllowed paths: ${active.allowed_paths.join(", ")}\n\nRequired acceptance: ${active.acceptance_ids.join(", ")}\n\nThis package is active. Re-running \`pnpm docs:start -- ${active.work_package_id}\` is idempotent.`
    : `No active work package. Ready backlog: ${readyBacklog.join(", ") || "none"}. A ready package starts only through an explicit \`pnpm docs:start -- <WP-ID>\` command.`;
  const validationRows = modelValue.programs.map((program) => `| ${program.manifest.program_id} | ${program.state.code_fingerprint} | ${program.state.latest_evidence_id ?? "none"} | ${program.state.latest_validation_at ?? "unknown"} |`).join("\n");
  const indexProgrammeRows = modelValue.programs.map((program) => `| ${program.manifest.program_id} | \`${program.registration.directory}\` | \`${program.registration.specification_root}\` |`).join("\n");
  return {
    "docs/current/STATUS.md": header + `# Current Status\n\nP0 reliable-media loop: accepted baseline. Programme specifications never prove implementation.\n\n- Active programme: ${activeProgramId ?? "none"}\n- Active work package: ${active?.work_package_id ?? "none"}\n\n| Programme | Active package | Ready packages | Latest evidence |\n| --- | --- | --- | --- |\n${programmeRows}\n\n| Programme | Status | Capabilities |\n| --- | --- | --- |\n${statusRows}\n`,
    "docs/current/WORK.md": header + `# Current Work\n\n${workBody}\n`,
    "docs/current/VALIDATION.md": header + `# Current Validation\n\n| Programme | Code fingerprint | Latest evidence | Validated at |\n| --- | --- | --- | --- |\n${validationRows}\n\nP0 reliable-media is an accepted historical baseline; new capability remains specified until an EVD record establishes its exact bounded status.\n`,
    "docs/current/DEBT.md": header + `# Current Debt\n\n${renderDebt(modelValue.programs)}`,
    "docs/DOCUMENT_INDEX.md": header + `# Documentation Index\n\n| Class | Authority | Purpose |\n| --- | --- | --- |\n| Stable | \`PROJECT_GOAL.md\`, \`docs/product/\`, \`docs/architecture/\` | durable objective, scope and invariants |\n| Generated Current | \`docs/current/\` | one generated view of all programme status, work, validation and debt |\n| Programme Registry | \`docs/program/PROGRAM_REGISTRY.yaml\` | declared programmes and the currently selected programme |\n| Machine-readable Programmes | \`docs/program/*/EXECUTION_MANIFEST.yaml\`, \`CAPABILITY_MATRIX.yaml\`, \`ACCEPTANCE_MATRIX.yaml\`, \`STATE.yaml\` | executable scope, acceptance, state and packages |\n| Specification | \`docs/specifications/\`, \`docs/product-intelligence/\`, \`docs/intelligence/\` | normative future semantics; no completion status |\n| Evidence | \`docs/evidence/\` | append-only executed facts |\n| Research | \`docs/research/\` | source-qualified candidate analysis |\n| Decision | \`docs/decisions/\` | consequential recorded choices |\n| Archive | \`docs/archive/\` | historical context only |\n\n## Registered Programmes\n\n| Programme | Machine-readable directory | Specification root |\n| --- | --- | --- |\n${indexProgrammeRows}\n\nActive and ready package state remains exclusively in \`docs/current/\`; this index is navigation, not a second current-state authority.\n\nConflict order: code and executed tests/Evidence; generated current state; machine-readable programmes; stable documents; archive.\n`,
  };
}

export function syncTextEntries(modelValue) {
  return [
    ...Object.entries(render(modelValue)),
    ...modelValue.programs.map((program) => [program.files.state, `${JSON.stringify(program.state, null, 2)}\n`]),
  ];
}

export async function sync(check = false, syncRoot = root, options = {}) {
  return withProgramPublication(syncRoot, async ({ loadModel, publishTextFiles }) => {
    const value = await loadModel();
    assertProgramTopology(value.registry, value.programs);
    const prepared = await prepareSync(syncRoot, value);
    const drift = [];
    for (const [file, contents] of prepared.entries) {
      let existing = "";
      try { existing = await readFile(resolve(syncRoot, file), "utf8"); } catch {}
      if (normalizeGeneratedText(existing) !== normalizeGeneratedText(contents)) drift.push(file);
    }
    if (check && drift.length) throw new Error(`generated documents or programme state out of date: ${[...new Set(drift)].join(", ")}`);
    if (!check) await publishTextFiles(prepared.entries);
    return prepared.modelValue;
  }, options);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) sync(process.argv.includes("--check")).catch((error) => { console.error(error.message); process.exitCode = 1; });
