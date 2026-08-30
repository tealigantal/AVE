import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { activeWorkPackages, allWorkPackages, assertProgramTopology, resolveSpecification, withProgramPublication } from "./program-model.mjs";
import { normalizeGeneratedText, prepareSync, render } from "./sync.mjs";
import { capabilityScope, scopeFingerprint } from "./evidence-scope.mjs";
import { assertCurrentInterfaces } from "./interface-drift.mjs";

const root = process.cwd();

export async function check(checkRoot = root, options = {}) {
  return withProgramPublication(checkRoot, async ({ loadModel }) => {
  const p = (value) => resolve(checkRoot, value);
  const failures = [];
  const fail = (message) => failures.push(message);
  const required = [
    "docs/product/PRODUCT_VISION.md",
    "docs/product/FUTURE_UX_VISION.md",
    "docs/product/EDITING_CAPABILITY_SCOPE_V1.md",
    "docs/architecture/SYSTEM_ARCHITECTURE.md",
    "docs/architecture/EDITING_EXECUTION_ARCHITECTURE_V1.md",
    "docs/architecture/RENDER_BACKEND_ARCHITECTURE_V1.md",
    "docs/program/PROGRAM_REGISTRY.yaml",
    "docs/evidence/README.md",
  ];
  for (const file of required) {
    try { await access(p(file)); } catch { fail(`missing ${file}`); }
  }

  const value = await loadModel();
  try { await assertCurrentInterfaces(checkRoot); } catch (error) { fail(error.message); }
  let applicabilityIndex;
  try {
    applicabilityIndex = JSON.parse(await readFile(p("docs/evidence/APPLICABILITY_INDEX.json"), "utf8"));
    if (applicabilityIndex?.schema_version !== 1 || !Array.isArray(applicabilityIndex.entries)) throw new Error("bad schema");
  } catch {
    fail("missing or invalid Evidence applicability index");
    applicabilityIndex = { entries: [] };
  }
  assertProgramTopology(value.registry, value.programs);
  await prepareSync(checkRoot, value);
  const unique = (items, key, label) => {
    if (new Set(items.map((item) => item[key])).size !== items.length) fail(`duplicate ${label}`);
  };
  unique(value.registry.programs, "program_id", "Programme ID");
  unique(value.registry.programs, "directory", "Programme directory");
  unique(value.programs.flatMap((program) => program.capabilities), "capability_id", "Capability ID");
  unique(value.programs.flatMap((program) => program.acceptances), "acceptance_id", "Acceptance ID");
  unique(allWorkPackages(value.programs).map(({ workPackage }) => workPackage), "work_package_id", "Work Package ID");

  const programmeIds = new Set(value.programs.map((program) => program.manifest.program_id));
  if (!programmeIds.has(value.registry.active_program_id)) fail(`registry active programme is unknown: ${value.registry.active_program_id}`);
  const globalWorkPackages = allWorkPackages(value.programs);
  const globalWorkPackageIds = new Set(globalWorkPackages.map(({ workPackage }) => workPackage.work_package_id));
  const globalCapabilityIds = new Set(value.programs.flatMap((program) => program.capabilities.map((capability) => capability.capability_id)));
  const globalAcceptanceIds = new Set(value.programs.flatMap((program) => program.acceptances.map((acceptance) => acceptance.acceptance_id)));

  for (const program of value.programs) {
    const id = program.manifest.program_id;
    if (program.registration.program_id !== id) fail(`registry/manifest programme mismatch ${program.registration.program_id}`);
    if (program.state.program_id !== id) fail(`manifest/state programme mismatch ${id}`);
    for (const file of Object.values(program.files)) {
      try { await access(p(file)); } catch { fail(`missing ${file}`); }
    }
    const localCapabilityIds = new Set(program.capabilities.map((capability) => capability.capability_id));
    const localAcceptanceIds = new Set(program.acceptances.map((acceptance) => acceptance.acceptance_id));
    for (const workPackage of program.manifest.work_packages) {
      for (const capabilityId of workPackage.capability_ids) if (!localCapabilityIds.has(capabilityId)) fail(`manifest missing capability ${capabilityId}`);
      for (const acceptanceId of workPackage.acceptance_ids) if (!localAcceptanceIds.has(acceptanceId)) fail(`work package missing acceptance ${acceptanceId}`);
      for (const dependency of workPackage.dependencies) if (!globalWorkPackageIds.has(dependency)) fail(`cross-programme dependency is unknown: ${workPackage.work_package_id}/${dependency}`);
      for (const specification of workPackage.specification_files) {
        if (!specification.endsWith(".md")) fail(`bad specification ${workPackage.work_package_id}`);
        const resolved = resolveSpecification(program.registration, specification);
        try { await access(p(resolved)); } catch { fail(`missing specification ${workPackage.work_package_id}/${resolved}`); }
      }
      if (workPackage.allowed_paths.some((path) => path.includes("archive"))) fail(`archive active reference ${workPackage.work_package_id}`);
      if (workPackage.plan_file) {
        try { await access(p(workPackage.plan_file)); } catch { fail(`missing work-package plan ${workPackage.work_package_id}`); }
      }
      try { await access(p(`${program.registration.directory}/work-packages/${workPackage.work_package_id}.md`)); } catch { fail(`missing work-package document ${workPackage.work_package_id}`); }
    }
    for (const capability of program.capabilities) {
      if (!capability.acceptance_ids.length || capability.acceptance_ids.some((id) => !globalAcceptanceIds.has(id))) fail(`capability acceptance ${capability.capability_id}`);
      if (capability.work_package_ids.some((id) => !globalWorkPackageIds.has(id))) fail(`capability work package ${capability.capability_id}`);
      if (["implemented", "tested", "accepted"].includes(capability.status) && !capability.evidence_ids.length) fail(`claimed capability without evidence ${capability.capability_id}`);
    }
    for (const acceptance of program.acceptances) {
      if (acceptance.capability_ids.some((capabilityId) => !globalCapabilityIds.has(capabilityId))) fail(`acceptance capability ${acceptance.acceptance_id}`);
    }
    const manifestActive = program.manifest.work_packages.filter((workPackage) => workPackage.status === "active");
    if (manifestActive.length > 1) fail(`programme has two active work packages: ${id}`);
    if ((manifestActive[0]?.work_package_id ?? null) !== (program.state.active_work_package ?? null)) fail(`programme state active mismatch: ${id}`);
  }

  const active = activeWorkPackages(value.programs);
  if (active.length > 1) fail("two active work packages across programmes");
  if (active[0] && active[0].program.manifest.program_id !== value.registry.active_program_id) fail("registry active programme mismatch");
  const completed = new Set(globalWorkPackages.filter(({ workPackage }) => ["completed", "accepted"].includes(workPackage.status)).map(({ workPackage }) => workPackage.work_package_id));
  if (active[0]?.workPackage.dependencies.some((dependency) => !completed.has(dependency))) fail("active cross-programme dependencies unmet");

  for (const [file, expected] of Object.entries(render(value))) {
    let existing = "";
    try { existing = await readFile(p(file), "utf8"); } catch {}
    if (normalizeGeneratedText(existing) !== normalizeGeneratedText(expected)) fail(`generated drift ${file}`);
    if (/[A-Z]:\\|\\Users\\|password\s*=|api[_-]?key\s*=/i.test(existing)) fail(`sensitive/local path ${file}`);
  }

  for (const program of value.programs) {
    for (const capability of program.capabilities.filter((item) => ["implemented", "tested", "accepted"].includes(item.status))) {
      const scopeFingerprintValue = await scopeFingerprint(checkRoot, capabilityScope(program, capability));
      let currentEvidence = false;
      for (const evidenceId of capability.evidence_ids) {
        try {
          const evidence = await readFile(p(`docs/evidence/runs/${evidenceId}.md`), "utf8");
          const indexed = applicabilityIndex.entries.find((entry) => entry?.capability_id === capability.capability_id && entry?.evidence_id === evidenceId && entry?.applicability_index_only === true);
          if (evidence.includes(`scope_fingerprint: ${scopeFingerprintValue}`) || indexed?.scope_fingerprint === scopeFingerprintValue) currentEvidence = true;
        } catch { fail(`missing evidence ${evidenceId}`); }
      }
      if (!currentEvidence) fail(`evidence applicability ${capability.capability_id}`);
    }
    if (program.state.latest_evidence_id) {
      try {
        const latest = await readFile(p(`docs/evidence/runs/${program.state.latest_evidence_id}.md`), "utf8");
        const indexed = applicabilityIndex.entries.find((entry) => entry?.evidence_id === program.state.latest_evidence_id && entry?.applicability_index_only === true);
        if (!latest.includes(program.state.code_fingerprint) && !indexed) fail(`latest evidence fingerprint mismatch ${program.manifest.program_id}`);
      } catch { fail(`latest evidence missing ${program.manifest.program_id}`); }
    }
  }

  if (failures.length) throw new Error(failures.join("\n"));
  }, options);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) check().then(() => console.log("docs check passed")).catch((error) => { console.error(error.message); process.exitCode = 1; });
