import { createHash, randomUUID } from "node:crypto";
import { lstat, mkdir, open, readFile, readdir, rename, rm } from "node:fs/promises";
import { dirname, isAbsolute, posix, relative, resolve, sep } from "node:path";
import { DatabaseSync } from "node:sqlite";

export const REGISTRY_FILE = "docs/program/PROGRAM_REGISTRY.yaml";
const TRANSACTION_DIRECTORY = ".docs-programme-transaction";
const LOCK_DATABASE = `${TRANSACTION_DIRECTORY}/publication-lock.sqlite`;
const JOURNAL_FILE = `${TRANSACTION_DIRECTORY}/journal.json`;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

const parse = async (root, file) => JSON.parse(await readFile(resolve(root, file), "utf8"));

async function loadProgramModelUnlocked(root) {
  const registry = await parse(root, REGISTRY_FILE);
  const programs = [];
  for (const registration of registry.programs) {
    const base = registration.directory;
    const files = {
      manifest: `${base}/EXECUTION_MANIFEST.yaml`,
      capabilities: `${base}/CAPABILITY_MATRIX.yaml`,
      acceptances: `${base}/ACCEPTANCE_MATRIX.yaml`,
      state: `${base}/STATE.yaml`,
    };
    const [manifest, capabilities, acceptances, state] = await Promise.all([
      parse(root, files.manifest),
      parse(root, files.capabilities),
      parse(root, files.acceptances),
      parse(root, files.state),
    ]);
    programs.push({ registration, files, manifest, capabilities, acceptances, state });
  }
  return { registry, programs };
}

export async function loadProgramModel(root, options = {}) {
  return withProgramPublication(root, ({ loadModel }) => loadModel(), options);
}

export function allWorkPackages(programs) {
  return programs.flatMap((program) => program.manifest.work_packages.map((workPackage) => ({ program, workPackage })));
}

export function exactWorkPackage(programs, id) {
  const matches = allWorkPackages(programs).filter(({ workPackage }) => workPackage.work_package_id === id);
  if (matches.length === 0) throw new Error(`unknown work package: ${id}`);
  if (matches.length > 1) throw new Error(`ambiguous work package: ${id}`);
  return matches[0];
}

export function activeWorkPackages(programs) {
  return allWorkPackages(programs).filter(({ workPackage }) => workPackage.status === "active");
}

export function completedWorkPackageIds(programs) {
  return new Set(allWorkPackages(programs)
    .filter(({ workPackage }) => ["completed", "accepted"].includes(workPackage.status))
    .map(({ workPackage }) => workPackage.work_package_id));
}

export function assertProgramTopology(registry, programs) {
  const unique = (values, label) => {
    if (new Set(values).size !== values.length) throw new Error(`duplicate ${label}`);
  };
  unique(registry.programs.map((program) => program.program_id), "Programme ID");
  unique(registry.programs.map((program) => program.directory), "Programme directory");
  const entries = allWorkPackages(programs);
  unique(entries.map(({ workPackage }) => workPackage.work_package_id), "Work Package ID");
  unique(programs.flatMap((program) => program.capabilities.map((capability) => capability.capability_id)), "Capability ID");
  unique(programs.flatMap((program) => program.acceptances.map((acceptance) => acceptance.acceptance_id)), "Acceptance ID");
  const programmeIds = new Set(programs.map((program) => program.manifest.program_id));
  if (!programmeIds.has(registry.active_program_id)) throw new Error(`registry active programme is unknown: ${registry.active_program_id}`);
  const workPackageIds = new Set(entries.map(({ workPackage }) => workPackage.work_package_id));
  const done = completedWorkPackageIds(programs);
  for (const program of programs) {
    if (program.registration.program_id !== program.manifest.program_id || program.state.program_id !== program.manifest.program_id) throw new Error(`programme identity mismatch: ${program.registration.program_id}`);
    const active = program.manifest.work_packages.filter((workPackage) => workPackage.status === "active");
    if (active.length > 1) throw new Error(`programme has two active work packages: ${program.manifest.program_id}`);
    if ((active[0]?.work_package_id ?? null) !== (program.state.active_work_package ?? null)) throw new Error(`programme state active mismatch: ${program.manifest.program_id}`);
    for (const workPackage of program.manifest.work_packages) {
      for (const dependency of workPackage.dependencies) if (!workPackageIds.has(dependency)) throw new Error(`cross-programme dependency is unknown: ${workPackage.work_package_id}/${dependency}`);
      if (workPackage.status === "active" && workPackage.dependencies.some((dependency) => !done.has(dependency))) throw new Error(`active cross-programme dependencies unmet: ${workPackage.work_package_id}`);
    }
  }
  const globalActive = activeWorkPackages(programs);
  if (globalActive.length > 1) throw new Error("two active work packages across programmes");
  if (globalActive[0] && globalActive[0].program.manifest.program_id !== registry.active_program_id) throw new Error("registry active programme mismatch");
}

