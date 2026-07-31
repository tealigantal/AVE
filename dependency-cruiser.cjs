module.exports = {
  forbidden: [
    { name: "core-no-platform", severity: "error", from: { path: "^packages/core/" }, to: { path: "^packages/platform/" } },
    { name: "core-no-features", severity: "error", from: { path: "^packages/core/" }, to: { path: "^packages/features/" } },
    { name: "core-no-apps", severity: "error", from: { path: "^packages/core/" }, to: { path: "^apps/" } },
    { name: "core-no-runtime", severity: "error", from: { path: "^packages/core/" }, to: { path: "node:fs|node:child_process|electron|react|sqlite|ffmpeg|ffprobe" } },
    { name: "renderer-no-storage", severity: "error", from: { path: "^apps/desktop/src/renderer/" }, to: { path: "project-storage|worker-host|node:fs|node:child_process|sqlite" } },
    { name: "worker-no-sqlite", severity: "error", from: { path: "^apps/worker-host/" }, to: { path: "sqlite|project.sqlite" } },
    { name: "no-deep-package-import", severity: "error", from: { path: "^packages/(?:core|platform)/[^/]+/src/public\\." }, to: { path: "^packages/(?:core|platform)/[^/]+/src/(?!public\\.)" } },
    { name: "no-shared-common-utils", severity: "error", from: {}, to: { path: "^packages/(shared|common|utils)/" } },
    { name: "desktop-no-ffmpeg", severity: "error", from: { path: "^apps/desktop/" }, to: { path: "ffmpeg|ffprobe|node:child_process" } },
  ],
  options: { doNotFollow: { path: "node_modules|contracts/generated|docs/archive" }, tsConfig: { fileName: "tsconfig.base.json" } },
};
