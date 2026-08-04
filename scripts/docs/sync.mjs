import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fingerprint } from "./fingerprint.mjs";

const root = process.cwd();
const p = (value) => resolve(root, value);
const load = async (value) => JSON.parse(await readFile(p(value), "utf8"));
const header = "<!-- GENERATED FILE: Do not edit manually. Update machine-readable program files and run pnpm docs:sync. -->\n";
export const normalizeGeneratedText = (value) => value.replace(/\r\n/g, "\n");

export async function model() {
  const [manifest, caps, accept, state] = await Promise.all([
    load("docs/program/editing-execution-v1/EXECUTION_MANIFEST.yaml"),
    load("docs/program/editing-execution-v1/CAPABILITY_MATRIX.yaml"),
    load("docs/program/editing-execution-v1/ACCEPTANCE_MATRIX.yaml"),
    load("docs/program/editing-execution-v1/STATE.yaml"),
  ]);
  const done = new Set(manifest.work_packages.filter((workPackage) => ["completed", "accepted"].includes(workPackage.status)).map((workPackage) => workPackage.work_package_id));
  const ready = manifest.work_packages.filter((workPackage) => ["ready", "pending"].includes(workPackage.status) && workPackage.dependencies.every((dependency) => done.has(dependency))).map((workPackage) => workPackage.work_package_id);
  state.next_ready_work_packages = ready;
  if (!manifest.work_packages.find((workPackage) => workPackage.work_package_id === state.active_work_package && workPackage.status === "active")) state.active_work_package = ready[0] ?? null;
  state.code_fingerprint = await fingerprint(root);
  return { manifest, caps, accept, state };
}

function renderDebt(debts = []) {
  if (debts.length === 0) return "No active deliberate debt is registered in STATE.yaml. Open a new EVD and record a debt entry before marking a blocked compromise as passed.\n";
  return `| Debt | Status | Capabilities | Acceptance | Exit condition |\n| --- | --- | --- | --- | --- |\n${debts.map((debt) => `| ${debt.debt_id}: ${debt.summary} | ${debt.status} | ${debt.capability_ids.join(", ")} | ${debt.acceptance_ids.join(", ")} | ${debt.exit_condition} |`).join("\n")}\n`;
}

export function render(modelValue) {
  const active = modelValue.manifest.work_packages.find((workPackage) => workPackage.work_package_id === modelValue.state.active_work_package);
  const statusRows = Object.entries(modelValue.caps.reduce((grouped, capability) => ((grouped[capability.status] ??= []).push(capability.capability_id), grouped), {})).map(([status, capabilities]) => `| ${status} | ${capabilities.join(", ")} |`).join("\n");
  return {
    "docs/current/STATUS.md": header + `# Current Status\n\nP0 reliable-media loop: accepted baseline. editing-execution-v1: specified programme.\n\n- Active work package: ${modelValue.state.active_work_package ?? "none"}\n- Ready packages: ${modelValue.state.next_ready_work_packages.join(", ") || "none"}\n- Code fingerprint: ${modelValue.state.code_fingerprint}\n- Latest evidence: ${modelValue.state.latest_evidence_id}\n\n| Status | Capabilities |\n| --- | --- |\n${statusRows}\n`,
    "docs/current/WORK.md": header + `# Current Work\n\n${active ? `## ${active.work_package_id}: ${active.title}\n\nCapability IDs: ${active.capability_ids.join(", ")}\n\nSpecifications: ${active.specification_files.map((file) => `../specifications/editing-execution-v1/${file}`).join(", ")}\n\nAllowed paths: ${active.allowed_paths.join(", ")}\n\nRequired acceptance: ${active.acceptance_ids.join(", ")}\n\nStart with: \`pnpm docs:start -- ${active.work_package_id}\`` : "No ready work package."}\n`,
    "docs/current/VALIDATION.md": header + `# Current Validation\n\nLatest evidence: ${modelValue.state.latest_evidence_id}. The current code fingerprint is ${modelValue.state.code_fingerprint}.\n\nP0 reliable-media is an accepted historical baseline; v1 enhancement acceptance remains specified until individual EVD records establish it.\n`,
    "docs/current/DEBT.md": header + `# Current Debt\n\n${renderDebt(modelValue.state.debts)}`,
    "docs/DOCUMENT_INDEX.md": header + "# Documentation Index\n\n| Class | Authority | Purpose |\n| --- | --- | --- |\n| Stable | `PROJECT_GOAL.md`, `docs/product/`, `docs/architecture/` | durable objective, scope and invariants |\n| Generated Current | `docs/current/` | generated status, work, validation and debt |\n| Machine-readable Program | `docs/program/editing-execution-v1/*.yaml` | executable scope, acceptance, state and packages |\n| Specification | `docs/specifications/` | normative future semantics; no completion status |\n| Evidence | `docs/evidence/` | append-only executed facts |\n| Research | `docs/research/` | source-qualified candidate analysis |\n| Decision | `docs/decisions/` | consequential recorded choices |\n| Archive | `docs/archive/` | historical context only |\n\nConflict order: code and executed tests/Evidence; generated current state; machine-readable programme; stable documents; archive.\n",
  };
}

export async function sync(check = false) {
  const modelValue = await model();
  const output = render(modelValue);
  const drift = [];
  for (const [file, contents] of Object.entries(output)) {
    let existing = "";
    try { existing = await readFile(p(file), "utf8"); } catch {}
    if (normalizeGeneratedText(existing) !== normalizeGeneratedText(contents)) drift.push(file);
    if (!check) await writeFile(p(file), contents);
  }
  if (!check) await writeFile(p("docs/program/editing-execution-v1/STATE.yaml"), JSON.stringify(modelValue.state, null, 2) + "\n");
  if (check && drift.length) throw new Error(`generated documents out of date: ${drift.join(", ")}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) sync(process.argv.includes("--check")).catch((error) => { console.error(error.message); process.exitCode = 1; });
