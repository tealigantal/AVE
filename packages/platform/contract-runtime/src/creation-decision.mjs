import { creationDecisionV1Validator, creationPlanV1Validator } from "./generated/creative-context-validators.mjs";
import { CreationError } from "./creation-session.mjs";

const fail = (code, message) => { throw new CreationError(code, message); };
const validate = (validator, value, code) => {
  if (!validator(value)) fail(code, (validator.errors ?? []).map(error => `${error.instancePath || "/"}:${error.keyword}:${error.message}`).join("|"));
};
const positiveInteger = (value, label) => {
  if (typeof value !== "bigint" && (typeof value !== "string" || !/^[1-9]\d*$/.test(value))) fail("CREATION_DECISION_TIMEBASE_INVALID", `${label} must be a positive exact integer`);
  const parsed = BigInt(value);
  if (parsed <= 0n) fail("CREATION_DECISION_TIMEBASE_INVALID", `${label} must be positive`);
  return parsed;
};
const gcd = (a, b) => { a = a < 0n ? -a : a; while (b) [a, b] = [b, a % b]; return a; };
const fraction = value => {
  if (!Number.isSafeInteger(value.value) || !Number.isSafeInteger(value.timescale) || value.timescale <= 0) fail("CREATION_DECISION_TIME_UNSAFE", "source bounds must use safe integer RationalTime fields");
  return [BigInt(value.value), BigInt(value.timescale)];
};

export function assertCreationDecisionV1(value) { validate(creationDecisionV1Validator, value, "CONTRACT_CREATION_DECISION_INVALID"); }

/** Shared exact allocator for read-only planning measurements and final compilation. */
export function allocateCreationSelectionTicks(selections, target, timebase) {
  const tick = positiveInteger(timebase.value, "timebase.value"), scale = positiveInteger(timebase.timescale, "timebase.timescale");
  if (typeof target !== "bigint" || target < 1n || !Array.isArray(selections) || !selections.length) fail("CREATION_DECISION_ALLOCATION_INVALID", "positive target and nonempty selections are required");
  const slots = selections.map((shot, index) => {
    const [start, startScale] = fraction(shot.source_window.start), [end, endScale] = fraction(shot.source_window.end);
    const numerator = (end * startScale - start * endScale) * scale, denominator = endScale * startScale * tick;
    if (start < 0n || numerator <= 0n) fail("CREATION_DECISION_WINDOW_INVALID", `shot ${index} needs a positive nonnegative-source window`);
    const capacity = numerator / denominator;
    if (shot.timing.kind === "exact" && numerator % denominator !== 0n) fail("CREATION_TIME_INEXACT", `exact shot ${index} duration is not a whole Timeline tick`);
    if (capacity < 1n) fail("CREATION_DECISION_CAPACITY_INSUFFICIENT", `shot ${index} contains no whole Timeline tick`);
    return { index, capacity, allocated: shot.timing.kind === "exact" ? capacity : 1n, weight: shot.timing.kind === "weighted" ? BigInt(shot.timing.weight) : 0n };
  });
  let remaining = target - slots.reduce((sum, slot) => sum + slot.allocated, 0n);
  if (remaining < 0n) fail("CREATION_DECISION_CAPACITY_INSUFFICIENT", "exact shots and one tick per weighted shot exceed the target");
  if (remaining > slots.reduce((sum, slot) => sum + (slot.weight ? slot.capacity - slot.allocated : 0n), 0n)) fail("CREATION_DECISION_CAPACITY_INSUFFICIENT", "selected windows cannot fill the declared target");
  while (remaining > 0n) {
    const active = slots.filter(slot => slot.weight > 0n && slot.allocated < slot.capacity);
    const weights = active.reduce((sum, slot) => sum + slot.weight, 0n), roundTotal = remaining;
    // First saturate windows whose proportional quota exceeds their capacity;
    // only the unsaturated set shares the remaining budget in the next round.
    const capped = active.filter(slot => roundTotal * slot.weight >= (slot.capacity - slot.allocated) * weights);
    if (capped.length) {
      for (const slot of capped) { remaining -= slot.capacity - slot.allocated; slot.allocated = slot.capacity; }
      continue;
    }
    for (const slot of active) {
      const allocation = roundTotal * slot.weight / weights;
      slot.allocated += allocation; remaining -= allocation;
    }
    active.sort((a, b) => {
      const left = roundTotal * a.weight % weights, right = roundTotal * b.weight % weights;
      return left === right ? a.index - b.index : left > right ? -1 : 1;
    });
    for (const slot of active) { if (!remaining) break; slot.allocated += 1n; remaining -= 1n; }
  }
  if (slots.reduce((sum, slot) => sum + slot.allocated, 0n) !== target) fail("CREATION_DECISION_ALLOCATION_INVALID", "compiled shot sum differs from the declared target");
  return slots;
}

/** Pure explicit-proposal compilation. No source snapping, fallback, prompt repair,
 * protection inference, or audio/caption trimming happens at this boundary. */
export function compileCreationDecisionV1(decision, identity, timebase, durationBudget) {
  assertCreationDecisionV1(decision);
  const tick = positiveInteger(timebase.value, "timebase.value"), scale = positiveInteger(timebase.timescale, "timebase.timescale");
  const target = BigInt(decision.target_duration_ticks);
  if (durationBudget !== null) {
    const minimum = positiveInteger(durationBudget.minimum_total_ticks, "minimum_total_ticks");
    const maximum = durationBudget.maximum_total_ticks === null ? null : positiveInteger(durationBudget.maximum_total_ticks, "maximum_total_ticks");
    if (maximum !== null && maximum < minimum) fail("CREATION_DECISION_BUDGET_INVALID", "duration budget is empty");
    if (target < minimum || maximum !== null && target > maximum) fail("CREATION_DURATION_TARGET_UNMET", "proposal target_duration_ticks is outside the Host duration budget");
  }
  const slots = allocateCreationSelectionTicks(decision.shots, target, timebase);
  const shots = decision.shots.map((shot, index) => {
    const { source_window, timing, ...creative } = structuredClone(shot);
    if (timing.kind === "exact") return { ...creative, source: source_window };
    const [start, startScale] = fraction(source_window.start);
    let value = start * scale + slots[index].allocated * tick * startScale, timescale = startScale * scale;
    const divisor = gcd(value, timescale); value /= divisor; timescale /= divisor;
    const [windowEnd, windowScale] = fraction(source_window.end);
    if (value * windowScale > windowEnd * timescale) fail("CREATION_DECISION_ALLOCATION_INVALID", `shot ${index} exceeds its declared window`);
    if (value > BigInt(Number.MAX_SAFE_INTEGER) || timescale > BigInt(Number.MAX_SAFE_INTEGER)) fail("CREATION_DECISION_TIME_UNSAFE", `shot ${index} compiled end cannot be represented safely`);
    return { ...creative, source: { ...source_window, end: { schema_version: 1, value: Number(value), timescale: Number(timescale) } } };
  });
  const { decision_version: _version, target_duration_ticks: _target, shots: _shots, ...creative } = structuredClone(decision);
  const plan = { ...creative, shots, ...identity, schema_version: 1 };
  validate(creationPlanV1Validator, plan, "CONTRACT_CREATION_PLAN_INVALID");
  return plan;
}
