import { acceptanceEntry } from '../../scripts/stage2-acceptance.js';

const manifest = process.env.AVE_REAL_MEDIA_MANIFEST;
const reviewRoot = process.env.AVE_INTELLIGENCE_PIPELINE_REVIEW_ROOT;
if (!manifest) throw new Error('INTELLIGENCE_PIPELINE_REAL_MEDIA_MANIFEST_REQUIRED');
if (!reviewRoot) throw new Error('INTELLIGENCE_PIPELINE_REVIEW_ROOT_REQUIRED');
await acceptanceEntry('run', reviewRoot, manifest);
