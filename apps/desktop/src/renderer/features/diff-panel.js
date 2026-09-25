export function diffPanel(state) {
  const section=document.createElement("section");section.className="panel diff-panel";
  const heading=document.createElement("h2");heading.textContent="版本与修改记录";section.append(heading);
  const request=state.workspace?.requests.find(item=>item.authorization.request_id===state.selectedRequestId);
  const draft=request?.drafts.find(item=>item.draft_id===state.selectedDraftId);
  const text=document.createElement("p");text.className="muted";text.textContent=draft?`作品 v${draft.base_timeline_version} → v${draft.timeline_version} · 要求 ${draft.revision}\n${draft.source.kind==="manual"?draft.source.raw_text:"模型创作版本"}`:"选择作品版本查看对应要求与实际修改记录。";section.append(text);return section;
}
