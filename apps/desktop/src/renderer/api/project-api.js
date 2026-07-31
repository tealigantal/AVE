const api = window.projectApi;

function envelope(type, projectId, payload) {
  return { api_version: 1, [type.endsWith("query") ? "query_type" : "command_type"]: type, project_id: projectId ?? "", payload };
}

export function query(queryType, projectId = "", payload) {
  return api.query({ ...envelope("query", projectId, payload), query_type: queryType });
}

export function command(commandType, projectId = "", payload, baseVersion) {
  return api.command({ api_version: 1, command_type: commandType, command_id: crypto.randomUUID(), idempotency_key: `${commandType}:${crypto.randomUUID()}`, project_id: projectId, ...(baseVersion === undefined ? {} : { base_version: baseVersion }), payload });
}

export function subscribe(listener) { return api.subscribeProjectEvents(listener); }
export function chooseFiles(request) { return api.chooseFiles(request); }
export function chooseDirectory() { return api.chooseDirectory(); }
