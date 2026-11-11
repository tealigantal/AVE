import assert from 'node:assert/strict';
import { test } from 'node:test';
import { acquireBrowserSessionLock } from '../../apps/desktop/src/renderer/browser/session-lock.js';

function manager() {
  let active = false;
  const queue = [];
  function drain() {
    if (active || !queue.length) return;
    const item = queue.shift();
    if (item.signal.aborted) { item.reject(item.signal.reason); drain(); return; }
    active = true;
    item.signal.removeEventListener('abort', item.abort);
    Promise.resolve().then(item.callback).then(item.resolve, item.reject).finally(() => { active = false; drain(); });
  }
  return { request(name, options, callback) {
    assert.equal(name, 'ave-browser-workbench-session');
    assert.equal(options.mode, 'exclusive');
    return new Promise((resolve, reject) => {
      const item = { callback, resolve, reject, signal: options.signal };
      item.abort = () => { const index = queue.indexOf(item); if (index >= 0) { queue.splice(index, 1); reject(item.signal.reason); } };
      queue.push(item); item.signal.addEventListener('abort', item.abort, { once: true }); drain();
    });
  } };
}

test('one workbench connects while another waits, then handover releases cleanly', async () => {
  const locks = manager(), first = new AbortController(), second = new AbortController();
  const releaseFirst = await acquireBrowserSessionLock(locks, first.signal);
  let granted = false;
  const next = acquireBrowserSessionLock(locks, second.signal).then(release => { granted = true; return release; });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(granted, false, 'a second tab cannot open the shared event stream');
  releaseFirst();
  const releaseSecond = await next;
  assert.equal(granted, true);
  releaseSecond();
});

test('waiting tab can close, and unsupported or failed locks fail visibly', async () => {
  const locks = manager(), first = new AbortController(), waiting = new AbortController();
  const releaseFirst = await acquireBrowserSessionLock(locks, first.signal);
  const rejected = assert.rejects(acquireBrowserSessionLock(locks, waiting.signal), /closed tab/);
  await new Promise(resolve => setImmediate(resolve));
  waiting.abort(new Error('closed tab'));
  await rejected;
  releaseFirst();
  await assert.rejects(acquireBrowserSessionLock(undefined, new AbortController().signal), /不支持/);
  await assert.rejects(acquireBrowserSessionLock({ request: () => Promise.reject(new Error('lock failed')) }, new AbortController().signal), /lock failed/);
});
