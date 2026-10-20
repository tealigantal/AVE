import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { test } from "node:test";
import { RecentProjects } from "../../apps/desktop/src/main/recent-projects.js";

const date = (value: number) => new Date(Date.UTC(2026, 9, 9, 12, 0, value));
const code = (expected: string) => (error: any) => error.code === expected;

test("recycle index migrates safely, hides/reveals exact IDs across restart and preserves pending cleanup", async t => {
  const root = await mkdtemp(resolve(tmpdir(), "ave-p4-recycle-"));
  t.after(async () => rm(root, { recursive: true, force: true }));
  const firstPath = resolve(root, "first-project"), secondPath = resolve(root, "second-project");
  await mkdir(firstPath); await mkdir(secondPath);
  const firstId = "a3e56c7f-5c67-4f95-9cb5-aab994e6296f", secondId = "ba981ccd-2465-40d4-a8c0-7d8f4eb095fa";
  const legacyIndex = resolve(root, "legacy", "recent-projects.json");
  await mkdir(resolve(root, "legacy"), { recursive: true });
  await writeFile(legacyIndex, JSON.stringify({ version: 1, entries: [
    { id: firstId, display_name: "first-project", last_opened_at: date(0).toISOString(), path: firstPath, project_id: "project-one" },
    { id: secondId, display_name: "second-project", last_opened_at: date(1).toISOString(), path: secondPath, project_id: "project-two" },
  ] }));

  const recents = new RecentProjects(legacyIndex, () => date(2));
  assert.deepEqual((await recents.list()).items.map(item => item.id), [secondId, firstId]);
  await recents.moveToRecycleBin(firstId, firstPath, "project-one");
  const migrated = JSON.parse(await readFile(legacyIndex, "utf8"));
  assert.equal(migrated.version, 2, "first recycle mutation atomically upgrades the navigation index");
  assert.equal(migrated.entries.find((item: any) => item.id === firstId).recycled_at, date(2).toISOString());
  assert.deepEqual((await new RecentProjects(legacyIndex).list()).items.map(item => item.id), [secondId], "restarted Main omits recycled projects from active navigation");
  assert.deepEqual((await new RecentProjects(legacyIndex).listRecycleBin()).items.map(item => item.id), [firstId]);
  await assert.rejects(recents.lookupActive(firstId), code("DESKTOP_PROJECT_IN_RECYCLE_BIN"));

  await recents.restoreFromRecycleBin(firstId);
  assert.deepEqual((await recents.list()).items.map(item => item.id).sort(), [firstId, secondId].sort());
  await recents.moveToRecycleBin(firstId);
  await recents.moveToRecycleBin(secondId);
  const restored = await recents.restoreAllFromRecycleBin();
  assert.deepEqual([...restored.restored_ids].sort(), [firstId, secondId].sort());
  assert.deepEqual((await recents.listRecycleBin()).items, []);

  await recents.moveToRecycleBin(firstId);
  await recents.beginDeletion(firstId);
  await assert.rejects(recents.restoreFromRecycleBin(firstId), code("DESKTOP_PROJECT_DELETE_PENDING"));
  assert.deepEqual((await new RecentProjects(legacyIndex).list()).items.map(item => item.id), [secondId]);
  const pending = (await recents.listRecycleBin()).items.find(item => item.id === firstId)!;
  assert.equal(pending.delete_pending, true, "interrupted physical cleanup stays visible and retryable");
  await assert.rejects(recents.beginDeletion(secondId), code("DESKTOP_RECYCLE_NOT_FOUND"));

  const bytes = await readFile(legacyIndex, "utf8");
  await writeFile(legacyIndex, "{broken");
  await assert.rejects(new RecentProjects(legacyIndex).list(), code("DESKTOP_RECENT_INDEX_INVALID"));
  assert.equal(await readFile(legacyIndex, "utf8"), "{broken", "corrupt index is never reset during recycle navigation");
  assert.ok(bytes.includes(firstId));
});