export function computeReadyWorkPackages(programs, program) {
  const done = completedWorkPackageIds(programs);
  return program.manifest.work_packages
    .filter((workPackage) => ["pending", "ready"].includes(workPackage.status))
    .filter((workPackage) => workPackage.dependencies.every((dependency) => done.has(dependency)))
    .map((workPackage) => workPackage.work_package_id);
}

export function resolveSpecification(registration, specificationFile) {
  if (specificationFile.startsWith("docs/")) return posix.normalize(specificationFile);
  return posix.normalize(`${registration.specification_root}/${specificationFile}`);
}

const hashBytes = (bytes) => createHash("sha256").update(bytes).digest("hex");
const transactionPath = (root, file) => resolve(root, file);

function normalizeRelativeFile(file) {
  if (typeof file !== "string" || !file.trim() || isAbsolute(file)) throw new Error(`programme publication target must be root-relative: ${file}`);
  const normalized = posix.normalize(file.replaceAll("\\", "/"));
  if (normalized === "." || normalized === ".." || normalized.startsWith("../") || posix.isAbsolute(normalized)) throw new Error(`programme publication target escapes root: ${file}`);
  if (normalized === TRANSACTION_DIRECTORY || normalized.startsWith(`${TRANSACTION_DIRECTORY}/`)) throw new Error(`programme publication target is reserved: ${file}`);
  return normalized;
}

function resolveContained(root, file) {
  const normalizedRoot = resolve(root);
  const normalizedFile = normalizeRelativeFile(file);
  const target = resolve(normalizedRoot, normalizedFile);
  const fromRoot = relative(normalizedRoot, target);
  if (!fromRoot || fromRoot === ".." || fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot)) throw new Error(`programme publication target escapes root: ${file}`);
  return { file: fromRoot.split(sep).join("/"), target };
}

export function jsonTextEntries(entries) {
  return entries.map(([file, value]) => [file, `${JSON.stringify(value, null, 2)}\n`]);
}

export function mergeTextEntries(...groups) {
  const merged = new Map();
  for (const entries of groups) for (const [file, contents] of entries) {
    const normalized = normalizeRelativeFile(file);
    if (typeof contents !== "string") throw new Error(`programme publication contents must be text: ${normalized}`);
    const existing = merged.get(normalized);
    if (existing !== undefined && existing !== contents) throw new Error(`conflicting programme publication target: ${normalized}`);
    merged.set(normalized, contents);
  }
  return [...merged.entries()];
}

async function syncDirectory(directory) {
  let handle;
  try {
    handle = await open(directory, "r");
    await handle.sync();
  } catch (error) {
    if (!["EACCES", "EBADF", "EISDIR", "EINVAL", "ENOSYS", "EPERM"].includes(error?.code)) throw error;
  } finally {
    await handle?.close().catch(() => undefined);
  }
}

async function writeDurableFile(file, contents, flags = "wx") {
  const handle = await open(file, flags);
  try {
    await handle.writeFile(contents);
    await handle.sync();
  } finally {
    await handle.close();
  }
  await syncDirectory(dirname(file));
}

async function writeDurableReplacement(target, contents, suffix) {
  const temporary = `${target}.ave-docs-restore-${suffix}`;
  await rm(temporary, { force: true });
  await writeDurableFile(temporary, contents);
  await rename(temporary, target);
  await syncDirectory(dirname(target));
}

