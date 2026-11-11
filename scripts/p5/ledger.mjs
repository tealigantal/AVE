import { createHash } from 'node:crypto';
import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const LIMIT_MICRO_CNY = 100_000_000;
export const FINAL_LIMIT_MICRO_CNY = 299_173_272;
const digest = value => createHash('sha256').update(value).digest('hex');
const fail = message => { throw new Error(`P5_BUDGET: ${message}`); };
const validHash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);

function syncFile(path, data, flags) {
  const fd = openSync(path, flags, 0o600);
  try { writeFileSync(fd, data); fsyncSync(fd); } finally { closeSync(fd); }
}
function syncDirectory(path) {
  if (process.platform !== 'linux') return;
  const fd = openSync(path, 'r');
  try { fsyncSync(fd); } finally { closeSync(fd); }
}
function writeHead(directory, head) {
  const temp = join(directory, 'head.pending');
  syncFile(temp, JSON.stringify(head) + '\n', 'wx');
  renameSync(temp, join(directory, 'head.json'));
  syncDirectory(directory);
}

// Only a new, empty directory can be initialized. A broken or missing ledger is never recreated.
export function initializeLedger(directory, policyHash) {
  if (!validHash(policyHash)) fail('invalid policy hash');
  mkdirSync(directory);
  syncFile(join(directory, 'ledger.jsonl'), '', 'wx');
  writeHead(directory, { version: 1, sequence: 0, hash: '0'.repeat(64), policyHash, limit: LIMIT_MICRO_CNY });
  syncDirectory(directory);
}

export function openLedger(directory, policyHash, { limitMicroCny = LIMIT_MICRO_CNY } = {}) {
  if (!validHash(policyHash)) fail('invalid policy hash');
  if (![LIMIT_MICRO_CNY, 200_000_000, FINAL_LIMIT_MICRO_CNY].includes(limitMicroCny)) fail('invalid ceiling');
  const lock = join(directory, 'owner.lock');
  const lockFd = openSync(lock, 'wx', 0o600);
  let closed = false, frozen = false, seq = 0, previous = '0'.repeat(64), total = 0;
  const reserved = new Map(), terminals = new Set();
  const close = () => {
    if (closed) return;
    closed = true;
    closeSync(lockFd);
    unlinkSync(lock);
    syncDirectory(directory);
  };
  try {
    writeFileSync(lockFd, JSON.stringify({ pid: process.pid, started: new Date().toISOString() }));
    fsyncSync(lockFd);
    const head = JSON.parse(readFileSync(join(directory, 'head.json'), 'utf8'));
    if (head.version !== 1 || head.policyHash !== policyHash || head.limit !== limitMicroCny) fail('head policy or ceiling mismatch');
    const text = readFileSync(join(directory, 'ledger.jsonl'), 'utf8');
    if (text && !text.endsWith('\n')) fail('partial ledger entry');
    for (const line of text.split('\n').filter(Boolean)) {
      const row = JSON.parse(line), { hash, ...entry } = row;
      if (entry.seq !== seq + 1 || entry.previous !== previous || digest(JSON.stringify(entry)) !== hash || !validHash(entry.wire)) fail('invalid ledger chain');
      if (entry.kind === 'reserved') {
        if (!Number.isSafeInteger(entry.microCny) || entry.microCny <= 0 || reserved.has(entry.wire)) fail('invalid reservation');
        reserved.set(entry.wire, entry.microCny); total += entry.microCny;
      } else if (['response', 'uncertain', 'violation'].includes(entry.kind)) {
        if (!reserved.has(entry.wire) || terminals.has(entry.wire)) fail('invalid terminal entry');
        terminals.add(entry.wire);
        if (entry.kind === 'violation') frozen = true;
      } else fail('unknown ledger entry');
      previous = hash; seq = entry.seq;
    }
    if (head.sequence !== seq || head.hash !== previous || total > limitMicroCny) fail('ledger and head disagree');
  } catch (error) { close(); throw error; }

  function append(entry) {
    if (closed || frozen) fail('ledger closed or frozen');
    const row = { seq: seq + 1, previous, at: new Date().toISOString(), ...entry };
    const hash = digest(JSON.stringify(row));
    try {
      syncFile(join(directory, 'ledger.jsonl'), JSON.stringify({ ...row, hash }) + '\n', 'a');
      writeHead(directory, { version: 1, sequence: row.seq, hash, policyHash, limit: limitMicroCny });
    } catch (error) { frozen = true; throw error; }
    previous = hash; seq = row.seq;
  }
  return {
    policyHash,
    reserve(wire, microCny) {
      if (!validHash(wire) || !Number.isSafeInteger(microCny) || microCny <= 0) fail('invalid quote or wire');
      if (reserved.has(wire)) fail('wire already reserved; no blind replay');
      if (!Number.isSafeInteger(total + microCny) || total + microCny > limitMicroCny) fail('budget exceeded');
      append({ kind: 'reserved', wire, microCny });
      reserved.set(wire, microCny); total += microCny;
    },
    finish(wire, kind) {
      if (!reserved.has(wire) || terminals.has(wire) || !['response', 'uncertain', 'violation'].includes(kind)) fail('invalid terminal event');
      append({ kind, wire }); terminals.add(wire);
      if (kind === 'violation') frozen = true;
    },
    snapshot() { return { limitMicroCny, reservedMicroCny: total, reservations: reserved.size, pending: reserved.size - terminals.size, sequence: seq, frozen }; },
    close,
  };
}
