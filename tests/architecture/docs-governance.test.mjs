import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { completeWork } from "../../scripts/docs/complete-work.mjs";
import { fingerprint } from "../../scripts/docs/fingerprint.mjs";
import { assertProgramTopology, computeReadyWorkPackages, exactWorkPackage } from "../../scripts/docs/program-model.mjs";
import { startWork } from "../../scripts/docs/start-work.mjs";
import { sync } from "../../scripts/docs/sync.mjs";

const run = promisify(execFile);
const root = resolve(new URL("../../", import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, (value) => value.slice(1)));
const check = await readFile(resolve(root, "scripts/docs/check.mjs"), "utf8");
for (const marker of [
  "duplicate ${label}",
  "manifest missing capability",
  "capability acceptance",
  "claimed capability without evidence",
  "archive active reference",
  "generated drift",
  "latest evidence fingerprint mismatch",
  "two active work packages across programmes",
  "cross-programme dependency is unknown",
  "registry active programme mismatch",
]) if (!check.includes(marker)) throw new Error(`governance fixture missing ${marker}`);

const programA = { manifest: { work_packages: [{ work_package_id: "WP-A", status: "completed", dependencies: [] }] } };
const programB = { manifest: { work_packages: [{ work_package_id: "WP-B", status: "ready", dependencies: ["WP-A"] }] } };
assert.deepEqual(computeReadyWorkPackages([programA, programB], programB), ["WP-B"], "cross-programme completion must make a ready package discoverable");
assert.equal(programB.manifest.work_packages[0].status, "ready", "ready discovery must never activate a package");
assert.equal(exactWorkPackage([programA, programB], "WP-B").workPackage.work_package_id, "WP-B");
assert.throws(() => exactWorkPackage([programA, { manifest: { work_packages: [{ work_package_id: "WP-A", status: "ready", dependencies: [] }] } }], "WP-A"), /ambiguous work package/);
assert.throws(() => exactWorkPackage([programA, programB], "WP-UNKNOWN"), /unknown work package/);

const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const tracked = [
  "docs/program/PROGRAM_REGISTRY.yaml",
  "docs/program/program-a/EXECUTION_MANIFEST.yaml",
  "docs/program/program-a/CAPABILITY_MATRIX.yaml",
  "docs/program/program-a/ACCEPTANCE_MATRIX.yaml",
  "docs/program/program-a/STATE.yaml",
  "docs/program/program-b/EXECUTION_MANIFEST.yaml",
  "docs/program/program-b/CAPABILITY_MATRIX.yaml",
  "docs/program/program-b/ACCEPTANCE_MATRIX.yaml",
  "docs/program/program-b/STATE.yaml",
  "docs/current/STATUS.md",
  "docs/current/WORK.md",
  "docs/current/VALIDATION.md",
  "docs/current/DEBT.md",
  "docs/DOCUMENT_INDEX.md",
];
const evidenceFile = "docs/evidence/runs/EVD-TEST.md";
const snapshotted = [...tracked, evidenceFile];

