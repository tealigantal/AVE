function seconds(value, scale) {
  const whole = value / scale, fraction = ((value % scale) * 1000000n / scale).toString().padStart(6, "0").replace(/0+$/, "");
  return `${whole}${fraction ? `.${fraction}` : ""}`;
}

// This confirms an explicit edit range, never a change to the original media.
export function audioPlacementDialog(range) {
  const previousFocus = document.activeElement;
  const dialog = document.createElement("dialog");
  dialog.className = "persistent-error-dialog";
  dialog.setAttribute("aria-label", "确认音频放入范围");
  const title = document.createElement("h2"); title.textContent = "确认音频放入范围";
  const detail = document.createElement("p");
  detail.textContent = `这段音频的结尾不在作品帧边界。将放入 ${range.duration} 帧（${seconds(range.sourceDuration, range.range.timescale)} 秒）；末尾约 ${seconds(range.omitted, range.range.timescale)} 秒不加入。原素材保持完整。`;
  const exact = document.createElement("p"); exact.className = "muted";
  exact.textContent = `放入源范围：${range.range.start_pts}/${range.range.timescale} 至 ${range.range.start_pts + range.sourceDuration}/${range.range.timescale} 秒。`;
  const buttons = document.createElement("div"); buttons.className = "button-row";
  const cancel = document.createElement("button"); cancel.type = "button"; cancel.textContent = "取消";
  const accept = document.createElement("button"); accept.type = "button"; accept.textContent = "按此范围放入";
  buttons.append(cancel, accept); dialog.append(title, detail, exact, buttons);
  let finish;
  const promise = new Promise(resolve => {
    let settled = false;
    finish = accepted => {
      if (settled) return;
      settled = true; dialog.close(); dialog.remove();
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
      resolve(accepted);
    };
    cancel.addEventListener("click", () => finish(false));
    accept.addEventListener("click", () => finish(true));
    dialog.addEventListener("cancel", event => { event.preventDefault(); finish(false); });
  });
  document.body.append(dialog); dialog.showModal(); cancel.focus();
  return { promise, cancel: () => finish(false) };
}
