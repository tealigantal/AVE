import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import type { BrowserWindow } from "electron";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";
import { ProfileRepository } from "../../packages/platform/user-profile-store/src/public.js";
import { ProjectSessionManager } from "../../apps/desktop/src/main/project-session-manager.js";
import { registerMediaHandlers } from "../../apps/desktop/src/main/ipc/media.handlers.js";

const root = await mkdtemp(resolve(tmpdir(), "ave-stage3-desktop-lifecycle-"));
const deferred = <T>() => { let resolve!: (value: T) => void, reject!: (reason: unknown) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const tick = () => new Promise<void>(resolve => setImmediate(resolve));
const bounded = async <T>(pending: Promise<T>): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { return await Promise.race([pending, new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(new Error("Desktop lifecycle deadlocked")), 5000); })]); }
  finally { clearTimeout(timer); }
};
const code = (value: string) => (error: any) => error.code === value;
const credential = {}, profilePath = resolve(root, "profile"), profile = new ProfileRepository(profilePath, "owner", credential);
const host = new ProjectHostSession({ profileRepository: profile, creationRequestChannels: [{ credential, actor_id: "owner" }] });
const a = resolve(root, "a"), b = resolve(root, "b"); await host.create(b); const aId = (await host.create(a)).project;
const sessions = new ProjectSessionManager(host, profile);
const releaseOnFailure: Array<() => void> = [];
const sent: unknown[] = [], window = { webContents: { id: 1, send: (_channel: string, value: unknown) => sent.push(value) } } as unknown as BrowserWindow;
sessions.registerWindow(window);
const capture = (projectId = sessions.activeProjectId()) => sessions.capture(1, projectId, Boolean(projectId));
const switchTo = (path: string) => { const operation = capture(); return sessions.run(operation, () => sessions.transition(operation, () => host.open(path))); };
try {
  assert.throws(() => sessions.capture(1, "", true), code("DESKTOP_PROJECT_MISMATCH"));
  assert.throws(() => sessions.capture(1, "other", false), code("DESKTOP_PROJECT_MISMATCH"));
  const native = deferred<{ canceled: boolean; filePaths: string[] }>(), commands = new Map<string, any>();
  let imports = 0;
  const context = { host: { importMedia: () => { imports++; } }, sessions } as any;
  registerMediaHandlers(commands, new Map(), context, (_context, _event, operation) => sessions.waitForDialog(operation, () => native.promise));
  const importOperation = capture();
  const importing = sessions.run(importOperation, () => commands.get("project.media.import")({}, {}, importOperation));
  const cancelledImport = assert.rejects(importing, code("DESKTOP_SESSION_STALE"));
  await bounded(switchTo(b)); await cancelledImport;
  native.resolve({ canceled: false, filePaths: ["old-private-input.mp4"] }); await tick();
  assert.equal(imports, 0); assert.equal(host.listMedia().length, 0); assert.equal(sessions.isCurrent(importOperation), false);
  assert.deepEqual(sent, []);

  let destroyed = false;
  const nativeWindow = { get webContents() { if (destroyed) throw new Error("Object has been destroyed"); return { id: 2, send() {} }; } } as unknown as BrowserWindow;
  const nativeWindowId = sessions.registerWindow(nativeWindow);
  const windowOperation = sessions.capture(nativeWindowId, sessions.activeProjectId(), true), windowDialog = deferred<string>();
  const windowWait = sessions.run(windowOperation, () => sessions.waitForDialog(windowOperation, () => windowDialog.promise));
  const windowRejected = assert.rejects(windowWait, code("DESKTOP_WINDOW_CLOSED"));
  destroyed = true;
  sessions.unregisterWindow(nativeWindowId); await windowRejected;
  windowDialog.resolve("late window result"); await tick();
  assert.equal(sessions.hasWindow(nativeWindowId), false);

  const rejectedDialog = deferred<string>(), oldDialog = capture(), unhandled: unknown[] = [];
  const observe = (reason: unknown) => unhandled.push(reason); process.on("unhandledRejection", observe);
  const waiting = sessions.run(oldDialog, () => sessions.waitForDialog(oldDialog, () => rejectedDialog.promise));
  const rejected = assert.rejects(waiting, code("DESKTOP_SESSION_STALE"));
  const sameProjectId = sessions.activeProjectId(); await bounded(switchTo(b));
  assert.equal(sessions.activeProjectId(), sameProjectId); await rejected;
  rejectedDialog.reject(new Error("late native failure")); await tick(); await tick();
  process.off("unhandledRejection", observe); assert.deepEqual(unhandled, []);
  assert.throws(() => sessions.assertCurrent(oldDialog), code("DESKTOP_SESSION_STALE"));

  // A close issued by its own handler drains other handlers, never itself.
  const closing = capture();
  await bounded(sessions.run(closing, () => sessions.transition(closing, () => host.close())));
  assert.equal(sessions.activeProjectId(), ""); await switchTo(a); assert.equal(sessions.activeProjectId(), aId);

  // Productive work is never detached by an abort race. The DB remains usable
  // until its actual finally has run, even when a project switch and quit arrive.
  const producer = deferred<void>(), operation = capture(), activeSession = (host as any).session, order: string[] = [];
  releaseOnFailure.push(() => producer.resolve());
  const actual = sessions.run(operation, async () => {
    try { await producer.promise; assert.equal(activeSession.db.isOpen, true); }
    finally { order.push("producer-finished"); }
  });
  const switchOperation = capture(); let openedLate = false;
  const switching = sessions.run(switchOperation, () => sessions.transition(switchOperation, async () => { openedLate = true; return host.open(b); }));
  const cancelledSwitch = assert.rejects(switching, code("DESKTOP_SHUTTING_DOWN"));
  const realHostClose = host.close.bind(host), realProfileClose = profile.close.bind(profile), hostCloseGate = deferred<void>();
  releaseOnFailure.push(() => hostCloseGate.resolve());
  let hostCloseCalls = 0, profileCloseCalls = 0;
  host.close = async () => { hostCloseCalls++; order.push("host-close-start"); await hostCloseGate.promise; await realHostClose(); order.push("host-closed"); };
  profile.close = async () => { profileCloseCalls++; await realProfileClose(); order.push("profile-closed"); };
  const shutdown = sessions.shutdown(); assert.equal(sessions.shutdown(), shutdown);
  assert.throws(() => sessions.capture(1, "", false), code("DESKTOP_SHUTTING_DOWN"));
  assert.equal(hostCloseCalls, 0); assert.equal(profileCloseCalls, 0);
  producer.resolve(); await actual; await cancelledSwitch; await tick();
  assert.equal(openedLate, false); assert.equal(hostCloseCalls, 1); assert.equal(profileCloseCalls, 0);
  assert.equal((await profile.snapshot({ project_id: "held-out", contexts: ["travel"], except_principle_ids: [] })).mode, "unconfigured");
  hostCloseGate.resolve(); await bounded(shutdown);
  assert.deepEqual(order, ["producer-finished", "host-close-start", "host-closed", "profile-closed"]);
  assert.equal(sessions.shutdownComplete, true); assert.equal(profileCloseCalls, 1);
  await sessions.shutdown(); assert.equal(hostCloseCalls, 1);
  const recovered = new ProfileRepository(profilePath, "owner", credential); await recovered.close();
  const verified = new ProjectHostSession(); await verified.open(a); await verified.open(b); await verified.close();

  // Cleanup failure keeps admission shut, retains the cause and never advances
  // to profile close. Only an explicit later shutdown retries it.
  const failure = new Error("injected Worker ownership failure"); let failures = 0, profileCloses = 0;
  const failedSessions = new ProjectSessionManager({ status: () => ({ project: "not-open", timeline: "", render: "", qc: "" }), suspendCreationRequests: () => () => {}, close: async () => { if (++failures === 1) throw failure; } }, { close: async () => { profileCloses++; } });
  await assert.rejects(failedSessions.shutdown(), (error: unknown) => error === failure);
  assert.equal(profileCloses, 0); assert.equal(failedSessions.shutdownComplete, false);
  assert.throws(() => failedSessions.capture(1, "", false), code("DESKTOP_SHUTTING_DOWN"));
  await failedSessions.shutdown(); assert.equal(profileCloses, 1); assert.equal(failedSessions.shutdownComplete, true);
  console.log("Stage3 Desktop lifecycle: stale real handler/native waits, same-project epochs, no self-drain, actual operation completion, ordered real SQLite close and explicit shutdown retry passed");
} catch (error) { console.error("Desktop lifecycle assertion failed", error); throw error; }
finally { for (const release of releaseOnFailure) release(); await bounded(sessions.shutdown()); await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); }
