import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { assertDurationBlueprintV1, assertDurationFeasibilityV1 } from "../../packages/platform/contract-runtime/src/public.js";
import { allocateDurationBeatBudgets, allocateDurationRoleBudgets, builtInDurationBlueprints, canonicalDurationBlueprint, durationBlueprintDigest, evaluateDurationFeasibility, validateDurationBlueprint, type CreativeContractV2, type MaterialEvidencePackV1 } from "../../packages/core/editorial-core/src/public.js";
import type { AssetId } from "../../packages/core/media-identity/src/public.js";

const hash = (value: unknown) => createHash("sha256").update(canonicalDurationBlueprint(value)).digest("hex");
const fixed = (character: string) => character.repeat(64);
assert.equal(builtInDurationBlueprints.length, 6);
assert.deepEqual(builtInDurationBlueprints.map((item) => item.duration_class), ["30s", "60s", "2m", "5m", "10m", "30m"]);
for (const blueprint of builtInDurationBlueprints) { assertDurationBlueprintV1(blueprint); validateDurationBlueprint(blueprint); assert.equal(durationBlueprintDigest(blueprint), blueprint.definition_digest); assert.equal(Object.isFrozen(blueprint), true); }
assert.deepEqual(builtInDurationBlueprints.map((item) => item.acceptable_variance.value), [1, 2, 4, 9, 18, 54], "profile RationalTime ratios must retain exact integer policy values");
assert.ok(builtInDurationBlueprints.flatMap((item) => [item.target_duration, item.acceptable_variance, item.ending_contract.reserve, ...item.beat_roles.flatMap((role) => [role.minimum_duration, role.maximum_duration])]).every((time) => Number.isSafeInteger(time.value) && Number.isSafeInteger(time.timescale)), "all profile time authority must be integral RationalTime");
assert.equal(new Set(builtInDurationBlueprints.map((item) => item.beat_roles.map((role) => role.role_id).join("|"))).size, 6, "each duration class must own a distinct narrative role structure");
assert.equal(new Set(builtInDurationBlueprints.map((item) => item.emotional_curve.map((point) => `${point.phase}:${point.position}:${point.intensity}`).join("|"))).size, 6, "each duration class must own a distinct emotional curve");
assert.deepEqual(builtInDurationBlueprints[0]!.beat_roles.map((role) => role.role_id), ["hook", "proof", "payoff", "ending"]);
assert.deepEqual(builtInDurationBlueprints.at(-1)!.beat_roles.map((role) => role.role_id), ["prologue", "chapter-one", "chapter-two", "chapter-three", "evidence-trail", "reflection", "climax", "ending"]);
const exactSum = (values: readonly Readonly<{ value: number; timescale: number }>[]): readonly [bigint, bigint] => values.reduce<readonly [bigint, bigint]>((sum, value) => [sum[0] * BigInt(value.timescale) + BigInt(value.value) * sum[1], sum[1] * BigInt(value.timescale)], [0n, 1n]);
const exactEqual = (left: readonly [bigint, bigint], right: Readonly<{ value: number; timescale: number }>): boolean => left[0] * BigInt(right.timescale) === BigInt(right.value) * left[1];
for (const catalogBlueprint of builtInDurationBlueprints) {
  const allocation = allocateDurationRoleBudgets(catalogBlueprint);
  for (let plannedBeatCount = catalogBlueprint.beat_count.minimum; plannedBeatCount <= catalogBlueprint.beat_count.maximum; plannedBeatCount += 1) {
    if (plannedBeatCount < allocation.allocated_roles.length) {
      assert.throws(() => allocateDurationBeatBudgets({ planned_beat_count: plannedBeatCount, allocated_roles: allocation.allocated_roles }), /duration Beat plan is invalid/);
      continue;
    }
    const beats = allocateDurationBeatBudgets({ planned_beat_count: plannedBeatCount, allocated_roles: allocation.allocated_roles });
    assert.equal(beats.length, plannedBeatCount, `${catalogBlueprint.duration_class}/${plannedBeatCount} must preserve the planned Beat count`);
    assert.ok(beats.every((beat) => beat.duration.value > 0 && beat.duration.timescale > 0), `${catalogBlueprint.duration_class}/${plannedBeatCount} must allocate positive exact durations`);
    assert.deepEqual([...new Set(beats.map((beat) => beat.role_id))], allocation.allocated_roles.map((role) => role.role_id), `${catalogBlueprint.duration_class}/${plannedBeatCount} must preserve role order`);
    for (const role of allocation.allocated_roles) assert.ok(exactEqual(exactSum(beats.filter((beat) => beat.role_id === role.role_id).map((beat) => beat.duration)), role.duration), `${catalogBlueprint.duration_class}/${plannedBeatCount}/${role.role_id} must close exactly`);
    assert.ok(exactEqual(exactSum(beats.map((beat) => beat.duration)), catalogBlueprint.target_duration), `${catalogBlueprint.duration_class}/${plannedBeatCount} must close the global target exactly`);
  }
}
const fractionalBeats = allocateDurationBeatBudgets({ planned_beat_count: 3, allocated_roles: [{ role_id: "micro", duration: { schema_version: 1, value: 1, timescale: 1000 } }] });
assert.deepEqual(fractionalBeats.map((beat) => beat.duration), Array.from({ length: 3 }, () => ({ schema_version: 1, value: 1, timescale: 3000 })), "a sub-tick role must split into exact positive fractional Beat budgets");
assert.ok(exactEqual(exactSum(fractionalBeats.map((beat) => beat.duration)), { value: 1, timescale: 1000 }), "fractional Beat splitting must close the exact role total");
assert.throws(() => allocateDurationBeatBudgets({ planned_beat_count: 2, allocated_roles: [{ role_id: "overflow", duration: { schema_version: 1, value: 1, timescale: Number.MAX_SAFE_INTEGER } }] }), /duration Beat split is unrepresentable/, "an unsafe RationalTime timescale product must fail closed");
const productCountsWithoutSafeAlternative: string[] = [];
for (const catalogBlueprint of builtInDurationBlueprints) {
  const allocation = allocateDurationRoleBudgets(catalogBlueprint), productMinimum = Math.max(catalogBlueprint.beat_count.minimum, catalogBlueprint.ending_contract.minimum_evidence_count, catalogBlueprint.beat_roles.reduce((sum, role) => sum + role.minimum_evidence_count, 0));
  for (let plannedBeatCount = productMinimum; plannedBeatCount <= catalogBlueprint.beat_count.maximum; plannedBeatCount += 1) {
    const beats = allocateDurationBeatBudgets({ planned_beat_count: plannedBeatCount, allocated_roles: allocation.allocated_roles });
    const hasSafeAlternative = beats.some((beat, index) => beats.some((candidate, candidateIndex) => candidateIndex > index && candidate.role_id === beat.role_id && BigInt(candidate.duration.value) * BigInt(beat.duration.timescale) === BigInt(beat.duration.value) * BigInt(candidate.duration.timescale)));
    if (!hasSafeAlternative) productCountsWithoutSafeAlternative.push(`${catalogBlueprint.duration_class}/${plannedBeatCount}`);
  }
}
assert.deepEqual(productCountsWithoutSafeAlternative, ["30s/4", "60s/6"], "Product must know at material preflight exactly which catalog/count pairs cannot form a distinct same-role exact-duration Story alternative");

