import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtemp, readFile, rm, writeFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { createProject, openProject } from "../../packages/platform/project-storage/src/public.js";
import { ProfileRepository } from "../../packages/platform/user-profile-store/src/public.js";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";

const root = await mkdtemp(resolve(tmpdir(), "ave-stage3-close-"));
const credential = {}, query = { project_id: "new-project", contexts: ["travel"], except_principle_ids: [] };
const exact = (expected: Error) => (error: unknown) => error === expected;
try {
  const directory = resolve(root, "project"), session = await createProject(directory);
  const prepare = session.db.prepare.bind(session.db), checkpointFailure = new Error("injected checkpoint failure");
  session.db.prepare = (sql: string) => { if (sql === "PRAGMA wal_checkpoint(TRUNCATE)") throw checkpointFailure; return prepare(sql); };
  await assert.rejects(session.close(), exact(checkpointFailure));
  assert.equal(session.db.isOpen, true); await access(session.lock.path);
  await assert.rejects(openProject(directory), /project is already locked/);
  session.db.prepare = prepare;
  const databaseClose = session.db.close.bind(session.db), acknowledgementFailure = new Error("injected DB-close acknowledgement failure");
  let databaseCloses = 0;
  session.db.close = () => { databaseCloses++; databaseClose(); throw acknowledgementFailure; };
  await assert.rejects(session.close(), exact(acknowledgementFailure));
  assert.equal(session.db.isOpen, false); await access(session.lock.path);
  const lockText = await readFile(session.lock.path, "utf8");
  await writeFile(session.lock.path, "invalid owner JSON");
  await assert.rejects(session.close(), SyntaxError);
  assert.equal(await readFile(session.lock.path, "utf8"), "invalid owner JSON", "bad owner data is not erased or silently accepted");
  await writeFile(session.lock.path, JSON.stringify({ ...JSON.parse(lockText), token: "other-owner" }));
  await assert.rejects(session.close(), /project lock ownership changed/);
  assert.equal(JSON.parse(await readFile(session.lock.path, "utf8")).token, "other-owner");
  await writeFile(session.lock.path, lockText);
  const closing = session.close(); assert.equal(session.close(), closing, "concurrent close shares the actual release");
  await closing; await session.close(); assert.equal(databaseCloses, 1);
  const reopened = await openProject(directory); await reopened.close();

  // Observe real handles only during construction; fault injection adds no runtime port.
  for (const phase of ["data-close", "data-close-ack", "lock-rollback", "lock-close"] as const) {
    const path = resolve(root, phase), originalExec = DatabaseSync.prototype.exec;
    let data!: DatabaseSync, lock!: DatabaseSync;
    DatabaseSync.prototype.exec = function(sql: string) {
      if (sql === "PRAGMA busy_timeout=0; BEGIN EXCLUSIVE") lock = this;
      if (sql === "PRAGMA busy_timeout=0") data = this;
      return originalExec.call(this, sql);
    };
    let profile!: ProfileRepository;
    try { profile = new ProfileRepository(path, "owner", credential); }
    finally { DatabaseSync.prototype.exec = originalExec; }
    assert.ok(data?.isOpen && lock?.isOpen);
    const dataClose = data.close.bind(data), lockClose = lock.close.bind(lock), lockExec = lock.exec.bind(lock);
    const failure = new Error(`injected ${phase}`);
    let failed = false;
    if (phase.startsWith("data-close")) data.close = () => { if (!failed) { failed = true; if (phase === "data-close-ack") dataClose(); throw failure; } dataClose(); };
    if (phase === "lock-rollback") {
      lock.exec = (sql: string) => { if (sql === "ROLLBACK" && !failed) { failed = true; throw failure; } lockExec(sql); };
    }
    if (phase === "lock-close") lock.close = () => { if (!failed) { failed = true; throw failure; } lockClose(); };
    try {
      await assert.rejects(profile.close(), exact(failure));
      await assert.rejects(profile.snapshot(query), (error: any) => error.code === "PROFILE_CLOSED");
      if (phase === "data-close") {
        assert.equal(data.isOpen, true); assert.equal(lock.isTransaction, true);
        assert.throws(() => new ProfileRepository(path, "owner", credential), /locked/);
      } else assert.equal(data.isOpen, false);
      await profile.close(); await profile.close();
      assert.equal(data.isOpen, false); assert.equal(lock.isOpen, false);
      const next = new ProfileRepository(path, "owner", credential);
      assert.equal((await next.snapshot(query)).mode, "unconfigured"); await next.close();
    } finally { data.close = dataClose; lock.close = lockClose; lock.exec = lockExec; await profile.close(); }
  }

  const profile = new ProfileRepository(resolve(root, "queue"), "owner", credential);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const database = (profile as any).database, actualClose = database.close.bind(database);
  let closes = 0; database.close = () => { closes++; actualClose(); };
  const queued = (profile as any).serialize(() => gate);
  const beforeClose = profile.snapshot(query), close = profile.close();
  assert.equal(profile.close(), close);
  await assert.rejects(profile.snapshot(query), (error: any) => error.code === "PROFILE_CLOSED");
  assert.equal(closes, 0); release(); await queued;
  assert.equal((await beforeClose).mode, "unconfigured", "already admitted operations keep their place before close");
  await close; assert.equal(closes, 1);

  const host = new ProjectHostSession({ creationRequestChannels: [{ credential, actor_id: "owner" }] });
  const hostPath = resolve(root, "host"); await host.create(hostPath);
  const hostSession = (host as any).session, actualSessionClose = hostSession.close.bind(hostSession);
  const hostFailure = new Error("injected Host session cleanup failure");
  let failOnce = true;
  hostSession.close = async () => { if (failOnce) { failOnce = false; throw hostFailure; } await actualSessionClose(); };
  await assert.rejects(host.close(), exact(hostFailure));
  assert.equal(host.status().project, "not-open");
  assert.throws(() => (host as any).creationActor(credential), (error: any) => error.code === "REQUEST_PROJECT_CLOSED");
  await assert.rejects(openProject(hostPath), /project is already locked/);
  await host.close();
  const verified = await openProject(hostPath); await verified.close();
  console.log("Stage3 real SQLite close: checkpoint/acknowledgement/owner failure, profile lifetime exclusion, admitted queue drain and Host cleanup retry passed");
} finally { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); }
