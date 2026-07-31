export function statusCard(label, value) {
  const element = document.createElement("article");
  element.className = "status-card";
  element.innerHTML = `<span>${label}</span><strong>${value ?? "—"}</strong>`;
  return element;
}
