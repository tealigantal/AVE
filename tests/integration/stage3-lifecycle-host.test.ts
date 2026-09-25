import { strict as assert } from "node:assert";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";

const root = await mkdtemp(resolve(tmpdir(), "ave-stage3-lifecycle-")), credential = {};
const host = new ProjectHostSession({ creationRequestChannels: [{ credential, actor_id: "owner" }] });
const paths = ["a", "b", "c"].map(name => resolve(root, name));
const ids: string[] = [];
const bounded = async <T>(pending: Promise<T>): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { return await Promise.race([pending, new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(new Error("project lifecycle stalled")), 3000); })]); }
  finally { clearTimeout(timer); }
};
try {
  for (const path of paths) ids.push((await host.create(path)).project);
  const session = (host as any).session, originalClose = session.close.bind(session);
  let release!: () => void, entered!: () => void, closes = 0;
  const gate = new Promise<void>(resolve => { release = resolve; }), closing = new Promise<void>(resolve => { entered = resolve; });
  session.close = async () => { closes += 1; entered(); await gate; await originalClose(); };
  const openingA = host.open(paths[0]!); await bounded(closing);
  const openingB = host.open(paths[1]!);
  assert.throws(() => (host as any).creationActor(credential), (error: any) => error.code === "REQUEST_PROJECT_CLOSED", "queued lifecycle changes synchronously stop creative admission");
  assert.equal(host.status().project, "not-open", "do not publish a closing DB while its file handles drain");
  release(); const opened = await bounded(Promise.all([openingA, openingB]));
  assert.deepEqual(opened.map(item => item.project), ids.slice(0, 2)); assert.equal(host.status().project, ids[1]); assert.equal(closes, 1);
  const verifier = new ProjectHostSession();
  try { await verifier.open(paths[0]!); await verifier.open(paths[2]!); } finally { await verifier.close(); }

  await host.close();
  const emptyOpening = host.open(paths[0]!), closeAfterEmptyOpen = host.close();
  await bounded(Promise.all([emptyOpening, closeAfterEmptyOpen])); assert.equal(host.status().project, "not-open", "close behind an in-progress open must not return early");
  await bounded(Promise.all([host.open(paths[0]!), host.close(), host.open(paths[1]!)])); assert.equal(host.status().project, ids[1]);
  await bounded(Promise.all([host.close(), host.open(paths[0]!), host.close()])); assert.equal(host.status().project, "not-open");
  await bounded(Promise.all([host.create(resolve(root, "new")), host.open(paths[1]!)])); assert.equal(host.status().project, ids[1]);

  const configure = (host as any).configureJobEngine.bind(host), recoveryFailure = new Error("injected recovery failure");
  let failOnce = true;
  (host as any).configureJobEngine = (candidate: any) => { if (failOnce) { failOnce = false; throw recoveryFailure; } return configure(candidate); };
  const failed = assert.rejects(host.open(paths[0]!), (error: unknown) => error === recoveryFailure);
  const recovered = host.open(paths[1]!); await bounded(Promise.all([failed, recovered]));
  assert.equal(host.status().project, ids[1]);
  try { await verifier.open(paths[0]!); } finally { await verifier.close(); }
  (host as any).configureJobEngine = configure;
  await bounded(Promise.all([host.close(), host.close()])); assert.equal(host.status().project, "not-open");
  console.log("Stage3 Host lifecycle: queued open/create/close, immediate admission denial, actual SQLite lock release, failed recovery cleanup and FIFO reuse passed");
} finally { await host.close(); await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); }
