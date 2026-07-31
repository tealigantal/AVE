export type GateStatus = "passed" | "blocked" | "not_required" | "unknown";
export type StageGate = Readonly<Record<string, GateStatus>>;

export class StageGateService {
  assertReady(gates: StageGate): void {
    const blocked = Object.entries(gates).filter(([, status]) => status === "blocked" || status === "unknown");
    if (blocked.length) throw new Error(`stage gate blocked: ${blocked.map(([name]) => name).join(", ")}`);
  }
}
