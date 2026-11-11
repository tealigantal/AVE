import { createHash } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import { LIMIT_MICRO_CNY } from './ledger.mjs';

const ENDPOINT = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
const digest = value => createHash('sha256').update(value).digest('hex');
const integer = value => Number.isSafeInteger(value) && value >= 0;
const fail = message => { throw new Error(`P5_GUARD: ${message}`); };
const hashPattern = /^[a-f0-9]{64}$/;
const allowedKeys = new Set(['model', 'messages', 'max_tokens', 'thinking_budget', 'enable_thinking', 'response_format']);
export const policyDigest = policy => digest(JSON.stringify(policy, (_key, value) => value && typeof value === 'object' && !Array.isArray(value) ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))) : value));
function deepFreeze(value) {
  if (value && typeof value === 'object') { for (const child of Object.values(value)) deepFreeze(child); Object.freeze(value); }
  return value;
}

// Policy is supplied only after source/price preflight; this function never invents price or token bounds.
export function quote(body, policy) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !allowedKeys.has(key))) fail('unknown request parameter');
  const model = policy?.models?.[body.model];
  if (!model || !integer(model.maxTokens) || model.maxTokens < 1 ||
      !(body.max_tokens === model.maxTokens || body.max_tokens === undefined && model.allowDefaultMaxTokens === true) ||
      !(body.enable_thinking === model.enableThinking || body.enable_thinking === undefined && model.allowDefaultThinking === true && model.enableThinking === false) ||
      body.thinking_budget !== model.thinkingBudget) fail('model or inference settings not authorized');
  if (typeof model.enableThinking !== 'boolean' || (model.enableThinking && (!integer(model.thinkingBudget) || !model.thinkingBudget)) || (!model.enableThinking && model.thinkingBudget !== undefined)) fail('invalid thinking bounds');
  if (!integer(model.inputMicroCnyPerMillion) || !integer(model.outputMicroCnyPerMillion) || !model.inputMicroCnyPerMillion || !model.outputMicroCnyPerMillion || !integer(model.imageTokenUpper) || !integer(model.frameTokenUpper) || !integer(model.outputTokenMargin) || !integer(model.maxInputTokens) || !integer(model.maxImages) || !hashPattern.test(policy.priceEvidenceHash ?? '')) fail('unverified price or token bounds');
  if (!Array.isArray(policy.imageHashes) || !Array.isArray(policy.assetHashes) || [...policy.imageHashes, ...policy.assetHashes].some(hash => !hashPattern.test(hash))) fail('invalid media allowlist');
  if (!Array.isArray(body.messages) || body.messages.length < 1 || body.messages.length > 2) fail('message count');
  if (body.response_format && (Object.keys(body.response_format).join() !== 'type' || body.response_format.type !== 'json_object')) fail('response format');
  const bounded = structuredClone(body);
  let images = 0;
  for (const message of bounded.messages) {
    if (Object.keys(message).sort().join() !== 'content,role' || !['system', 'user'].includes(message.role)) fail('message structure');
    if (typeof message.content === 'string') continue;
    if (!Array.isArray(message.content)) fail('message content');
    for (const part of message.content) {
      if (part?.type === 'text' && Object.keys(part).sort().join() === 'text,type' && typeof part.text === 'string') continue;
      if (part?.type !== 'image_url' || Object.keys(part).sort().join() !== 'image_url,type' || Object.keys(part.image_url ?? {}).join() !== 'url' || typeof part.image_url.url !== 'string' || !part.image_url.url.startsWith('data:image/png;base64,')) fail('non-PNG or external media');
      const encoded = part.image_url.url.slice('data:image/png;base64,'.length);
      if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) fail('invalid image encoding');
      const bytes = Buffer.from(encoded, 'base64');
      if (bytes.toString('base64') !== encoded || !policy.imageHashes.includes(digest(bytes))) fail('image outside allowlist');
      if (bytes.length < 24 || bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' || !bytes.readUInt32BE(16) || !bytes.readUInt32BE(20) || bytes.readUInt32BE(16) > 768 || bytes.readUInt32BE(20) > 768) fail('image geometry');
      images++; part.image_url.url = '[authorized image]';
    }
  }
  if (images > model.maxImages) fail('image count');
  const text = JSON.stringify(bounded);
  if (model.maxTextBytes !== undefined && (!integer(model.maxTextBytes) || Buffer.byteLength(text) > model.maxTextBytes)) fail('text byte bound');
  for (const match of text.matchAll(/asset:sha256:([a-f0-9]{64})/g)) if (!policy.assetHashes.includes(match[1])) fail('asset outside allowlist');
  const inputUpper = Buffer.byteLength(text) + model.frameTokenUpper + images * model.imageTokenUpper;
  const outputUpper = model.maxTokens + (model.thinkingBudget ?? 0) + model.outputTokenMargin;
  if (!integer(inputUpper) || inputUpper > model.maxInputTokens || !integer(outputUpper)) fail('token bound');
  const million = 1_000_000n;
  const ceil = n => (n + million - 1n) / million;
  const amount = ceil(BigInt(inputUpper) * BigInt(model.inputMicroCnyPerMillion)) + ceil(BigInt(outputUpper) * BigInt(model.outputMicroCnyPerMillion));
  if (amount < 1n || amount > BigInt(LIMIT_MICRO_CNY)) fail('quote exceeds budget');
  return { microCny: Number(amount), inputUpper, outputUpper };
}

