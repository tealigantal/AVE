import { randomUUID } from "node:crypto";
import { readFile, rename, rm, writeFile } from "node:fs/promises";
import { posix, resolve } from "node:path";

export const REGISTRY_FILE = "docs/program/PROGRAM_REGISTRY.yaml";

const parse = async (root, file) => JSON.parse(await readFile(resolve(root, file), "utf8"));

export async function loadProgramModel(root) {
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

export async function writeJsonFiles(root, entries) {
  await writeTextFiles(root, entries.map(([file, value]) => [file, `${JSON.stringify(value, null, 2)}\n`]));
}

export async function writeTextFiles(root, entries) {
  const staged = entries.map(([file, contents]) => {
    const target = resolve(root, file);
    return { target, temporary: `${target}.tmp-${process.pid}-${randomUUID()}`, contents };
  });
  try {
    await Promise.all(staged.map(({ temporary, contents }) => writeFile(temporary, contents)));
    for (const { temporary, target } of staged) await rename(temporary, target);
  } catch (error) {
    await Promise.all(staged.map(({ temporary }) => rm(temporary, { force: true }).catch(() => undefined)));
    throw error;
  }
}