const blueprint = builtInDurationBlueprints[1]!;
const contractBase: CreativeContractV2 = { schema_version: 2, contract_id: "contract-duration", project_id: "project-duration", object_version: 1, status: "approved", creator_goal: "Compact arc", audience: ["friends"], platforms: ["youtube"], target_duration: blueprint.target_duration, requirements: [], voice_and_identity: { desired_traits: ["warm"], forbidden_misrepresentation: ["invented event"] }, privacy_policy_ref: { object_id: "privacy", object_version: 1, digest: fixed("a") }, rights_policy_ref: { object_id: "rights", object_version: 1, digest: fixed("b") }, approval_policy: { mode: "explicit_user", actor_kind: "user" }, protected_refs: [], allowed_transformations: ["trim"], forbidden_outcomes: ["fabrication"], created_at: "2026-08-24T00:00:00Z", approval: { actor_id: "user", actor_kind: "user", approved_at: "2026-08-24T00:00:00Z", review_digest: fixed("c") }, provenance: { producer: "user", source_id: "duration-test", source_version: "1", policy_version: "knowledge-v1", input_refs: [], unresolved_assumptions: [] } };
const contractDigest = hash(contractBase), asset = `asset:sha256:${fixed("d")}` as AssetId;
const evidence = Array.from({ length: 40 }, (_, index) => ({ evidence_id: `asr:${index}`, evidence_type: "asr" as const, evidence_version: 1, asset_id: asset, range: { start: { schema_version: 1 as const, value: index, timescale: 1 }, end: { schema_version: 1 as const, value: index + 1, timescale: 1 } }, review_status: "approved" as const, content_digest: fixed((index % 8 + 1).toString()) }));
const pack: MaterialEvidencePackV1 = { schema_version: 1, pack_id: "pack-duration", project_id: contractBase.project_id, object_version: 1, status: "sufficient", contract_ref: { object_id: contractBase.contract_id, object_version: 1, digest: contractDigest }, evidence_refs: evidence, moment_refs: [], event_refs: [], coverage_matrix_ref: { object_id: "coverage", object_version: 1, digest: fixed("e") }, sufficiency: { covered_requirement_ids: [], missing_requirement_ids: [], conflicting_requirement_ids: [] }, availability: [{ asset_id: asset, original_identity: asset, permission_state: "authorized", verified_at: "2026-08-24T00:00:00Z" }], policy_snapshot: { policy_version: "knowledge-v1", privacy_policy_ref: contractBase.privacy_policy_ref, rights_policy_ref: contractBase.rights_policy_ref }, input_fingerprint: fixed("f"), created_at: "2026-08-24T00:00:00Z", provenance: { producer: "project-host", source_version: "creative-context-v1", policy_version: "knowledge-v1", input_refs: [], unresolved_assumptions: [] } };
const input = { feasibility_id: "feasibility-duration", blueprint_ref: { object_id: blueprint.blueprint_id, object_version: 1, digest: blueprint.definition_digest }, contract_ref: pack.contract_ref, material_pack_ref: { object_id: pack.pack_id, object_version: 1, digest: hash(pack) }, evaluated_at: "2026-08-24T00:01:00Z" } as const;
for (const boundaryBlueprint of builtInDurationBlueprints) {
  const boundaryContract = { ...contractBase, target_duration: boundaryBlueprint.target_duration }, boundaryContractDigest = hash(boundaryContract);
  const boundaryPack = { ...pack, contract_ref: { object_id: boundaryContract.contract_id, object_version: boundaryContract.object_version, digest: boundaryContractDigest } }, boundaryPackDigest = hash(boundaryPack);
  const boundary = evaluateDurationFeasibility(boundaryBlueprint, boundaryContract, boundaryPack, { ...input, feasibility_id: `feasibility-${boundaryBlueprint.duration_class}`, blueprint_ref: { object_id: boundaryBlueprint.blueprint_id, object_version: boundaryBlueprint.blueprint_version, digest: boundaryBlueprint.definition_digest }, contract_ref: boundaryPack.contract_ref, material_pack_ref: { object_id: boundaryPack.pack_id, object_version: boundaryPack.object_version, digest: boundaryPackDigest } });
  assertDurationFeasibilityV1(boundary); assert.equal(boundary.result, "feasible", `${boundaryBlueprint.duration_class} boundary must allocate feasibly`); assert.ok(BigInt(boundary.variance.value) * BigInt(boundaryBlueprint.acceptable_variance.timescale) <= BigInt(boundaryBlueprint.acceptable_variance.value) * BigInt(boundary.variance.timescale));
  assert.deepEqual(allocateDurationRoleBudgets(boundaryBlueprint), { allocated_roles: boundary.allocated_roles, total_allocated: boundary.total_allocated, variance: boundary.variance }, "the exported Product allocator boundary must exactly match Duration Feasibility authority");
  assert.ok(boundary.planned_beat_count >= boundaryBlueprint.beat_count.minimum && boundary.planned_beat_count <= boundaryBlueprint.beat_count.maximum); assert.equal(boundary.information_density, boundaryBlueprint.information_density); assert.equal(boundary.redundancy_policy, boundaryBlueprint.redundancy_policy); assert.deepEqual(boundary.emotional_curve, boundaryBlueprint.emotional_curve);
}
const first = evaluateDurationFeasibility(blueprint, contractBase, pack, input), retry = evaluateDurationFeasibility(blueprint, contractBase, pack, input);
assertDurationFeasibilityV1(first); assert.deepEqual(first, retry); assert.equal(first.result, "feasible"); assert.equal(first.total_allocated.value, 60); assert.equal(first.variance.value, 0);
assert.throws(() => evaluateDurationFeasibility(blueprint, contractBase, pack, { ...input, evaluated_at: "2026-02-30T00:00:00Z" }), /evaluation time is invalid/);
const reboundPolicyPack = { ...pack, policy_snapshot: { ...pack.policy_snapshot, rights_policy_ref: { ...pack.policy_snapshot.rights_policy_ref, digest: fixed("9") } } };
assert.throws(() => evaluateDurationFeasibility(blueprint, contractBase, reboundPolicyPack, { ...input, material_pack_ref: { ...input.material_pack_ref, digest: hash(reboundPolicyPack) } }), /policy is stale or rebound/);
const withinVarianceMaximums: Readonly<Record<string, number>> = { hook: 8, setup: 10, development: 25, turn: 8, ending: 8 };
const withinVarianceBase = { ...blueprint, acceptable_variance: { schema_version: 1 as const, value: 2, timescale: 1 }, beat_roles: blueprint.beat_roles.map((role) => ({ ...role, maximum_duration: { schema_version: 1 as const, value: withinVarianceMaximums[role.role_id]!, timescale: 1 } })) };
const withinVarianceBlueprint = { ...withinVarianceBase, definition_digest: durationBlueprintDigest(withinVarianceBase) };
validateDurationBlueprint(withinVarianceBlueprint);
const withinVariance = evaluateDurationFeasibility(withinVarianceBlueprint, contractBase, pack, { ...input, blueprint_ref: { object_id: withinVarianceBlueprint.blueprint_id, object_version: withinVarianceBlueprint.blueprint_version, digest: withinVarianceBlueprint.definition_digest } });
assert.equal(withinVariance.result, "feasible", "a reachable total inside acceptable variance must remain feasible"); assert.equal(withinVariance.total_allocated.value, 59); assert.equal(withinVariance.variance.value, 1);
const thinPack = { ...pack, evidence_refs: evidence.slice(0, 1) }; const blocked = evaluateDurationFeasibility(blueprint, contractBase, thinPack, { ...input, material_pack_ref: { ...input.material_pack_ref, digest: hash(thinPack) } });
assert.equal(blocked.result, "blocked"); assert.ok(blocked.blockers.includes("insufficient_approved_evidence"));
const endingEvidenceBase = { ...blueprint, ending_contract: { ...blueprint.ending_contract, minimum_evidence_count: 7 } }, endingEvidenceBlueprint = { ...endingEvidenceBase, definition_digest: durationBlueprintDigest(endingEvidenceBase) }, sixEvidencePack = { ...pack, evidence_refs: evidence.slice(0, 6) };
const endingEvidenceBlocked = evaluateDurationFeasibility(endingEvidenceBlueprint, contractBase, sixEvidencePack, { ...input, blueprint_ref: { object_id: endingEvidenceBlueprint.blueprint_id, object_version: endingEvidenceBlueprint.blueprint_version, digest: endingEvidenceBlueprint.definition_digest }, material_pack_ref: { ...input.material_pack_ref, digest: hash(sixEvidencePack) } });
assert.equal(endingEvidenceBlocked.result, "blocked"); assert.equal(endingEvidenceBlocked.missing_evidence_count, 1, "ending-specific evidence minimum must participate in feasibility");
const contradictory = { ...blueprint, beat_count: { minimum: 9, maximum: 2 } }; assert.throws(() => validateDurationBlueprint({ ...contradictory, definition_digest: durationBlueprintDigest(contradictory) }), /beat-count bounds/);
const impossibleEnding = { ...blueprint, ending_contract: { ...blueprint.ending_contract, reserve: { schema_version: 1 as const, value: 59, timescale: 1 } } }; assert.throws(() => validateDurationBlueprint({ ...impossibleEnding, definition_digest: durationBlueprintDigest(impossibleEnding) }), /ending reserve/);
const negativeRole = { ...blueprint, beat_roles: blueprint.beat_roles.map((role) => role.role_id === "hook" ? { ...role, minimum_duration: { schema_version: 1 as const, value: -5, timescale: 1 }, maximum_duration: { schema_version: 1 as const, value: -1, timescale: 1 } } : role) }, negativeRoleBlueprint = { ...negativeRole, definition_digest: durationBlueprintDigest(negativeRole) };
assert.throws(() => assertDurationBlueprintV1(negativeRoleBlueprint), /must be >= 0/); assert.throws(() => validateDurationBlueprint(negativeRoleBlueprint), /negative/);
console.log("duration blueprint boundary, deterministic allocation and blocker checks passed");
