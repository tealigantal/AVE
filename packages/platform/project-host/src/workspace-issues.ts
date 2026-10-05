import { randomUUID } from "node:crypto";
import { putObjectAndRegister, readObjectSync } from "../../project-storage/src/public.js";
import { workspaceIssueV1Validator } from "../../contract-runtime/src/public.js";
import type { WorkspaceIssueV1 } from "../../../../contracts/generated/typescript/project/workspace-issue.v1.js";

type Session = { manifest: { project_id: string }; db: { prepare(sql: string): { all(...bindings: Array<string | number>): unknown[] } } };
export type IssueInput = Pick<WorkspaceIssueV1, "operation_id" | "operation_type" | "code" | "message" | "subject" | "preserved" | "recovery">;

/** Host-owned immutable revisions in the existing object store; no format migration. */
export class WorkspaceIssueJournal {
  private tail: Promise<unknown> = Promise.resolve();
  private closed = false;
  constructor(private readonly session: Session, private readonly root: string, private readonly now: () => number) {}
  list(): WorkspaceIssueV1[] {
    const project = this.session.manifest.project_id;
    const rows = this.session.db.prepare("SELECT r.object_hash,r.version FROM object_refs r WHERE r.project_id=? AND r.object_type='workspace_issue' AND r.version=(SELECT MAX(q.version) FROM object_refs q WHERE q.project_id=r.project_id AND q.object_type=r.object_type AND q.relation_key=r.relation_key)").all(project) as Array<{ object_hash: string; version: number }>;
    return rows.map(row => {
      const value = JSON.parse(readObjectSync(this.root, row.object_hash).toString("utf8"));
      if (!workspaceIssueV1Validator(value)) throw new Error("DESKTOP_ISSUE_RECORD_INVALID");
      const issue = value as WorkspaceIssueV1;
      if (issue.project_id !== project || issue.revision !== row.version) throw new Error("DESKTOP_ISSUE_RECORD_INVALID");
      return issue;
    }).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }
  private enqueue<T>(work: () => Promise<T>): Promise<T> {
    if (this.closed) return Promise.reject(new Error("REQUEST_PROJECT_CLOSED"));
    const result = this.tail.then(work);
    // Only the scheduling tail recovers: each caller retains the original failure.
    this.tail = result.then(() => undefined, () => undefined);
    return result;
  }
  private async save(value: WorkspaceIssueV1) {
    if (!workspaceIssueV1Validator(value)) throw new Error("DESKTOP_ISSUE_RECORD_INVALID");
    await putObjectAndRegister(this.session, this.session.manifest.project_id, Buffer.from(JSON.stringify(value)), { object_ref_id: `${value.project_id}:workspace_issue:${value.issue_id}:v${value.revision}`, object_type: "workspace_issue", version: value.revision, relation_key: value.issue_id });
    return value;
  }
  record(input: IssueInput) {
    return this.enqueue(async () => {
      const previous = this.list().find(value => value.status === "open" && value.code === input.code && value.message === input.message && value.operation_type === input.operation_type && value.subject.kind === input.subject.kind && value.subject.id === input.subject.id);
      if (previous?.operation_id === input.operation_id) return previous;
      const time = new Date(this.now()).toISOString();
      const value: WorkspaceIssueV1 = { ...input, schema_version: 1, issue_id: previous?.issue_id ?? randomUUID(), project_id: this.session.manifest.project_id, revision: (previous?.revision ?? 0) + 1, count: (previous?.count ?? 0) + 1, created_at: previous?.created_at ?? time, updated_at: time, status: "open" };
      return this.save(value);
    });
  }
  acknowledge(id: string, expectedRevision: number, status: "resolved" | "dismissed") {
    return this.enqueue(async () => {
      const previous = this.list().find(value => value.issue_id === id);
      if (!previous) throw new Error("DESKTOP_ISSUE_NOT_FOUND");
      if (previous.revision !== expectedRevision) throw new Error("DESKTOP_ISSUE_REVISION_STALE");
      if (previous.status === status) return previous;
      return this.save({ ...previous, revision: previous.revision + 1, status, updated_at: new Date(this.now()).toISOString() });
    });
  }
  async close() { this.closed = true; await this.tail; }
}
