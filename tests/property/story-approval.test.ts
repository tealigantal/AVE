import { strict as assert } from "node:assert";
import * as storyPlanning from "../../packages/features/story-planning/src/public.js";
assert.equal(storyPlanning.featureId, "story-planning");
assert.equal(typeof storyPlanning.approveStoryProposalV2, "function");
assert.equal("approveStoryProposal" in storyPlanning, false, "Story v1 approval must not remain exported");
assert.equal("validateStoryProposal" in storyPlanning, false, "StoryProposal v1 validation must not remain exported");
