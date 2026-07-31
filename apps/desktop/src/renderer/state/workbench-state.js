export function createWorkbenchState() {
  return { status: { project: "not-open", timeline: "no-version", render: "idle", qc: "not-run" }, timeline: null, timelineDiff: null, media: [], jobs: [], storyPlans: [], reviewArtifacts: [], deliveryRecords: [], exports: [], modelRuns: [], qcIssues: [], storyCandidate: null, renderLatest: null, renderResults: [], previewUrl: "", selectedAssetId: "", notice: "", busy: false };
}

export function setState(state, patch) { Object.assign(state, patch); return state; }
