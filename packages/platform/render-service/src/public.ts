// Runtime implementation remains inside this package; consumers use this public entrypoint.
// @ts-expect-error runtime .mjs boundary intentionally has no generated declaration.
export { renderPreviewMaster, qcMaster } from "./render-service.mjs";