async function readOrdinaryFile(target, label) {
  try {
    const details = await lstat(target);
    if (!details.isFile()) throw new Error(`programme publication target is not a regular file: ${label}`);
    return await readFile(target);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function removeDurably(file) {
  await rm(file, { force: true });
  await syncDirectory(dirname(file));
}

function validateJournal(root, journal) {
  if (journal?.schema_version !== 1 || !UUID_PATTERN.test(journal.transaction_id) || !["staging", "prepared", "committed"].includes(journal.phase) || !Array.isArray(journal.entries) || journal.entries.length === 0) throw new Error("programme publication journal is invalid");
  if (Object.keys(journal).sort().join(",") !== "entries,phase,schema_version,transaction_id") throw new Error("programme publication journal has unknown fields");
  const files = new Set();
  return {
    ...journal,
    entries: journal.entries.map((entry, index) => {
      if (typeof entry?.file !== "string" || typeof entry?.temporary !== "string" || typeof entry?.existed !== "boolean" || !SHA256_PATTERN.test(entry?.new_sha256)) throw new Error("programme publication journal entry is invalid");
      if (Object.keys(entry).sort().join(",") !== "existed,file,new_sha256,old_base64,old_sha256,temporary") throw new Error("programme publication journal entry has unknown fields");
      const target = resolveContained(root, entry.file);
      const temporary = resolveContained(root, entry.temporary);
      if (entry.file !== target.file || entry.temporary !== temporary.file) throw new Error("programme publication journal paths are not canonical");
      if (files.has(target.file)) throw new Error(`duplicate programme publication journal target: ${target.file}`);
      files.add(target.file);
      const expectedTemporary = `${target.target}.ave-docs-new-${journal.transaction_id}-${index}`;
      if (temporary.target !== expectedTemporary) throw new Error(`programme publication journal temporary mismatch: ${entry.temporary}`);
      if (entry.existed) {
        if (typeof entry.old_base64 !== "string" || !SHA256_PATTERN.test(entry.old_sha256)) throw new Error(`programme publication journal before-image missing: ${target.file}`);
        const before = Buffer.from(entry.old_base64, "base64");
        if (before.toString("base64") !== entry.old_base64 || hashBytes(before) !== entry.old_sha256) throw new Error(`programme publication journal before-image corrupt: ${target.file}`);
      } else if (entry.old_base64 !== null || entry.old_sha256 !== null) throw new Error(`programme publication journal before-image unexpected: ${target.file}`);
      return { ...entry, file: target.file, target: target.target, temporary: temporary.target };
    }),
  };
}

async function readJournal(root) {
  try {
    const parsed = JSON.parse(await readFile(transactionPath(root, JOURNAL_FILE), "utf8"));
    return validateJournal(root, parsed);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function cleanupJournalArtifacts(root, journal) {
  for (const entry of journal?.entries ?? []) await removeDurably(entry.temporary);
  await removeDurably(transactionPath(root, JOURNAL_FILE));
}

async function recoverProgramPublication(root, options = {}) {
  // Managed readers recover before parsing: pre-commit journals roll back,
  // while an atomically replaced committed journal makes the new set authoritative.
  const journal = await readJournal(root);
  if (!journal) return "none";
  if (journal.phase === "committed") {
    for (const entry of journal.entries) {
      const current = await readOrdinaryFile(entry.target, entry.file);
      if (!current || hashBytes(current) !== entry.new_sha256) throw new Error(`committed programme publication target mismatch: ${entry.file}`);
    }
    await cleanupJournalArtifacts(root, journal);
    return "committed";
  }

  const states = [];
  for (const entry of journal.entries) {
    const current = await readOrdinaryFile(entry.target, entry.file);
    if (entry.existed) {
      if (!current) throw new Error(`programme publication target disappeared during recovery: ${entry.file}`);
      const digest = hashBytes(current);
      if (digest === entry.old_sha256) states.push("old");
      else if (digest === entry.new_sha256) states.push("new");
      else throw new Error(`programme publication target changed outside transaction: ${entry.file}`);
    } else if (!current) states.push("old");
    else if (hashBytes(current) === entry.new_sha256) states.push("new");
    else throw new Error(`programme publication target changed outside transaction: ${entry.file}`);
  }
  for (const [index, entry] of journal.entries.entries()) {
    if (states[index] === "new") {
      if (entry.existed) await writeDurableReplacement(entry.target, Buffer.from(entry.old_base64, "base64"), `${journal.transaction_id}-${index}`);
      else await removeDurably(entry.target);
      await options.onEvent?.({ phase: "afterRecoveryStep", index, file: entry.file, transactionId: journal.transaction_id });
    }
    await removeDurably(entry.temporary);
  }
  for (const entry of journal.entries) {
    const restored = await readOrdinaryFile(entry.target, entry.file);
    if (entry.existed ? !restored || hashBytes(restored) !== entry.old_sha256 : restored !== null) throw new Error(`programme publication recovery verification failed: ${entry.file}`);
  }
  await cleanupJournalArtifacts(root, journal);
  return "rolled_back";
}

async function acquirePublicationLock(root) {
  const directory = transactionPath(root, TRANSACTION_DIRECTORY);
  await mkdir(directory, { recursive: true });
  await syncDirectory(root);
  const database = new DatabaseSync(transactionPath(root, LOCK_DATABASE));
  try {
    database.exec("PRAGMA busy_timeout = 0");
    database.exec("BEGIN IMMEDIATE");
    return database;
  } catch (error) {
    database.close();
    if (/locked|busy/i.test(error instanceof Error ? error.message : String(error))) throw new Error("programme publication is already locked");
    throw error;
  }
}

function releasePublicationLock(database) {
  try { database.exec("ROLLBACK"); }
  finally { database.close(); }
}

async function assertKnownTransactionArtifacts(root) {
  const directory = transactionPath(root, TRANSACTION_DIRECTORY);
  const allowed = new Set(["journal.json", "publication-lock.sqlite", "publication-lock.sqlite-journal", "publication-lock.sqlite-shm", "publication-lock.sqlite-wal"]);
  const orphanJournalTemps = [];
  const unknown = [];
  for (const artifact of await readdir(directory, { withFileTypes: true })) {
    if (allowed.has(artifact.name)) {
      if (!artifact.isFile()) unknown.push(artifact.name);
      continue;
    }
    const prefix = "journal.json.tmp-";
    if (!artifact.name.startsWith(prefix) || !UUID_PATTERN.test(artifact.name.slice(prefix.length)) || !artifact.isFile()) {
      unknown.push(artifact.name);
      continue;
    }
    // This exact UUID namespace is programme-owned and never authoritative:
    // writeJournal can be killed before its bytes are complete, so content
    // validation cannot distinguish a torn self-write from foreign bytes.
    // The atomically renamed journal.json is the only recovery authority.
    orphanJournalTemps.push(resolve(directory, artifact.name));
  }
  if (unknown.length) throw new Error(`unknown programme publication transaction artifacts: ${unknown.join(", ")}`);
  return orphanJournalTemps;
}

async function removeOrphanJournalTemps(files) {
  for (const file of files) await removeDurably(file);
}

async function writeJournal(root, journal) {
  const target = transactionPath(root, JOURNAL_FILE);
  const temporary = `${target}.tmp-${randomUUID()}`;
  await writeDurableFile(temporary, `${JSON.stringify(journal, null, 2)}\n`);
  await rename(temporary, target);
  await syncDirectory(dirname(target));
}

async function publishTextFilesUnlocked(root, entries, options = {}) {
  const merged = mergeTextEntries(entries);
  const transactionId = randomUUID();
  const staged = [];
  const targetKeys = new Set();
  for (const [file, contents] of merged) {
    const { target, file: normalizedFile } = resolveContained(root, file);
    const targetKey = process.platform === "win32" ? target.toLowerCase() : target;
    if (targetKeys.has(targetKey)) throw new Error(`duplicate programme publication target: ${normalizedFile}`);
    targetKeys.add(targetKey);
    const before = await readOrdinaryFile(target, normalizedFile);
    const after = Buffer.from(contents, "utf8");
    if (before && before.equals(after)) continue;
    const stagedIndex = staged.length;
    staged.push({
      file: normalizedFile,
      target,
      temporary: `${target}.ave-docs-new-${transactionId}-${stagedIndex}`,
      existed: before !== null,
      old_base64: before?.toString("base64") ?? null,
      old_sha256: before ? hashBytes(before) : null,
      new_sha256: hashBytes(after),
      contents: after,
    });
  }
  if (staged.length === 0) return;
  let journal = {
    schema_version: 1,
    transaction_id: transactionId,
    phase: "staging",
    entries: staged.map(({ file, temporary, existed, old_base64, old_sha256, new_sha256 }) => ({ file, temporary: relative(resolve(root), temporary).split(sep).join("/"), existed, old_base64, old_sha256, new_sha256 })),
  };
  let journalDurable = false;
  try {
    // The journal names every same-filesystem temporary before staging begins.
    // Its atomically replaced phase gates publication and is the commit record.
    await writeJournal(root, journal);
    journalDurable = true;
    for (const entry of staged) {
      await rm(entry.temporary, { force: true });
      await writeDurableFile(entry.temporary, entry.contents);
    }
    journal = { ...journal, phase: "prepared" };
    await writeJournal(root, journal);
    for (const entry of staged) {
      const current = await readOrdinaryFile(entry.target, entry.file);
      if (entry.existed ? !current || hashBytes(current) !== entry.old_sha256 : current !== null) throw new Error(`programme publication target changed before commit: ${entry.file}`);
    }
    await options.onEvent?.({ phase: "beforePublish", count: staged.length, transactionId });
    for (const [index, entry] of staged.entries()) {
      const current = await readOrdinaryFile(entry.target, entry.file);
      if (entry.existed ? !current || hashBytes(current) !== entry.old_sha256 : current !== null) throw new Error(`programme publication target changed before publish: ${entry.file}`);
      await rename(entry.temporary, entry.target);
      await syncDirectory(dirname(entry.target));
      await options.onEvent?.({ phase: "afterPublish", index, file: entry.file, transactionId });
    }
    for (const entry of staged) {
      const current = await readOrdinaryFile(entry.target, entry.file);
      if (!current || hashBytes(current) !== entry.new_sha256) throw new Error(`programme publication verification failed: ${entry.file}`);
    }
    await options.onEvent?.({ phase: "beforeCommit", count: staged.length, transactionId });
    journal = { ...journal, phase: "committed" };
    await writeJournal(root, journal);
    await options.onEvent?.({ phase: "afterCommit", count: staged.length, transactionId });
    try { await cleanupJournalArtifacts(root, validateJournal(root, journal)); } catch {}
  } catch (error) {
    if (journalDurable) {
      let outcome;
      try { outcome = await recoverProgramPublication(root, options); }
      catch (recoveryError) { throw new AggregateError([error, recoveryError], "programme publication failed and recovery remains pending"); }
      if (outcome === "committed") return;
    } else for (const entry of staged) await rm(entry.temporary, { force: true });
    throw error;
  }
}

export async function withProgramPublication(root, operation, options = {}) {
  const normalizedRoot = resolve(root);
  const lock = await acquirePublicationLock(normalizedRoot);
  try {
    const orphanJournalTemps = await assertKnownTransactionArtifacts(normalizedRoot);
    await removeOrphanJournalTemps(orphanJournalTemps);
    await recoverProgramPublication(normalizedRoot, options);
    let published = false;
    return await operation({
      loadModel: () => loadProgramModelUnlocked(normalizedRoot),
      publishTextFiles: async (entries) => {
        if (published) throw new Error("programme publication may publish only one batch");
        published = true;
        return publishTextFilesUnlocked(normalizedRoot, entries, options);
      },
    });
  } finally {
    releasePublicationLock(lock);
  }
}

export async function writeJsonFiles(root, entries, options = {}) {
  await writeTextFiles(root, jsonTextEntries(entries), options);
}

export async function writeTextFiles(root, entries, options = {}) {
  await withProgramPublication(root, ({ publishTextFiles }) => publishTextFiles(entries), options);
}
