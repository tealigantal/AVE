// A documented historical mismatch is still unverified. It may be carried by
// development documentation checks, but never used as completion evidence.
export function historicalEvidenceDebt(program, capabilityId, scopeFingerprint, strict = false) {
  if (strict) return undefined;
  return program.state.debts.find((debt) =>
    debt.status === "active" &&
    debt.category === "historical-evidence-applicability" &&
    debt.capability_ids?.includes(capabilityId) &&
    debt.reviewed_scope_fingerprints?.[capabilityId] === scopeFingerprint &&
    typeof debt.exit_condition === "string" && debt.exit_condition.trim() &&
    Array.isArray(debt.evidence_ids) && debt.evidence_ids.length > 0);
}

export function assertNoDeferredEvidence(program, workPackage) {
  const debts = program.state.debts.filter((debt) =>
    debt.status === "active" &&
    debt.category === "historical-evidence-applicability" &&
    debt.capability_ids?.some((id) => workPackage.capability_ids.includes(id)));
  if (debts.length) throw new Error(`completion requires current evidence; unresolved applicability debt: ${debts.map((debt) => debt.debt_id).join(",")}`);
}
