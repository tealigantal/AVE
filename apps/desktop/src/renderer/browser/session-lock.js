// A browser cookie owns one Host event stream. Coordinate tabs before opening it.
export function acquireBrowserSessionLock(locks, signal) {
  if (!locks || typeof locks.request !== "function") {
    return Promise.reject(new Error("当前浏览器不支持工作台标签协调，请使用支持此功能的浏览器。"));
  }
  let release;
  const lifetime = new Promise(resolve => { release = resolve; });
  return new Promise((resolve, reject) => {
    Promise.resolve().then(() => locks.request("ave-browser-workbench-session", { mode: "exclusive", signal }, () => {
      resolve(() => release());
      return lifetime;
    })).catch(reject);
  });
}