export function createGuard({ ledger, policy, priceEvidence, fetchImpl, assertContinuationAuthority }) {
  if (!ledger || typeof fetchImpl !== 'function') fail('ledger and transport required');
  const frozenPolicy = deepFreeze(structuredClone(policy));
  if (ledger.policyHash !== policyDigest(frozenPolicy)) fail('ledger policy mismatch');
  if (!(priceEvidence instanceof Uint8Array) || digest(priceEvidence) !== frozenPolicy.priceEvidenceHash) fail('price evidence mismatch');
  const dispatchContext = new AsyncLocalStorage();
  async function guardedFetch(url, init) {
    const target = String(url);
    const expected = dispatchContext.getStore();
    if (expected) {
      if (expected.closed || expected.invoked) fail('continuation dispatch already used');
      if (typeof assertContinuationAuthority !== 'function' || assertContinuationAuthority() !== true) fail('continuation authority unavailable');
      if (target !== ENDPOINT || init?.method !== 'POST' || typeof init?.body !== 'string' || Buffer.byteLength(init.body) !== expected.input_bytes || digest(init.body) !== expected.wire_digest) fail('continuation transport mismatch');
      let body; try { body = JSON.parse(init.body); } catch { fail('invalid continuation body'); }
      if (body.model !== expected.target.model) fail('continuation model mismatch');
      expected.invoked = true;
    }
    if (['http://127.0.0.1:18080/v1/audio/transcriptions', 'http://127.0.0.1:18081/v1/chat/completions'].includes(target)) {
      if (init?.method !== 'POST' || init?.redirect !== 'error') fail('invalid local transport');
      return fetchImpl(url, init);
    }
    const download = frozenPolicy.audioDownloads?.find(item => item.url === target && (item.range ? init?.headers?.Range === item.range : init?.headers?.Range === undefined));
    if (download) {
      const headers = init?.headers;
      if (Object.keys(init ?? {}).some(key => !['method', 'redirect', 'signal', 'headers'].includes(key)) || ![undefined, 'GET'].includes(init?.method) || init?.redirect !== 'error' || !headers || Object.keys(headers).some(key => !['Accept-Encoding', 'User-Agent', 'Range'].includes(key)) || headers['Accept-Encoding'] !== 'identity' || headers['User-Agent'] !== 'Mozilla/5.0 AVE/1.0 (audio-resource-client)') fail('public audio download shape');
      return fetchImpl(url, init);
    }
    if (target !== ENDPOINT || init?.method !== 'POST' || init?.redirect !== 'error' || typeof init?.body !== 'string') fail('unauthorized transport');
    const body = JSON.parse(init.body);
    const priced = quote(body, frozenPolicy), wire = digest(init.body);
    ledger.reserve(wire, priced.microCny); // Synchronous durable reservation before transport.
    let response;
    try { response = await fetchImpl(url, init); }
    catch (error) { ledger.finish(wire, 'uncertain'); throw error; }
    if (expected) expected.response = response;
    let usage;
    try { usage = (await response.clone().json())?.usage; } catch { /* unknown usage retains reservation */ }
    if (!integer(usage?.prompt_tokens) || !integer(usage?.completion_tokens)) {
      ledger.finish(wire, 'uncertain');
      return response;
    }
    const reasoning = usage.completion_tokens_details?.reasoning_tokens;
    if (reasoning !== undefined && !integer(reasoning)) { ledger.finish(wire, 'uncertain'); return response; }
    // OpenAI-compatible Qwen completion_tokens includes reasoning_tokens.
    if (usage.prompt_tokens > priced.inputUpper || usage.completion_tokens > priced.outputUpper || reasoning !== undefined && reasoning > usage.completion_tokens) {
      ledger.finish(wire, 'violation');
      fail('provider usage exceeded the bound');
    }
    ledger.finish(wire, 'response');
    return response;
  }
  // The trusted Host bootstrap may inject this closure. An async context ties
  // exactly one real guarded fetch to the validated transport; the normal
  // synchronous ledger reservation and physical send remain inseparable.
  const resumeDispatch = async (transport, send) => {
    if (dispatchContext.getStore()) fail('nested continuation dispatch');
    const target = transport?.target;
    if (!transport || Object.keys(transport).sort().join() !== 'input_bytes,target,wire_digest' || !integer(transport.input_bytes) || !transport.input_bytes || !hashPattern.test(transport.wire_digest ?? '') || !target || Object.keys(target).sort().join() !== 'digest,endpoint,model,provider,role' || target.role !== 'planner' || target.provider !== 'qwen' || target.model !== 'qwen3.7-max-2026-05-20' || `${target.endpoint}/chat/completions` !== ENDPOINT || !hashPattern.test(target.digest ?? '') || typeof send !== 'function') fail('invalid continuation authority input');
    const scope = { ...transport, target: { ...target }, invoked: false, response: undefined, closed: false };
    return dispatchContext.run(scope, async () => {
      try {
        const value = await send();
        if (!scope.invoked || !scope.response || value !== scope.response) fail('continuation did not return guarded response');
        return value;
      } finally { scope.closed = true; }
    });
  };
  Object.defineProperty(guardedFetch, 'resumeDispatch', { value: resumeDispatch, writable: false, configurable: false });
  return guardedFetch;
}