async function writeFixture(configure = (value) => value) {
  const fixtureRoot = await mkdtemp(resolve(tmpdir(), "ave-programme-governance-"));
  await run("git", ["init"], { cwd: fixtureRoot });
  await mkdir(resolve(fixtureRoot, "docs/program/program-a"), { recursive: true });
  await mkdir(resolve(fixtureRoot, "docs/program/program-b"), { recursive: true });
  await mkdir(resolve(fixtureRoot, "docs/current"), { recursive: true });
  await mkdir(resolve(fixtureRoot, "docs/evidence/runs"), { recursive: true });
  const value = configure({
    registry: {
      docs_schema_version: "1",
      active_program_id: "program-b",
      programs: [
        { program_id: "program-a", directory: "docs/program/program-a", specification_root: "docs/specifications/a", status: "ongoing" },
        { program_id: "program-b", directory: "docs/program/program-b", specification_root: "docs/specifications/b", status: "ongoing" },
      ],
    },
    programs: [
      {
        manifest: { program_id: "program-a", work_packages: [{ work_package_id: "WP-A", status: "completed", dependencies: [], capability_ids: [], acceptance_ids: [], specification_files: [], allowed_paths: [], plan_file: null }] },
        capabilities: [], acceptances: [],
        state: { program_id: "program-a", active_work_package: null, last_completed_work_package: "WP-A", next_ready_work_packages: [], code_fingerprint: "old", latest_evidence_id: null, debts: [] },
      },
      {
        manifest: { program_id: "program-b", work_packages: [{ work_package_id: "WP-B", status: "ready", dependencies: ["WP-A"], capability_ids: ["CAP-B"], acceptance_ids: ["ACC-B"], specification_files: [], allowed_paths: [], plan_file: null }] },
        capabilities: [{ capability_id: "CAP-B", acceptance_ids: ["ACC-B"], work_package_ids: ["WP-B"], status: "tested", evidence_ids: ["EVD-TEST"] }],
        acceptances: [{ acceptance_id: "ACC-B", capability_ids: ["CAP-B"], status: "tested", evidence_ids: ["EVD-TEST"] }],
        state: { program_id: "program-b", active_work_package: null, last_completed_work_package: null, next_ready_work_packages: [], code_fingerprint: "old", latest_evidence_id: null, debts: [] },
      },
    ],
    evidence: { present: true, evidence_id: "EVD-TEST", work_package_id: "WP-B", code_fingerprint: "current", capability_ids: ["CAP-B"], acceptance_ids: ["ACC-B"] },
  });
  await writeFile(resolve(fixtureRoot, "package.json"), "{}\n");
  await writeFile(resolve(fixtureRoot, tracked[0]), json(value.registry));
  for (const [index, id] of ["program-a", "program-b"].entries()) {
    const program = value.programs[index];
    const base = `docs/program/${id}`;
    await writeFile(resolve(fixtureRoot, `${base}/EXECUTION_MANIFEST.yaml`), json(program.manifest));
    await writeFile(resolve(fixtureRoot, `${base}/CAPABILITY_MATRIX.yaml`), json(program.capabilities));
    await writeFile(resolve(fixtureRoot, `${base}/ACCEPTANCE_MATRIX.yaml`), json(program.acceptances));
    await writeFile(resolve(fixtureRoot, `${base}/STATE.yaml`), json(program.state));
  }
  for (const file of tracked.slice(9)) await writeFile(resolve(fixtureRoot, file), "sentinel\n");
  await run("git", ["add", "."], { cwd: fixtureRoot });
  const currentFingerprint = await fingerprint(fixtureRoot);
  for (const [index, id] of ["program-a", "program-b"].entries()) {
    value.programs[index].state.code_fingerprint = currentFingerprint;
    await writeFile(resolve(fixtureRoot, `docs/program/${id}/STATE.yaml`), json(value.programs[index].state));
  }
  if (value.evidence.present) {
    const evidenceFingerprint = value.evidence.code_fingerprint === "current" ? currentFingerprint : value.evidence.code_fingerprint;
    await writeFile(resolve(fixtureRoot, evidenceFile), `---\nevidence_id: ${value.evidence.evidence_id}\nwork_package_id: ${value.evidence.work_package_id}\ncode_fingerprint: ${evidenceFingerprint}\ncapability_ids: [${value.evidence.capability_ids.join(", ")}]\nacceptance_ids: [${value.evidence.acceptance_ids.join(", ")}]\nresult: passed\n---\n`);
  }
  return fixtureRoot;
}

async function snapshot(fixtureRoot) {
  return Promise.all(snapshotted.map(async (file) => {
    try { return [file, await readFile(resolve(fixtureRoot, file), "utf8")]; } catch { return [file, "<missing>"]; }
  }));
}

