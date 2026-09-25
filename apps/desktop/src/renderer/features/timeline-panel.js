export function timelinePanel(actions,state) {
  const section=document.createElement("section"); section.className="panel timeline-panel";
  const heading=document.createElement("h2"); heading.textContent="当前作品时间线";section.append(heading);
  for(const track of state.timeline?.tracks??[]) { const line=document.createElement("p"); line.className="muted";line.textContent=`${track.track_id} · ${track.kind} · ${track.clips.length} 个片段 · ${track.captions.length} 条字幕`;section.append(line); }
  const button=document.createElement("button");button.textContent="刷新状态";button.className="secondary";button.addEventListener("click",actions.refresh);section.append(button);return section;
}
