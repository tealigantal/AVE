import assert from "node:assert/strict";
import { stage2IntentControlState } from "../../apps/desktop/src/renderer/features/stage2-workspace.js";

const feedbackCandidate = { object_id: "intent-feedback", status: "candidate", feedback_diagnosis_ref: { object_id: "diagnosis", object_version: 1, digest: "a".repeat(64) } };
assert.deepEqual(stage2IntentControlState(feedbackCandidate, undefined, undefined, false), { stale: false, rejected: false, canApprove: true, canExecute: false, canReviewFeedback: true });
assert.deepEqual(stage2IntentControlState(feedbackCandidate, { decision_id: "approval" }, undefined, false), { stale: false, rejected: false, canApprove: false, canExecute: true, canReviewFeedback: true });
assert.deepEqual(stage2IntentControlState({ ...feedbackCandidate, status: "rejected" }, undefined, undefined, false), { stale: false, rejected: true, canApprove: false, canExecute: false, canReviewFeedback: false }, "Host-terminal rejection must remain closed after its rejection decision expires from the current approval view");
assert.deepEqual(stage2IntentControlState({ ...feedbackCandidate, status: "stale" }, undefined, undefined, false), { stale: true, rejected: false, canApprove: false, canExecute: false, canReviewFeedback: false });
console.log("Stage 2 Renderer terminal intent control checks passed");