async function assertRejectedWithoutWrites(configure, action, pattern) {
  const fixtureRoot = await writeFixture(configure);
  try {
    const before = await snapshot(fixtureRoot);
    await assert.rejects(action(fixtureRoot), pattern);
    assert.deepEqual(await snapshot(fixtureRoot), before, "a rejected governance transition must leave every governed/generated file byte-identical");
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
}

function activateProgramB(value) {
  value.programs[1].manifest.work_packages[0].status = "active";
  value.programs[1].state.active_work_package = "WP-B";
  return value;
}

await assertRejectedWithoutWrites((value) => {
  value.registry.programs[1].program_id = "program-a";
  return value;
}, (fixtureRoot) => sync(false, fixtureRoot), /duplicate Programme ID/);

await assertRejectedWithoutWrites((value) => {
  value.registry.programs[1].directory = "docs/program/program-a";
  return value;
}, (fixtureRoot) => sync(false, fixtureRoot), /duplicate Programme directory/);

await assertRejectedWithoutWrites((value) => {
  value.registry.active_program_id = "program-unknown";
  return value;
}, (fixtureRoot) => sync(false, fixtureRoot), /registry active programme is unknown/);

await assertRejectedWithoutWrites((value) => {
  activateProgramB(value);
  value.registry.active_program_id = "program-a";
  return value;
}, (fixtureRoot) => sync(false, fixtureRoot), /registry active programme mismatch/);

await assertRejectedWithoutWrites((value) => {
  value.programs[0].manifest.work_packages[0].status = "active";
  value.programs[0].state.active_work_package = "WP-A";
  value.programs[1].manifest.work_packages[0].status = "active";
  value.programs[1].manifest.work_packages[0].dependencies = [];
  value.programs[1].state.active_work_package = "WP-B";
  return value;
}, (fixtureRoot) => sync(false, fixtureRoot), /two active work packages across programmes/);

await assertRejectedWithoutWrites((value) => {
  value.programs[1].manifest.work_packages[0].status = "active";
  return value;
}, (fixtureRoot) => sync(false, fixtureRoot), /programme state active mismatch/);

await assertRejectedWithoutWrites((value) => {
  value.programs[0].manifest.work_packages.push({ ...value.programs[0].manifest.work_packages[0], work_package_id: "WP-DUP" });
  value.programs[1].manifest.work_packages.push({ ...value.programs[1].manifest.work_packages[0], work_package_id: "WP-DUP", dependencies: [] });
  return value;
}, (fixtureRoot) => startWork(fixtureRoot, "WP-B"), /duplicate Work Package ID/);

await assertRejectedWithoutWrites((value) => {
  value.programs[0].capabilities.push({ capability_id: "CAP-DUP" });
  value.programs[1].capabilities.push({ capability_id: "CAP-DUP" });
  return value;
}, (fixtureRoot) => startWork(fixtureRoot, "WP-B"), /duplicate Capability ID/);

await assertRejectedWithoutWrites((value) => {
  value.programs[0].acceptances.push({ acceptance_id: "ACC-DUP" });
  value.programs[1].acceptances.push({ acceptance_id: "ACC-DUP" });
  return value;
}, (fixtureRoot) => startWork(fixtureRoot, "WP-B"), /duplicate Acceptance ID/);

await assertRejectedWithoutWrites((value) => {
  value.programs[1].manifest.work_packages[0].dependencies = ["WP-MISSING"];
  return value;
}, (fixtureRoot) => startWork(fixtureRoot, "WP-B"), /cross-programme dependency is unknown/);

await assertRejectedWithoutWrites((value) => {
  value.programs[0].manifest.work_packages.push({ ...value.programs[0].manifest.work_packages[0], work_package_id: "WP-PENDING", status: "pending" });
  value.programs[1].manifest.work_packages[0].dependencies = ["WP-PENDING"];
  return value;
}, (fixtureRoot) => startWork(fixtureRoot, "WP-B"), /work package dependency is incomplete/);

await assertRejectedWithoutWrites((value) => {
  value.programs[0].manifest.work_packages[0].status = "active";
  value.programs[0].state.active_work_package = "WP-A";
  value.programs[1].manifest.work_packages[0].status = "active";
  value.programs[1].manifest.work_packages[0].dependencies = [];
  value.programs[1].state.active_work_package = "WP-B";
  return value;
}, (fixtureRoot) => completeWork(fixtureRoot, "WP-B", "EVD-TEST"), /two active work packages across programmes/);

await assertRejectedWithoutWrites((value) => {
  activateProgramB(value);
  value.evidence.present = false;
  return value;
}, (fixtureRoot) => completeWork(fixtureRoot, "WP-B", "EVD-TEST"), /completion evidence is missing/);

await assertRejectedWithoutWrites((value) => {
  activateProgramB(value);
  value.evidence.evidence_id = "EVD-WRONG";
  return value;
}, (fixtureRoot) => completeWork(fixtureRoot, "WP-B", "EVD-TEST"), /completion evidence identity mismatch/);

await assertRejectedWithoutWrites((value) => {
  activateProgramB(value);
  value.evidence.work_package_id = "WP-A";
  return value;
}, (fixtureRoot) => completeWork(fixtureRoot, "WP-B", "EVD-TEST"), /completion evidence work package mismatch/);

await assertRejectedWithoutWrites((value) => {
  activateProgramB(value);
  value.evidence.code_fingerprint = "0".repeat(64);
  return value;
}, (fixtureRoot) => completeWork(fixtureRoot, "WP-B", "EVD-TEST"), /completion evidence fingerprint mismatch/);

await assertRejectedWithoutWrites((value) => {
  activateProgramB(value);
  value.evidence.capability_ids = [];
  return value;
}, (fixtureRoot) => completeWork(fixtureRoot, "WP-B", "EVD-TEST"), /completion evidence capability binding mismatch/);

await assertRejectedWithoutWrites((value) => {
  activateProgramB(value);
  value.evidence.acceptance_ids = [];
  return value;
}, (fixtureRoot) => completeWork(fixtureRoot, "WP-B", "EVD-TEST"), /completion evidence acceptance binding mismatch/);

await assertRejectedWithoutWrites((value) => {
  activateProgramB(value);
  value.programs[1].manifest.work_packages[0].capability_ids = [];
  return value;
}, (fixtureRoot) => completeWork(fixtureRoot, "WP-B", "EVD-TEST"), /work package ownership matrices are incomplete/);

const validRoot = await writeFixture();
try {
  await startWork(validRoot, "WP-B");
  let manifest = JSON.parse(await readFile(resolve(validRoot, "docs/program/program-b/EXECUTION_MANIFEST.yaml"), "utf8"));
  let state = JSON.parse(await readFile(resolve(validRoot, "docs/program/program-b/STATE.yaml"), "utf8"));
  assert.equal(manifest.work_packages[0].status, "active");
  assert.equal(state.active_work_package, "WP-B");
  let registry = JSON.parse(await readFile(resolve(validRoot, "docs/program/PROGRAM_REGISTRY.yaml"), "utf8"));
  assert.equal(registry.active_program_id, "program-b");
  let status = await readFile(resolve(validRoot, "docs/current/STATUS.md"), "utf8");
  let work = await readFile(resolve(validRoot, "docs/current/WORK.md"), "utf8");
  assert.match(status, /Active programme: program-b/);
  assert.match(status, /Active work package: WP-B/);
  assert.match(work, /WP-B:.*Programme: program-b/s);
  await completeWork(validRoot, "WP-B", "EVD-TEST");
  manifest = JSON.parse(await readFile(resolve(validRoot, "docs/program/program-b/EXECUTION_MANIFEST.yaml"), "utf8"));
  state = JSON.parse(await readFile(resolve(validRoot, "docs/program/program-b/STATE.yaml"), "utf8"));
  assert.equal(manifest.work_packages[0].status, "completed");
  assert.equal(state.active_work_package, null);
  assert.deepEqual(state.next_ready_work_packages, []);
  registry = JSON.parse(await readFile(resolve(validRoot, "docs/program/PROGRAM_REGISTRY.yaml"), "utf8"));
  assert.equal(registry.active_program_id, "program-b");
  status = await readFile(resolve(validRoot, "docs/current/STATUS.md"), "utf8");
  work = await readFile(resolve(validRoot, "docs/current/WORK.md"), "utf8");
  const validation = await readFile(resolve(validRoot, "docs/current/VALIDATION.md"), "utf8");
  const debt = await readFile(resolve(validRoot, "docs/current/DEBT.md"), "utf8");
  const index = await readFile(resolve(validRoot, "docs/DOCUMENT_INDEX.md"), "utf8");
  assert.match(status, /Active programme: program-b/);
  assert.match(status, /Active work package: none/);
  assert.match(work, /No active work package/);
  assert.match(validation, /program-b/);
  assert.match(debt, /No active deliberate debt/);
  assert.match(index, /program-b.*docs\/program\/program-b/);
} finally {
  await rm(validRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}

const backlogRoot = await writeFixture((value) => {
  value.programs[0].manifest.work_packages[0].status = "ready";
  value.programs[0].state.last_completed_work_package = null;
  value.programs[1].manifest.work_packages[0].dependencies = [];
  return value;
});
try {
  await sync(false, backlogRoot);
  const work = await readFile(resolve(backlogRoot, "docs/current/WORK.md"), "utf8");
  assert.match(work, /program-a\/WP-A/);
  assert.match(work, /program-b\/WP-B/);
  assert.match(work, /No active work package/);
  for (const id of ["program-a", "program-b"]) {
    const state = JSON.parse(await readFile(resolve(backlogRoot, `docs/program/${id}/STATE.yaml`), "utf8"));
    assert.equal(state.active_work_package, null, "sync must not activate either ready package");
  }
  const index = await readFile(resolve(backlogRoot, "docs/DOCUMENT_INDEX.md"), "utf8");
  assert.match(index, /program-a.*docs\/program\/program-a/);
  assert.match(index, /program-b.*docs\/program\/program-b/);
} finally {
  await rm(backlogRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}

for (const old of ["docs/CURRENT_STATUS.md", "docs/CURRENT_WORK.md"]) {
  const text = await readFile(resolve(root, old), "utf8");
  if (!/^DEPRECATED/m.test(text) || /## 已验证/.test(text)) throw new Error(`${old} stores status`);
}
console.log("multi-programme governance transition and zero-write failure contract passed");
