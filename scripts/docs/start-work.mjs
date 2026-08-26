import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { REGISTRY_FILE, activeWorkPackages, assertProgramTopology, completedWorkPackageIds, exactWorkPackage, jsonTextEntries, mergeTextEntries, withProgramPublication } from "./program-model.mjs";
import { prepareSync } from "./sync.mjs";

export async function startWork(root, id, options = {}) {
  return withProgramPublication(root, async ({ loadModel, publishTextFiles }) => {
    const value = await loadModel();
    assertProgramTopology(value.registry, value.programs);
    const target = exactWorkPackage(value.programs, id);
    const active = activeWorkPackages(value.programs).filter(({ workPackage }) => workPackage.work_package_id !== id);
    if (active.length) throw new Error(`another work package is active: ${active.map(({ workPackage }) => workPackage.work_package_id).join(", ")}`);
    if (!["pending", "ready", "active"].includes(target.workPackage.status)) throw new Error(`work package cannot start from ${target.workPackage.status}`);
    const done = completedWorkPackageIds(value.programs);
    for (const dependency of target.workPackage.dependencies) if (!done.has(dependency)) throw new Error(`work package dependency is incomplete: ${dependency}`);
    const sameProgramActive = target.program.manifest.work_packages.filter((candidate) => candidate.status === "active" && candidate.work_package_id !== id);
    if (sameProgramActive.length) throw new Error(`programme has another active work package: ${sameProgramActive.map((candidate) => candidate.work_package_id).join(", ")}`);

    target.workPackage.status = "active";
    target.program.state.active_work_package = id;
    value.registry.active_program_id = target.program.manifest.program_id;
    assertProgramTopology(value.registry, value.programs);
    const prepared = await prepareSync(root, value);
    const entries = mergeTextEntries(
      jsonTextEntries([
        [target.program.files.manifest, target.program.manifest],
        [REGISTRY_FILE, value.registry],
      ]),
      prepared.entries,
    );
    await publishTextFiles(entries);
    return prepared.modelValue;
  }, options);
}

const invoked = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const id = process.argv.slice(2).find((argument) => argument !== "--");
  if (!id) throw new Error("WP-ID required");
  await startWork(process.cwd(), id);
}
