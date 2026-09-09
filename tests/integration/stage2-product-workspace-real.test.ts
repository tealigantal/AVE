import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { acceptanceEntry } from '../../scripts/stage2-acceptance.js';
import { loadMaterialCase } from './stage2-material-case.js';
import { reviewMaterialCaseInElectron } from './stage2-electron-review.js';

const manifest = process.env.AVE_REAL_MEDIA_MANIFEST;
const reviewRoot = process.env.AVE_STAGE2_PRODUCT_REVIEW_ROOT;
if (!manifest) throw new Error('STAGE2_PRODUCT_REAL_MEDIA_MANIFEST_REQUIRED');
if (!reviewRoot) throw new Error('STAGE2_PRODUCT_REVIEW_ROOT_REQUIRED');
await acceptanceEntry('run', reviewRoot, manifest);
const material = await loadMaterialCase(manifest);
const technical = JSON.parse(await readFile(resolve(reviewRoot, 'technical-results.json'), 'utf8'));
const revised = technical.results.find((result: any) => result.label === 'after');
if (!revised) throw new Error('MATERIAL_CASE_REVISED_OUTPUT_REQUIRED');
const electronReview = resolve(reviewRoot, 'electron-review');
await mkdir(electronReview);
await reviewMaterialCaseInElectron(revised.project, electronReview, {
  goal: material.contract.goal,
  evidenceCount: material.evidence.length,
  duration: Number(revised.master.probe.format.duration),
});
