import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { initializeLedger, openLedger, FINAL_LIMIT_MICRO_CNY } from './ledger.mjs';
import { policyDigest } from './guard.mjs';
import { AMENDED_LIMIT, verifyBudgetAmendment, verifyFinalBudgetAmendment } from './budget-amendment.mjs';
import { repositoryRoot, runRoot, sha256, verifyInputs } from './sources.mjs';

// This one task-level location is shared by debugging, new projects and rebuilt images.
export const budgetRoot = join(runRoot, 'budget');
export const ledgerRoot = join(budgetRoot, 'ledger');
export const policyPath = join(runRoot, 'guard-policy.json');
export function openVerifiedTaskLedger(root, directory, policy, options = {}) {
  const amended = existsSync(join(root, 'budget-amendment-200.completed'));
  const finalAmended = existsSync(join(root, 'budget-amendment-299173272.completed'));
  if (finalAmended && !amended) throw Error('P5_BUDGET_HISTORY_MISSING');
  if (existsSync(join(root, 'budget-amendment-299173272.pending'))) throw Error('P5_BUDGET_TRANSITION_PENDING');
  const ledger = openLedger(directory, policyDigest(policy), amended ? { limitMicroCny: finalAmended ? FINAL_LIMIT_MICRO_CNY : AMENDED_LIMIT } : {});
  try {
    if (amended) {
      const proof = (finalAmended ? verifyFinalBudgetAmendment : verifyBudgetAmendment)(root, directory, policy, options), held = ledger.snapshot();
      if (held.pending || held.frozen || held.sequence !== proof.state.sequence || held.reservedMicroCny !== proof.state.reservedMicroCny || held.reservations !== proof.state.reservations) throw Error('P5_BUDGET_LOCKED_STATE_CHANGED');
    }
    return ledger;
  } catch (error) { try { ledger.close(); } catch (cleanup) { throw new AggregateError([error, cleanup], 'budget verification and lock cleanup failed'); } throw error; }
}
export function openTaskLedger(policy) { return openVerifiedTaskLedger(runRoot, ledgerRoot, policy); }

export function preparePolicy() {
  const inputs = verifyInputs();
  const sampleBytes = readFileSync(join(runRoot, 'samples-r1/receipt.json'));
  const samples = JSON.parse(sampleBytes);
  const inputBytes = readFileSync(join(runRoot, 'inputs-manifest.json'));
  if (samples.inputs_manifest_sha256 !== sha256(inputBytes)) throw Error('P5_SAMPLING_INPUT_DRIFT');
  for (const sample of samples.entries) {
    const input = inputs.inputs.find(item => item.file === sample.input && item.sha256 === sample.source_digest);
    const bytes = readFileSync(join(runRoot, 'samples-r1', sample.file));
    if (!input || bytes.length !== sample.bytes || sha256(bytes) !== sample.content_digest) throw Error('P5_SAMPLE_IDENTITY_DRIFT');
  }
  const price = {
    checked_at: '2026-11-05', currency: 'CNY', region: 'Beijing', endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    sources: [
      { url: 'https://help.aliyun.com/zh/model-studio/qwen3-vl-plus', facts: 'Default non-thinking mode; maximum answer output 32768 tokens.' },
      { url: 'https://help.aliyun.com/zh/model-studio/vision', facts: 'One Qwen3-VL image has at most 16384 visual tokens.' },
      { url: 'https://help.aliyun.com/zh/model-studio/model-pricing', facts: 'Use highest Beijing vision tier: input 3 and output 30 CNY per million tokens. Planner snapshot input 12 and output 36 CNY per million tokens. No discount is deducted.' },
      { url: 'https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-chat-completions/', facts: 'Omitted max_tokens uses model maximum answer length. Answer and thinking budgets are bounded separately; completion usage includes reasoning.' },
      { url: 'https://help.aliyun.com/zh/model-studio/qwen3-7-max', facts: 'Exact planner snapshot qwen3.7-max-2026-05-20; preserve max_tokens=8192, thinking_budget=4096 and thinking=true.' },
      { url: 'https://help.aliyun.com/zh/model-studio/beijing-access-information', facts: 'dashscope.aliyuncs.com is the Beijing endpoint.' },
    ],
    conservative_assumptions: ['Regular byte-level BPE text token count is bounded by UTF-8 bytes; reserve another 8192 control/framing tokens. This extra framing bound is an engineering assumption, not an official guarantee.', 'Reserve complete configured answer plus thinking budgets and another 256 output tokens.', 'Retain every reservation, including failed or unknown outcomes. Freeze on observed usage above a reservation.'],
  };
  const priceBytes = Buffer.from(JSON.stringify(price, null, 2) + '\n');
  const catalogBytes = readFileSync(join(repositoryRoot, 'resources/audio/free-audio-2026.10.02.1.json'));
  const catalog = JSON.parse(catalogBytes);
  const result = {
    version: 1, project: 'ave-p5-current-20261105', limitMicroCny: 100_000_000,
    priceEvidenceHash: sha256(priceBytes), inputsManifestHash: sha256(inputBytes), sampleReceiptHash: sha256(sampleBytes), catalogHash: sha256(catalogBytes),
    imageHashes: [...new Set(samples.entries.map(sample => sample.content_digest))].sort(),
    assetHashes: [...new Set([...inputs.inputs.map(item => item.sha256), ...catalog.items.map(item => item.content_sha256)])].sort(),
    audioDownloads: catalog.items.map(item => ({ url: item.download.url, ...(item.download.kind === 'archive_range' ? { range: `bytes=${item.download.range_start}-${item.download.range_end}` } : {}) })),
    models: {
      'qwen3-vl-plus': { maxTokens: 32768, enableThinking: false, allowDefaultMaxTokens: true, allowDefaultThinking: true, inputMicroCnyPerMillion: 3_000_000, outputMicroCnyPerMillion: 30_000_000, imageTokenUpper: 16384, frameTokenUpper: 8192, outputTokenMargin: 256, maxInputTokens: 128000, maxImages: 1, maxTextBytes: 12000 },
      'qwen3.7-max-2026-05-20': { maxTokens: 8192, enableThinking: true, thinkingBudget: 4096, inputMicroCnyPerMillion: 12_000_000, outputMicroCnyPerMillion: 36_000_000, imageTokenUpper: 0, frameTokenUpper: 8192, outputTokenMargin: 256, maxInputTokens: 131072, maxImages: 0, maxTextBytes: 100000 },
    },
  };
  if (existsSync(policyPath)) {
    const existing = JSON.parse(readFileSync(policyPath, 'utf8'));
    if (policyDigest(existing) !== policyDigest(result) || sha256(readFileSync(join(runRoot, 'price-evidence.json'))) !== result.priceEvidenceHash) throw Error('P5_FROZEN_POLICY_CHANGED');
    const ledger = openTaskLedger(existing);
    try { return { policyHash: policyDigest(existing), ...ledger.snapshot() }; } finally { ledger.close(); }
  }
  // A ledger without its policy is an incomplete state, never a new spending allowance.
  if (existsSync(budgetRoot)) throw Error('P5_EXISTING_BUDGET_WITHOUT_POLICY');
  writeFileSync(join(runRoot, 'price-evidence.json'), priceBytes, { flag: 'wx' });
  writeFileSync(policyPath, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  mkdirSync(budgetRoot);
  initializeLedger(ledgerRoot, policyDigest(result));
  return { policyHash: policyDigest(result), limitMicroCny: result.limitMicroCny, reservations: 0, images: result.imageHashes.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) console.log(JSON.stringify(preparePolicy()));
