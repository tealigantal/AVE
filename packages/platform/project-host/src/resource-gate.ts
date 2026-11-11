/** A single FIFO resource lease shared by the Host's local heavy producers. */
export class ResourceGate {
  private active = false;
  private failure: Error | undefined;
  private readonly waiting: Array<{ grant: () => void; reject: (error: Error) => void }> = [];

  constructor(readonly enabled: boolean) {}

  acquire(signal?: AbortSignal): Promise<() => void> {
    if (this.failure) return Promise.reject(this.failure);
    if (signal?.aborted) return Promise.reject(new Error("CANCELLED: resource wait cancelled", { cause: signal.reason }));
    if (!this.enabled) return Promise.resolve(() => {});
    return new Promise((resolve, reject) => {
      let settled = false;
      const remove = () => { const index = this.waiting.indexOf(waiter); if (index >= 0) this.waiting.splice(index, 1); signal?.removeEventListener("abort", abort); };
      const abort = () => { if (settled) return; settled = true; remove(); reject(new Error("CANCELLED: resource wait cancelled", { cause: signal?.reason })); };
      const waiter = {
        grant: () => { if (settled) return; settled = true; remove(); this.active = true; let released = false; resolve(() => { if (released) return; released = true; this.active = false; this.next(); }); },
        reject: (error: Error) => { if (settled) return; settled = true; remove(); reject(error); },
      };
      signal?.addEventListener("abort", abort, { once: true });
      this.waiting.push(waiter);
      this.next();
    });
  }

  poison(error: Error): void {
    this.failure ??= error;
    for (const waiter of [...this.waiting]) waiter.reject(this.failure);
  }

  private next(): void {
    if (this.active || this.failure) return;
    this.waiting[0]?.grant();
  }
}

/** Model deadlines count execution time but exclude time in the resource queue. */
export class ResourceDeadline {
  private remaining: number;
  private started = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private waiting = false;
  private expired = false;

  constructor(milliseconds: number, private readonly onTimeout: () => void) {
    this.remaining = milliseconds;
    this.start();
  }

  setWaiting(value: boolean): void {
    if (value === this.waiting) throw new Error("RESOURCE_WAIT_STATE_INVALID");
    this.waiting = value;
    if (value) {
      clearTimeout(this.timer);
      this.remaining -= performance.now() - this.started;
      if (this.remaining <= 0) this.expire();
    } else if (!this.expired) this.start();
  }

  close(): void { clearTimeout(this.timer); }

  private start(): void {
    this.started = performance.now();
    this.timer = setTimeout(() => this.expire(), Math.max(0, this.remaining));
    this.timer.unref();
  }

  private expire(): void { if (!this.expired) { this.expired = true; this.onTimeout(); } }
}
