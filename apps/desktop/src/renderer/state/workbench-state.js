export function createWorkbenchState() {
  return { status: { project: "not-open", timeline: "no-version", render: "idle", qc: "not-run" }, workspace: null, timeline: null, media: [], jobs: [], creationView: "request", selectedRequestId: "", selectedDraftId: "", selectedRenderId: "", selectedAssetId: "", profileQuery: null, previewUrl: "", previewBinding: null, forms: new Map(), pending: new Map(), failedRenderAttempts: new Set(), notice: "", busy: false, refreshing: false, authorityCurrent: false };
}
export function setState(state, patch) { Object.assign(state, patch); return state; }
