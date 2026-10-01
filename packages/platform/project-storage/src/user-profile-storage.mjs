import { DatabaseSync } from "node:sqlite";
import { mkdirSync, existsSync, lstatSync, realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createHash } from "node:crypto";
import { creatorProfileStoreV1Validator } from "../../contract-runtime/src/public.mjs";

const schema = "CREATE TABLE profile_state (id INTEGER PRIMARY KEY CHECK(id=1), content TEXT NOT NULL, digest TEXT NOT NULL); PRAGMA user_version=1;";
const digest = text => createHash("sha256").update(text).digest("hex");
function assertPath(path, file = false) {
  const details = lstatSync(path, { throwIfNoEntry: false });
  if (details && (details.isSymbolicLink() || (file ? !details.isFile() || details.nlink !== 1 : !details.isDirectory()))) throw new Error("PROFILE_PATH_UNSAFE: profile paths must be ordinary, non-linked and exclusively owned files");
  if (!file) { const parent = dirname(path); if (parent !== path) assertPath(parent); }
  return details;
}
function rollback(db, primary) {
  try { if (db.isTransaction) db.exec("ROLLBACK"); }
  catch (cleanup) { throw new AggregateError([primary, cleanup], "Profile transaction and rollback failed", { cause: primary }); }
  throw primary;
}
function closeHandles(db, lock, primary) {
  const errors = primary === undefined ? [] : [primary];
  try { if (db?.isOpen) db.close(); } catch (error) { errors.push(error); }
  // Never release the single-owner lock while the data handle is still open.
  // isOpen also recognizes a close that succeeded before its acknowledgement failed.
  if (!db?.isOpen) {
    try { if (lock.isOpen && lock.isTransaction) lock.exec("ROLLBACK"); } catch (error) { errors.push(error); }
    try { if (lock.isOpen) lock.close(); } catch (error) { errors.push(error); }
  }
  if (errors.length) throw errors.length === 1 ? errors[0] : new AggregateError(errors, "Profile operation and resource cleanup failed", { cause: errors[0] });
}

/** SQL mechanism only; one ProfileRepository owns this handle, queue and user data. */
export function openUserProfileDatabase(directory, initial) {
  if (!creatorProfileStoreV1Validator(initial)) throw new Error("PROFILE_STATE_INVALID: invalid initial profile");
  let root = resolve(directory);
  assertPath(root);
  if (existsSync(resolve(root, "project.sqlite")) || existsSync(resolve(root, "project.json"))) throw new Error("PROFILE_DIRECTORY_INVALID: profile owner cannot open a project directory");
  mkdirSync(root, { recursive: true });
  root = realpathSync(root);
  const path = resolve(root, "user-profile.sqlite"), existed = existsSync(path);
  const lockPath = resolve(root, "profile-owner.lock.sqlite");
  const before = assertPath(path, true);
  assertPath(lockPath, true);
  // A separate lifetime SQLite lock is released by the OS on crash. No stale PID deletion.
  const lock = new DatabaseSync(lockPath);
  let db;
  try {
    lock.exec("PRAGMA busy_timeout=0; BEGIN EXCLUSIVE");
    db = new DatabaseSync(path);
    const opened = assertPath(path, true);
    if (before && (before.dev !== opened.dev || before.ino !== opened.ino)) throw new Error("PROFILE_PATH_REBOUND: database file identity changed while opening");
    db.exec("PRAGMA busy_timeout=0");
    if (!existed) {
      db.exec("BEGIN IMMEDIATE");
      try { db.exec(schema); const content = JSON.stringify(initial); db.prepare("INSERT INTO profile_state VALUES (1, ?, ?)").run(content, digest(content)); db.exec("COMMIT"); }
      catch (error) { rollback(db, error); }
    }
    if (db.prepare("PRAGMA user_version").get().user_version !== 1) throw new Error("PROFILE_VERSION_INVALID: user profile format is not current");
    const tables = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
    if (tables.length !== 1 || tables[0].name !== "profile_state" || !tables[0].sql.includes("CHECK(id=1)")) throw new Error("PROFILE_SCHEMA_INVALID: user profile database schema is not current");
    if (db.prepare("PRAGMA integrity_check").get().integrity_check !== "ok") throw new Error("PROFILE_DATABASE_CORRUPT: integrity check failed");
    db.exec("PRAGMA journal_mode=DELETE; PRAGMA secure_delete=ON; PRAGMA synchronous=FULL");
    const read = () => {
      const current = assertPath(path, true);
      if (!current || current.dev !== opened.dev || current.ino !== opened.ino) throw new Error("PROFILE_PATH_REBOUND: database file identity changed");
      const rows = db.prepare("SELECT content, digest FROM profile_state").all();
      if (rows.length !== 1 || digest(rows[0].content) !== rows[0].digest) throw new Error("PROFILE_DIGEST_INVALID: stored profile is corrupt");
      const state = JSON.parse(rows[0].content);
      if (!creatorProfileStoreV1Validator(state) || state.profile_id !== initial.profile_id) throw new Error("PROFILE_STATE_INVALID: persisted profile identity or contract invalid");
      return state;
    };
    read();
    let closing = false, closed = false;
    return {
      read() { if (closing) throw new Error("PROFILE_CLOSED"); return read(); },
      write(expectedVersion, state) {
        if (closing) throw new Error("PROFILE_CLOSED");
        if (!creatorProfileStoreV1Validator(state) || state.profile_id !== initial.profile_id || state.version !== expectedVersion + 1) throw new Error("PROFILE_STATE_INVALID: invalid profile successor");
        db.exec("BEGIN IMMEDIATE");
        try {
          if (read().version !== expectedVersion) throw new Error("PROFILE_VERSION_STALE: user profile changed");
          const content = JSON.stringify(state);
          db.prepare("UPDATE profile_state SET content=?, digest=? WHERE id=1").run(content, digest(content));
          db.exec("COMMIT");
        } catch (error) { rollback(db, error); }
      },
      close() { if (closed) return; closing = true; closeHandles(db, lock); closed = true; },
    };
  } catch (error) {
    closeHandles(db, lock, error);
  }
}
