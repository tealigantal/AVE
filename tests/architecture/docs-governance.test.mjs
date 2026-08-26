import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { completeWork } from "../../scripts/docs/complete-work.mjs";
import { fingerprint } from "../../scripts/docs/fingerprint.mjs";
import { assertProgramTopology, computeReadyWorkPackages, exactWorkPackage, loadProgramModel, writeTextFiles } from "../../scripts/docs/program-model.mjs";
import { startWork } from "../../scripts/docs/start-work.mjs";
import { sync } from "../../scripts/docs/sync.mjs";

const run = promisify(execFile);
const root = resolve(new URL("../../", import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, (value) => value.slice(1)));
const transactionChild = resolve(root, "tests/architecture/fixtures/docs-programme-transaction-child.mjs");
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

const transactionEntries = [
  ["transaction-a.txt", "new-a\n"],
  ["transaction-b.txt", "new-b\n"],
  ["transaction-c.txt", "new-c\n"],
];

async function optionalText(fixtureRoot, file) {
  try { return await readFile(resolve(fixtureRoot, file), "utf8"); } catch (error) { if (error?.code === "ENOENT") return null; throw error; }
}

async function transactionSnapshot(fixtureRoot) {
  return Promise.all(transactionEntries.map(async ([file]) => [file, await optionalText(fixtureRoot, file)]));
}

async function initializeTransactionTargets(fixtureRoot) {
  await writeFile(resolve(fixtureRoot, "transaction-a.txt"), "old-a\n");
  await writeFile(resolve(fixtureRoot, "transaction-b.txt"), "old-b\n");
}

async function assertTransactionDirectoryClean(fixtureRoot) {
  const metadata = await readdir(resolve(fixtureRoot, ".docs-programme-transaction"));
  assert.deepEqual(metadata.filter((name) => name !== "publication-lock.sqlite"), [], "successful or recovered publication must retain only the reusable SQLite mutex database");
  const residues = [];
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && ![".git", ".docs-programme-transaction"].includes(entry.name)) await walk(resolve(directory, entry.name));
      else if (entry.isFile() && (entry.name.includes(".ave-docs-new-") || entry.name.includes(".ave-docs-restore-"))) residues.push(resolve(directory, entry.name));
    }
  }
  await walk(fixtureRoot);
  assert.deepEqual(residues, [], "successful or recovered publication must remove nested same-filesystem staging files");
}

async function assertChildExit(fixtureRoot, mode, index, code) {
  await assert.rejects(run(process.execPath, [transactionChild, fixtureRoot, mode, String(index)]), (error) => error?.code === code);
}

