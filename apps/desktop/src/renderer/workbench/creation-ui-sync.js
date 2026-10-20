const valueKeys = ["selected_request_id", "selected_draft_id", "selected_clip_id", "library_open", "panel_open", "panel_tab"];

const canonicalize = value => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]));
  return value;
};

export function creationUiValuesEqual(left, right) {
  return JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right));
}

function slot(record, key) {
  return { present: Object.hasOwn(record, key), value: record[key] };
}

function sameSlot(left, right) {
  return left.present === right.present && (!left.present || creationUiValuesEqual(left.value, right.value));
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function mergeSlot(base, local, remote, path, conflicts) {
  const localChanged = !sameSlot(base, local);
  const remoteChanged = !sameSlot(base, remote);
  if (!localChanged) return { slot: remote };
  if (!remoteChanged || sameSlot(local, remote)) return { slot: local };
  if (local.present && remote.present && isRecord(local.value) && isRecord(remote.value) && (!base.present || isRecord(base.value))) {
    const original=base.present?base.value:{};
    const merged={};
    const keys=new Set([...Object.keys(original),...Object.keys(local.value),...Object.keys(remote.value)]);
    for(const key of keys){
      const result=mergeSlot(slot(original,key),slot(local.value,key),slot(remote.value,key),`${path}.${key}`,conflicts);
      if(result.slot.present)merged[key]=result.slot.value;
    }
    return {slot:{present:true,value:merged}};
  }
  conflicts.push(path);
  return { slot: local };
}

export function mergeCreationUi(base, local, remote) {
  for (const [label, value] of [["基线", base], ["本地", local], ["最新保存", remote]]) {
    if (!value || typeof value !== "object" || !value.forms || typeof value.forms !== "object" || Array.isArray(value.forms)) {
      throw new Error(`界面草稿同步失败：${label}状态结构无效。`);
    }
  }

  const conflicts = [];
  const merged = { forms: {} };
  const formKeys = new Set([...Object.keys(base.forms), ...Object.keys(local.forms), ...Object.keys(remote.forms)]);
  for (const key of formKeys) {
    const result = mergeSlot(slot(base.forms, key), slot(local.forms, key), slot(remote.forms, key), `forms[${JSON.stringify(key)}]`, conflicts);
    if (result.slot.present) merged.forms[key] = result.slot.value;
  }

  for (const key of valueKeys) {
    const result = mergeSlot(slot(base, key), slot(local, key), slot(remote, key), key, conflicts);
    if (result.slot.present) merged[key] = result.slot.value;
  }

  return conflicts.length ? { ok: false, conflicts } : { ok: true, value: merged };
}
