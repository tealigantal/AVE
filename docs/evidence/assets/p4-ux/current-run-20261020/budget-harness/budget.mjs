// Isolated acceptance harness only. No proxy, credential storage or product API.
import { createHash } from "node:crypto";
import { appendFileSync, closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, unlinkSync, writeSync } from "node:fs";
import { join } from "node:path";

export const ENDPOINT = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
export const LIMIT_MICRO_CNY = 40_000_000;
const VISION = "qwen3-vl-plus", PLANNER = "qwen3.7-max-2026-05-20";
const digest = value => createHash("sha256").update(value).digest("hex");
const refuse = reason => { throw new Error(`ACCEPTANCE_BUDGET_REFUSED: ${reason}`); };
const integer = n => Number.isSafeInteger(n) && n >= 0;
const allowedKeys = new Set(["model", "messages", "max_tokens", "thinking_budget", "enable_thinking", "response_format"]);

export function quote(body, policy) {
  if (!body || Object.keys(body).some(k => !allowedKeys.has(k))) refuse("unknown billing/tool/stream parameter");
  if (![VISION, PLANNER].includes(body.model)) refuse("unauthorized model");
  if (!Array.isArray(body.messages) || body.messages.length < 1 || body.messages.length > 2) refuse("message count");
  if (body.response_format && (Object.keys(body.response_format).join() !== "type" || body.response_format.type !== "json_object")) refuse("response format");
  const bounded = structuredClone(body);
  let images = 0;
  for (const message of bounded.messages) {
    if (Object.keys(message).sort().join() !== "content,role" || !["system", "user"].includes(message.role)) refuse("message structure");
    if (typeof message.content === "string") continue;
    if (!Array.isArray(message.content)) refuse("message content");
    for (const part of message.content) {
      if (part.type === "text" && Object.keys(part).sort().join() === "text,type" && typeof part.text === "string") continue;
      if (part.type !== "image_url" || Object.keys(part).sort().join() !== "image_url,type" ||
          Object.keys(part.image_url ?? {}).join() !== "url" || !/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(part.image_url.url)) refuse("non-PNG or external media");
      const bytes = Buffer.from(part.image_url.url.split(",")[1], "base64");
      if (!policy.imageHashes.includes(digest(bytes))) refuse("image outside exact synthetic allowlist");
      if (bytes.length < 24 || bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" ||
          bytes.readUInt32BE(16) > 768 || bytes.readUInt32BE(20) > 768) refuse("image geometry");
      images++;
      part.image_url.url = "[bounded synthetic PNG]";
    }
  }
  const text = JSON.stringify(bounded);
  const textBytes = Buffer.byteLength(text);
  // BBPE cannot create more regular text tokens than UTF-8 bytes. Add 8192
  // tokens for ChatML/control/server framing, with at most two plain messages,
  // no tools/search/cache creation. Each image uses the official absolute
  // Qwen3-VL maximum (16384), not a resolution-based optimistic estimate.
  const inputUpper = textBytes + 8192 + images * 16384;
  if (textBytes > 100000 || inputUpper > 128000) refuse("input bound");
  for (const asset of text.matchAll(/asset:sha256:([a-f0-9]{64})/g)) {
    if (!policy.assetHashes.includes(asset[1])) refuse("asset outside synthetic project");
  }
  if (/"profile"\s*:\s*\{\s*"principles"\s*:\s*\[\s*\{/.test(text.replaceAll("\\\"", "\""))) refuse("personal profile");
  if (body.model === VISION) {
    if (images !== 1 || textBytes > 8000 || body.enable_thinking !== false ||
        body.thinking_budget !== undefined || body.max_tokens !== 1024) refuse("vision limits");
  } else if (images || body.enable_thinking !== true || body.max_tokens !== 4096 || body.thinking_budget !== 2048) {
    refuse("planner limits");
  }
  // max_tokens excludes reasoning for these models. Reserve both plus 256
  // tokens safety margin (larger than the documented 10-token output tolerance).
  const outputUpper = body.max_tokens + (body.thinking_budget ?? 0) + 256;
  const [inputRate, outputRate] = body.model === PLANNER ? [12, 36] :
    inputUpper <= 32000 ? [1, 10] : inputUpper <= 128000 ? [1.5, 15] : [3, 30];
  return { model: body.model, inputUpper, outputUpper, textBytes, images, inputRate, outputRate,
    microCny: Math.ceil(inputUpper * inputRate + outputUpper * outputRate) };
}

export function createBudgetGuard({ directory, policy, fetchImpl, limitMicroCny = LIMIT_MICRO_CNY }) {
  if (!integer(limitMicroCny) || limitMicroCny > LIMIT_MICRO_CNY) refuse("invalid total ceiling");
  mkdirSync(directory, { recursive: true });
  const lock = join(directory, "owner.lock"), ledger = join(directory, "ledger.jsonl");
  const lockFd = openSync(lock, "wx", 0o600);
  writeSync(lockFd, JSON.stringify({ pid: process.pid, started: new Date().toISOString() }));
  fsyncSync(lockFd);
  let closed = false, frozen = false, previous = "0".repeat(64), sequence = 0, total = 0;
  const reserved = new Map();
  const close = () => { if (!closed) { closed = true; closeSync(lockFd); unlinkSync(lock); } };
  try {
    if (!existsSync(ledger)) {
      const fd = openSync(ledger, "wx", 0o600);
      try { fsyncSync(fd); } finally { closeSync(fd); }
      // The actual Host runs on Linux: persist the new ledger directory entry
      // before a reservation can ever reach the network.
      if (process.platform === "linux") {
        const directoryFd = openSync(directory, "r");
        try { fsyncSync(directoryFd); } finally { closeSync(directoryFd); }
      }
    }
    if (existsSync(ledger)) for (const line of readFileSync(ledger, "utf8").split("\n").filter(Boolean)) {
      const row = JSON.parse(line), { hash, ...value } = row;
      if (row.seq !== sequence + 1 || row.previous !== previous || digest(JSON.stringify(value)) !== hash) refuse("ledger corruption");
      if (row.kind === "reserved") {
        if (!integer(row.quote?.microCny) || !row.quote.microCny || reserved.has(row.wire)) refuse("reservation corruption");
        reserved.set(row.wire, row); total += row.quote.microCny;
      } else if (!["response", "uncertain", "violation"].includes(row.kind) || !reserved.has(row.wire)) refuse("ledger event");
      if (row.kind === "violation") frozen = true;
      previous = hash; sequence = row.seq;
    }
    if (total > limitMicroCny) refuse("existing reservations exceed ceiling");
  } catch (error) { close(); throw error; }
  function append(value) {
    try {
      const row = { seq: sequence + 1, previous, at: new Date().toISOString(), ...value };
      const hash = digest(JSON.stringify(row));
      const fd = openSync(ledger, "a", 0o600);
      try { appendFileSync(fd, JSON.stringify({ ...row, hash }) + "\n"); fsyncSync(fd); }
      finally { closeSync(fd); }
      previous = hash; sequence = row.seq;
    } catch (error) { frozen = true; throw error; }
  }
  async function guardedFetch(url, init) {
    if (closed || frozen) refuse("guard closed/frozen");
    const target = String(url);
    if (/^http:\/\/127\.0\.0\.1:(18080|18081)\//.test(target)) return fetchImpl(url, init);
    // Authorized public library downloads; product verifies pinned size/hash/range.
    const download = policy.audioDownloads?.find(item => item.url === target &&
      (item.kind === "archive_range" ? init?.headers?.Range === `bytes=${item.range_start}-${item.range_end}` : init?.headers?.Range === undefined));
    if (download) {
      const headers = init?.headers;
      if (Object.keys(init ?? {}).some(key => !["method", "redirect", "signal", "headers"].includes(key)) ||
          ![undefined, "GET"].includes(init?.method) || init?.redirect !== "error" ||
          !headers || Object.keys(headers).some(key => !["Accept-Encoding", "User-Agent", "Range"].includes(key)) ||
          headers["Accept-Encoding"] !== "identity" || headers["User-Agent"] !== "Mozilla/5.0 AVE/1.0 (audio-resource-client)") refuse("public audio download shape");
      return fetchImpl(url, init);
    }
    if (target !== ENDPOINT || init?.method !== "POST" || init?.redirect !== "error" || typeof init?.body !== "string") refuse("unauthorized transport");
    const wire = digest(init.body), body = JSON.parse(init.body), priced = quote(body, policy);
    if (reserved.has(wire)) refuse("same wire already reserved; no blind replay");
    const count = [...reserved.values()].filter(r => r.quote.model === body.model).length;
    // 2026-11-03 continuation authorizes necessary calls inside the same CNY 40 total.
    if (count >= (body.model === VISION ? 48 : 30)) refuse("physical-send count");
    if (total + priced.microCny > limitMicroCny) refuse("CNY 40 cumulative reservation would be exceeded");
    // Synchronous fsync and update precede the first await: concurrent fetches
    // cannot race. The exclusive owner lock extends that rule across processes.
    append({ kind: "reserved", wire, quote: priced });
    reserved.set(wire, { quote: priced }); total += priced.microCny;
    let response;
    try { response = await fetchImpl(url, init); }
    catch (error) { append({ kind: "uncertain", wire, reservation_retained: true }); throw error; }
    let usage = null;
    try {
      const payload = await response.clone().json(), u = payload?.usage;
      if (u && integer(u.prompt_tokens) && integer(u.completion_tokens)) {
        const reasoning = u.completion_tokens_details?.reasoning_tokens;
        // Do not undercount if a provider reports reasoning separately.
        usage = { input: u.prompt_tokens, output: u.completion_tokens, reasoning: integer(reasoning) ? reasoning : null };
        if (usage.input > priced.inputUpper || usage.output > priced.outputUpper) {
          append({ kind: "violation", wire, usage }); frozen = true;
          refuse("provider usage violated the documented conservative bound");
        }
      }
    } catch (error) { if (frozen) throw error; }
    append({ kind: "response", wire, status: response.status, usage, reservation_retained: true });
    return response;
  }
  return { fetch: guardedFetch, close, snapshot: () => ({ reservedMicroCny: total, requestsReserved: reserved.size, frozen, limitMicroCny }) };
}