for (const failureIndex of [0, 1, 2]) {
  const fixtureRoot = await writeFixture();
  try {
    await initializeTransactionTargets(fixtureRoot);
    const before = await transactionSnapshot(fixtureRoot);
    await assert.rejects(writeTextFiles(fixtureRoot, transactionEntries, { onEvent(event) { if (event.phase === "afterPublish" && event.index === failureIndex) throw new Error(`injected publish failure ${failureIndex}`); } }), new RegExp(`injected publish failure ${failureIndex}`));
    assert.deepEqual(await transactionSnapshot(fixtureRoot), before, `failure after publish ${failureIndex} must restore every old target and remove every newly-created target`);
    await assertTransactionDirectoryClean(fixtureRoot);
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
}

const crashRoot = await writeFixture();
try {
  await initializeTransactionTargets(crashRoot);
  const before = await transactionSnapshot(crashRoot);
  await assertChildExit(crashRoot, "crash-publish", 1, 86);
  assert.notDeepEqual(await transactionSnapshot(crashRoot), before, "forced exit must exercise a real partial on-disk publication");
  await loadProgramModel(crashRoot);
  assert.deepEqual(await transactionSnapshot(crashRoot), before, "the next managed read must recover a pre-commit crash before parsing programme authority");
  await assertTransactionDirectoryClean(crashRoot);
  await writeTextFiles(crashRoot, transactionEntries);
  assert.deepEqual(await transactionSnapshot(crashRoot), transactionEntries, "a recovered publication must be safely retryable");
  await assertTransactionDirectoryClean(crashRoot);
} finally {
  await rm(crashRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}

const committedCrashRoot = await writeFixture();
try {
  await initializeTransactionTargets(committedCrashRoot);
  await assertChildExit(committedCrashRoot, "crash-commit", 0, 87);
  assert.deepEqual(await transactionSnapshot(committedCrashRoot), transactionEntries, "the durable commit point must follow a complete new publication");
  await loadProgramModel(committedCrashRoot);
  assert.deepEqual(await transactionSnapshot(committedCrashRoot), transactionEntries, "post-commit recovery must retain the complete new state");
  await assertTransactionDirectoryClean(committedCrashRoot);
} finally {
  await rm(committedCrashRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}

const beforeCommitCrashRoot = await writeFixture();
try {
  await initializeTransactionTargets(beforeCommitCrashRoot);
  const before = await transactionSnapshot(beforeCommitCrashRoot);
  await assertChildExit(beforeCommitCrashRoot, "crash-before-commit", 0, 89);
  assert.deepEqual(await transactionSnapshot(beforeCommitCrashRoot), transactionEntries, "the before-commit crash must occur after every canonical target contains the new bytes");
  await loadProgramModel(beforeCommitCrashRoot);
  assert.deepEqual(await transactionSnapshot(beforeCommitCrashRoot), before, "without an atomic committed journal, recovery must roll every fully-published target back");
  await assertTransactionDirectoryClean(beforeCommitCrashRoot);
} finally {
  await rm(beforeCommitCrashRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}

const recoveryCrashRoot = await writeFixture();
try {
  await initializeTransactionTargets(recoveryCrashRoot);
  const before = await transactionSnapshot(recoveryCrashRoot);
  await assertChildExit(recoveryCrashRoot, "crash-publish", 1, 86);
  await assertChildExit(recoveryCrashRoot, "crash-recovery", 0, 88);
  assert.notDeepEqual(await transactionSnapshot(recoveryCrashRoot), before, "the recovery-crash fixture must stop after only one restore");
  await loadProgramModel(recoveryCrashRoot);
  assert.deepEqual(await transactionSnapshot(recoveryCrashRoot), before, "a second recovery must idempotently finish the interrupted rollback");
  await assertTransactionDirectoryClean(recoveryCrashRoot);
} finally {
  await rm(recoveryCrashRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}

const concurrentRecoveryRoot = await writeFixture();
try {
  await initializeTransactionTargets(concurrentRecoveryRoot);
  const before = await transactionSnapshot(concurrentRecoveryRoot);
  await assertChildExit(concurrentRecoveryRoot, "crash-publish", 1, 86);
  const recoveries = await Promise.allSettled([
    run(process.execPath, [transactionChild, concurrentRecoveryRoot, "recover", "0"]),
    run(process.execPath, [transactionChild, concurrentRecoveryRoot, "recover", "0"]),
  ]);
  assert.ok(recoveries.some((result) => result.status === "fulfilled"), "at least one post-crash contender must acquire the OS-released SQLite mutex and recover");
  for (const result of recoveries) if (result.status === "rejected") assert.match(result.reason?.stderr ?? result.reason?.message ?? "", /already locked|database is locked/i);
  await loadProgramModel(concurrentRecoveryRoot);
  assert.deepEqual(await transactionSnapshot(concurrentRecoveryRoot), before, "concurrent post-crash contenders must converge to the complete old state");
  await assertTransactionDirectoryClean(concurrentRecoveryRoot);
} finally {
  await rm(concurrentRecoveryRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}

const unknownContentRoot = await writeFixture();
try {
  await initializeTransactionTargets(unknownContentRoot);
  await assertChildExit(unknownContentRoot, "crash-publish", 0, 86);
  await writeFile(resolve(unknownContentRoot, "transaction-a.txt"), "external-writer\n");
  await assert.rejects(loadProgramModel(unknownContentRoot), /changed outside transaction/);
  assert.equal(await optionalText(unknownContentRoot, "transaction-a.txt"), "external-writer\n", "recovery must not overwrite bytes that match neither the old nor intended new hash");
  assert.ok((await readdir(resolve(unknownContentRoot, ".docs-programme-transaction"))).includes("journal.json"), "failed-safe recovery must retain its journal for diagnosis and retry");
} finally {
  await rm(unknownContentRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}

const forgedJournalRoot = await writeFixture();
try {
  await loadProgramModel(forgedJournalRoot);
  const transactionId = "11111111-1111-4111-8111-111111111111";
  const victim = `victim.ave-docs-new-${transactionId}-0`;
  await writeFile(resolve(forgedJournalRoot, victim), "must-survive\n");
  await writeFile(resolve(forgedJournalRoot, ".docs-programme-transaction/journal.json"), json({ schema_version: 1, transaction_id: transactionId, phase: "staging", entries: [{ file: "absent-target.txt", temporary: victim, existed: false, old_base64: null, old_sha256: null, new_sha256: "0".repeat(64) }] }));
  await assert.rejects(loadProgramModel(forgedJournalRoot), /temporary mismatch/);
  assert.equal(await optionalText(forgedJournalRoot, victim), "must-survive\n", "an untrusted journal must not redirect recovery cleanup to an unrelated root-contained file");
} finally {
  await rm(forgedJournalRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}

const foreignMetadataRoot = await writeFixture();
try {
  await loadProgramModel(foreignMetadataRoot);
  const foreign = resolve(foreignMetadataRoot, ".docs-programme-transaction/committed");
  await writeFile(foreign, "unknown-foreign-content\n");
  await assert.rejects(loadProgramModel(foreignMetadataRoot), /unknown programme publication transaction artifacts/);
  assert.equal(await readFile(foreign, "utf8"), "unknown-foreign-content\n", "unknown transaction metadata must be retained and fail closed");
} finally {
  await rm(foreignMetadataRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}

for (const [name, createArtifact] of [
  ["journal.json.tmp-not-a-uuid", (artifact) => writeFile(artifact, "unknown-foreign-content\n")],
  ["journal.json.tmp-22222222-2222-4222-8222-222222222222", (artifact) => mkdir(artifact)],
]) {
  const foreignJournalTempRoot = await writeFixture();
  try {
    await loadProgramModel(foreignJournalTempRoot);
    const artifact = resolve(foreignJournalTempRoot, ".docs-programme-transaction", name);
    await createArtifact(artifact);
    await assert.rejects(loadProgramModel(foreignJournalTempRoot), /unknown programme publication transaction artifacts/);
    assert.ok((await readdir(resolve(foreignJournalTempRoot, ".docs-programme-transaction"))).includes(name), "unknown journal temporary artifacts must be retained and fail closed");
  } finally {
    await rm(foreignJournalTempRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
}

const tornJournalTempRoot = await writeFixture();
try {
  await loadProgramModel(tornJournalTempRoot);
  const torn = resolve(tornJournalTempRoot, ".docs-programme-transaction/journal.json.tmp-11111111-1111-4111-8111-111111111111");
  await writeFile(torn, "{\"schema_version\":");
  await loadProgramModel(tornJournalTempRoot);
  assert.equal(await optionalText(tornJournalTempRoot, ".docs-programme-transaction/journal.json.tmp-11111111-1111-4111-8111-111111111111"), null, "a strictly named non-authoritative journal temp must be recoverable even when its self-write was torn");
} finally {
  await rm(tornJournalTempRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}

const liveLockRoot = await writeFixture();
try {
  await initializeTransactionTargets(liveLockRoot);
  let releasePublisher;
  let publisherLocked;
  const locked = new Promise((resolveLocked) => { publisherLocked = resolveLocked; });
  const release = new Promise((resolveRelease) => { releasePublisher = resolveRelease; });
  const publication = writeTextFiles(liveLockRoot, transactionEntries, { async onEvent(event) { if (event.phase === "beforePublish") { publisherLocked(); await release; } } });
  await locked;
  await assert.rejects(loadProgramModel(liveLockRoot), /already locked/, "a second managed reader or writer must not observe a live publication");
  releasePublisher();
  await publication;
  await assertTransactionDirectoryClean(liveLockRoot);
} finally {
  await rm(liveLockRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}

const atomicStartRoot = await writeFixture();
try {
  const before = await snapshot(atomicStartRoot);
  await assert.rejects(startWork(atomicStartRoot, "WP-B", { onEvent(event) { if (event.phase === "afterPublish" && event.index === 0) throw new Error("injected start publication failure"); } }), /injected start publication failure/);
  assert.deepEqual(await snapshot(atomicStartRoot), before, "a failed start publication must restore manifest, registry, every state and every generated view together");
  await assertTransactionDirectoryClean(atomicStartRoot);
} finally {
  await rm(atomicStartRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}

const atomicCompleteRoot = await writeFixture();
try {
  await startWork(atomicCompleteRoot, "WP-B");
  const before = await snapshot(atomicCompleteRoot);
  await assert.rejects(completeWork(atomicCompleteRoot, "WP-B", "EVD-TEST", { onEvent(event) { if (event.phase === "afterPublish" && event.index === 1) throw new Error("injected completion publication failure"); } }), /injected completion publication failure/);
  assert.deepEqual(await snapshot(atomicCompleteRoot), before, "a failed completion publication must restore matrices, manifest, every state and every generated view together");
  await assertTransactionDirectoryClean(atomicCompleteRoot);
} finally {
  await rm(atomicCompleteRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}

const atomicSyncRoot = await writeFixture();
try {
  const before = await snapshot(atomicSyncRoot);
  await assert.rejects(sync(false, atomicSyncRoot, { onEvent(event) { if (event.phase === "afterPublish" && event.index === 1) throw new Error("injected sync publication failure"); } }), /injected sync publication failure/);
  assert.deepEqual(await snapshot(atomicSyncRoot), before, "a failed sync publication must restore every state and generated view together");
  await assertTransactionDirectoryClean(atomicSyncRoot);
} finally {
  await rm(atomicSyncRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}

const validRoot = await writeFixture();
try {
  const startEvents = [];
  await startWork(validRoot, "WP-B", { onEvent: (event) => startEvents.push(event) });
  assert.equal(startEvents.filter((event) => event.phase === "beforePublish").length, 1, "start must publish authority, state and generated views in one batch");
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
  const completeEvents = [];
  await completeWork(validRoot, "WP-B", "EVD-TEST", { onEvent: (event) => completeEvents.push(event) });
  assert.equal(completeEvents.filter((event) => event.phase === "beforePublish").length, 1, "completion must publish authority, state and generated views in one batch");
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
  const syncEvents = [];
  await sync(false, backlogRoot, { onEvent: (event) => syncEvents.push(event) });
  assert.equal(syncEvents.filter((event) => event.phase === "beforePublish").length, 1, "sync must publish every state and generated view in one batch");
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
