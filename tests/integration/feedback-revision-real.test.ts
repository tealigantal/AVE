import { acceptanceEntry } from '../../scripts/stage2-acceptance.js';
const root = process.env.AVE_INTELLIGENCE_PIPELINE_REVIEW_ROOT;
if (!root) throw new Error('FEEDBACK_REAL_REVIEW_ROOT_REQUIRED');
// The shared main case actually accepts, encodes, compares, rejects and reopens.
// This is one shared run, not independent duplicate Evidence for Pipeline.
await acceptanceEntry('run', root);

