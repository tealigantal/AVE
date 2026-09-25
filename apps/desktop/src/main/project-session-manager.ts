import type { BrowserWindow } from "electron";
import type { ProjectHostSession } from "../../../../packages/platform/project-host/src/public.js";

export class DesktopLifecycleError extends Error {
  constructor(readonly code: string, message: string) { super(message); this.name = "DesktopLifecycleError"; }
}
export type DesktopOperation = Readonly<{ signal: AbortSignal }>;
type OperationRecord = { epoch: number; projectId: string; windowId: number; controller: AbortController; completion?: Promise<void>; started: boolean };
type SessionHost = Pick<ProjectHostSession, "status" | "close" | "suspendCreationRequests">;

export class ProjectSessionManager {
  private readonly windows = new Map<number, BrowserWindow>();
  private readonly records = new WeakMap<DesktopOperation, OperationRecord>();
  private readonly active = new Set<OperationRecord>();
  private epoch = 0;
  private switching = false;
  private shutdownStarted = false;
  private shutdownTask: Promise<void> | undefined;
  private closed = false;

  constructor(private readonly host: SessionHost, private readonly profile: Readonly<{ close(): Promise<void> }>) {}

  registerWindow(window: BrowserWindow): number { this.assertAdmission(); const id = window.webContents.id; this.windows.set(id, window); return id; }
  unregisterWindow(windowId: number): void {
    // Native window/webContents objects are already destroyed at `closed`.
    this.windows.delete(windowId);
    for (const record of this.active) if (record.windowId === windowId) record.controller.abort(new DesktopLifecycleError("DESKTOP_WINDOW_CLOSED", "request window closed"));
  }
  hasWindow(windowId: number): boolean { return this.windows.has(windowId); }
  activeProjectId(): string { const project = this.host.status().project; return project === "not-open" ? "" : project; }
  broadcast(channel: string, payload: unknown): void { for (const window of this.windows.values()) window.webContents.send(channel, payload); }
  get shutdownComplete(): boolean { return this.closed; }
  get acceptingRequests(): boolean { return !this.shutdownStarted && !this.switching; }

  private assertAdmission(): void {
    if (this.shutdownStarted) throw new DesktopLifecycleError("DESKTOP_SHUTTING_DOWN", "application shutdown has started");
    if (this.switching) throw new DesktopLifecycleError("DESKTOP_SESSION_CHANGING", "project lifecycle is changing");
  }
  capture(windowId: number, projectId: string, requireProject: boolean): DesktopOperation {
    this.assertAdmission();
    if (!this.hasWindow(windowId)) throw new DesktopLifecycleError("DESKTOP_WINDOW_CLOSED", "request window is not registered");
    const activeProject = this.activeProjectId();
    if ((requireProject && (!activeProject || projectId !== activeProject)) || (projectId && projectId !== activeProject)) throw new DesktopLifecycleError("DESKTOP_PROJECT_MISMATCH", "request does not name the active project");
    const controller = new AbortController(), operation = Object.freeze({ signal: controller.signal });
    this.records.set(operation, { epoch: this.epoch, projectId: activeProject, windowId, controller, started: false });
    return operation;
  }
  assertCurrent(operation: DesktopOperation): void {
    const record = this.records.get(operation);
    if (!record) throw new DesktopLifecycleError("DESKTOP_OPERATION_INVALID", "operation was not issued by Main");
    if (record.controller.signal.aborted) throw record.controller.signal.reason;
    if (this.shutdownStarted) throw new DesktopLifecycleError("DESKTOP_SHUTTING_DOWN", "application shutdown has started");
    if (record.epoch !== this.epoch || record.projectId !== this.activeProjectId() || !this.hasWindow(record.windowId)) throw new DesktopLifecycleError("DESKTOP_SESSION_STALE", "operation belongs to an earlier project session");
  }
  isCurrent(operation: DesktopOperation): boolean { try { this.assertCurrent(operation); return true; } catch { return false; } }

  async run<T>(operation: DesktopOperation, perform: () => T | Promise<T>): Promise<T> {
    this.assertCurrent(operation);
    const record = this.records.get(operation)!;
    if (record.started) throw new DesktopLifecycleError("DESKTOP_OPERATION_REUSED", "operation has already entered its handler");
    record.started = true;
    let finish!: () => void;
    record.completion = new Promise<void>(resolve => { finish = resolve; });
    this.active.add(record);
    try { return await perform(); }
    finally { this.active.delete(record); finish(); }
  }

  /** Only a native dialog may be detached after invalidation. Its late result
   * is consumed and can never re-enter Host. Productive work uses run's real Promise. */
  async waitForDialog<T>(operation: DesktopOperation, show: () => Promise<T>): Promise<T> {
    this.assertCurrent(operation);
    const signal = operation.signal;
    const value = await new Promise<T>((resolve, reject) => {
      const stop = () => reject(signal.reason);
      signal.addEventListener("abort", stop, { once: true });
      let pending: Promise<T>;
      try { pending = show(); }
      catch (error) { signal.removeEventListener("abort", stop); reject(error); return; }
      pending.then(resolve, reject).finally(() => signal.removeEventListener("abort", stop));
    });
    this.assertCurrent(operation);
    return value;
  }

  async transition<T>(operation: DesktopOperation, perform: () => Promise<T>): Promise<T> {
    this.assertCurrent(operation);
    const owner = this.records.get(operation)!;
    if (!this.active.has(owner) || this.switching) throw new DesktopLifecycleError("DESKTOP_TRANSITION_INVALID", "lifecycle transition requires one active Main operation");
    this.switching = true;
    this.epoch += 1;
    owner.epoch = this.epoch;
    for (const record of this.active) if (record !== owner) record.controller.abort(new DesktopLifecycleError("DESKTOP_SESSION_STALE", "project lifecycle changed"));
    const resume = this.host.suspendCreationRequests();
    try {
      await Promise.all([...this.active].filter(record => record !== owner).map(record => record.completion));
      // A quit that arrived during drain must prevent a late create/open.
      this.assertCurrent(operation);
      const value = await perform();
      owner.projectId = this.activeProjectId();
      return value;
    } finally { resume(); this.switching = false; }
  }

  shutdown(): Promise<void> {
    if (this.closed) return Promise.resolve();
    if (this.shutdownTask) return this.shutdownTask;
    if (!this.shutdownStarted) {
      this.shutdownStarted = true;
      this.epoch += 1;
      for (const record of this.active) record.controller.abort(new DesktopLifecycleError("DESKTOP_SHUTTING_DOWN", "application shutdown has started"));
      this.host.suspendCreationRequests();
    }
    this.shutdownTask = (async () => {
      await Promise.all([...this.active].map(record => record.completion));
      await this.host.close();
      await this.profile.close();
      this.closed = true;
    })().finally(() => { this.shutdownTask = undefined; });
    return this.shutdownTask;
  }
}
