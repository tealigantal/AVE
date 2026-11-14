// Coalesce bursts without losing a change that arrives during an active read.
export function changesWorkspace(event) {
  return !["project.creation.ui.save", "project.media.browse.release"].includes(event?.event_type);
}

export function createRefreshCoalescer(read, mayContinue) {
  let active = null, again = false;
  return () => {
    if (active) { again = true; return active; }
    const pending = (async () => {
      let result;
      do {
        again = false;
        result = await read();
      } while (again && mayContinue());
      return result;
    })();
    active = pending.finally(() => { active = null; });
    return active;
  };
}
