import { reportError } from "../components/error-dialog.js";
const api = window.projectApi;

export function isCreationControlResult(result) {
  return result?.ok === false && ["REQUEST_CANCELLED", "REQUEST_REVOKED", "REQUEST_REVISION_STALE", "MODEL_CANCELLED", "DESKTOP_AUTHORIZATION_CANCELLED", "DESKTOP_EXPORT_CANCELLED"].includes(result.error?.code);
}

async function observed(operation, context) {
  try {
    const result = await operation();
    if (result?.ok === false && !isCreationControlResult(result) && !(context.operation_type === "project.audio.preview" && result.error.code === "AUDIO_LIBRARY_CANCELLED") && !(context.operation_type === "project.media.browse" && ["MEDIA_BROWSE_CANCELLED", "DESKTOP_SESSION_STALE", "REQUEST_PROJECT_CLOSED"].includes(result.error.code))) reportError(result.error, context);
    return result;
  } catch (error) { reportError(error, context); throw error; }
}

function envelope(type, projectId, payload) {
  return { api_version: 1, [type.endsWith("query") ? "query_type" : "command_type"]: type, project_id: projectId ?? "", payload };
}

export function query(queryType, projectId = "", payload) {
  return observed(() => api.query({ ...envelope("query", projectId, payload), query_type: queryType }), { project_id: projectId, operation_type: queryType });
}

export function command(commandType, projectId = "", payload, baseVersion) {
  return observed(() => api.command({ api_version: 1, command_type: commandType, command_id: crypto.randomUUID(), idempotency_key: `${commandType}:${crypto.randomUUID()}`, project_id: projectId, ...(baseVersion === undefined ? {} : { base_version: baseVersion }), payload }), { project_id: projectId, operation_type: commandType });
}

export function subscribe(listener) { return api.subscribeProjectEvents(listener); }
export function chooseFiles(request) { return api.chooseFiles(request); }
export function chooseDirectory() { return api.chooseDirectory(); }

export function onBeforeClose(listener) { return api.onBeforeClose(listener); }
export function acknowledgeClose(result) { return api.acknowledgeClose(result); }
