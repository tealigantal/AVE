import assert from "node:assert/strict";
// The current Renderer replaced the historical Stage2 entry; keep this required
// command exercising the current exact-time, explicit-target and consent boundary.
import { authorizationAssets, exactTicks, explicitList, prepareCreationAuthorization, manualCommands } from "../../apps/desktop/src/renderer/features/creation-workspace.js";
const base = { value: 1n, timescale: 24n };
assert.throws(() => exactTicks("0.1", base), /精确落在当前帧边界/);
assert.equal(exactTicks("0.125", base), 3n);
assert.equal(exactTicks("1001/30000", { value: 1001n, timescale: 30000n }), 1n);
assert.equal(exactTicks("7/1001", { value: 1n, timescale: 1001n }), 7n);
assert.equal(exactTicks("9007199254740993", { value: 1n, timescale: 1n }), 9007199254740993n);
for (const input of ["-1", "1/0", "NaN", "1e3", ""]) assert.throws(() => exactTicks(input, base));
for (const invalid of [null, { value: 0n, timescale: 24n }, { value: 1n, timescale: 0n }, { value: 1, timescale: 24 }]) assert.throws(() => exactTicks("1", invalid), /精确时间基/);
assert.deepEqual(explicitList("a，b\nc"), ["a", "b", "c"]); assert.throws(() => explicitList("a,a"), /重复/);
const media = [{ asset_id: "a", location_type: "original" }, { asset_id: "a", location_type: "proxy" }, { asset_id: "a", location_type: "original" }, { asset_id: "b", location_type: "proxy" }, { asset_id: "c", location_type: "original" }];
assert.deepEqual(authorizationAssets(media).map(item => item.asset_id), ["a", "c"], "one asset is authorized once, and a proxy alone cannot supply an Original");
const values = { original_text: "  保留原话 1n\n两段画面  ", provider: " qwen ", model: " fixture ", asset_ids: ["a"], allowed_data: ["request"], protected_refs: "clip-b", expires_at: "2027-01-01T00:00:00Z" };
const prepared = prepareCreationAuthorization(values, "request-a");
assert.equal(prepared.original_text, values.original_text); assert.deepEqual(prepared.protected_refs, ["clip-b"]); assert.equal("budget" in prepared, false);
assert.deepEqual(prepared.allowed_data, ["request"]); assert.equal(prepared.provider, "qwen");
for (const forbidden of ["actor_id", "project_id", "approval", "credential"]) assert.equal(forbidden in prepared, false);
prepared.asset_ids.push("another"); assert.deepEqual(values.asset_ids, ["a"]);
assert.throws(() => prepareCreationAuthorization({ ...values, asset_ids: [] }, "request-b"));
assert.throws(() => prepareCreationAuthorization({ ...values, expires_at: "" }, "request-b"));
const timeline = { version: 3, sequence: { timebase: base }, tracks: [{ track_id: "video", kind: "video", clips: [{ clip_id: "a" }, { clip_id: "b" }] }, { track_id: "audio", kind: "audio", clips: [{ clip_id: "a" }] }] };
const edit = { target: JSON.stringify(["video", "b"]), raw_text: "只修改第二个镜头，保留第一个", placement_text: "0.125", gain_db: "-6", caption_text: "1n", caption_start: "0", caption_duration: "0.5" };
const commands = manualCommands(timeline, edit, "actual-edit");
assert.deepEqual(commands, [{ type: "move_clip", track_id: "video", clip_id: "b", timeline_start: 3n }, { type: "set_gain", track_id: "video", clip_id: "b", gain_db: -6 }, { type: "add_caption", track_id: "video", caption: { caption_id: "caption:actual-edit", text: "1n", timeline_start: 0n, timeline_duration: 12n, style: { layout_version: 1 } } }]);
let sent = 0;
for (const target of ["", JSON.stringify(["video", "missing"]), JSON.stringify(["missing", "b"])]) assert.throws(() => { manualCommands(timeline, { ...edit, target }, "bad"); sent++; }, /具体镜头|请选择/);
assert.equal(sent, 0, "empty or stale targets cannot prepare a Host command");
assert.throws(() => manualCommands(timeline, { ...edit, placement_text: "0.1" }, "bad"), /帧边界/);
assert.throws(() => manualCommands(timeline, { ...edit, target: JSON.stringify(["audio", "a"]) }, "bad"), /字幕必须放在视频轨/);
for (const gain of [" ", "Infinity", "NaN"]) assert.throws(() => manualCommands(timeline, { ...edit, gain_db: gain }, "bad"), /音量/);
assert.throws(() => manualCommands(timeline, { ...edit, caption_duration: "0" }, "bad"), /时长必须为正/);
assert.throws(() => manualCommands(timeline, { ...edit, raw_text: " " }, "bad"));
assert.throws(() => manualCommands(timeline, { ...edit, placement_text: "", gain_db: "", caption_text: "" }, "bad"), /至少一项实际修改/);
console.log("Current Renderer exact-time, bounded consent, unique assets, raw text and explicit multi-clip target checks passed");

// Player boundary: a requested version must not replace a visible frame before
// its own media is ready, and a superseded load cannot win afterwards.
const { playerPanel } = await import("../../apps/desktop/src/renderer/features/player-panel.js");
const created = [];
class PlayerElement {
  constructor(tag) { this.tagName=tag.toUpperCase(); this.children=[]; this.events=new Map(); this.attributes=new Map(); this.hidden=false; this.paused=true; this.dataset={};this.style={};this.readyState=0;created.push(this); }
  append(...items) { for(const item of items){item.parent=this;this.children.push(item);} }
  contains(item) { return item===this||this.children.some(child=>child.contains?.(item)); }
  focus() { document.activeElement=this;this.focusCount=(this.focusCount??0)+1; }
  replaceChildren(...items) { this.children=[];this.append(...items); }
  set innerHTML(value) { this.children=[];for(const match of value.matchAll(/<(button|input|span|h2|div)\b([^>]*)>/g)){const child=new PlayerElement(match[1]);for(const attribute of match[2].matchAll(/([\w-]+)(?:="([^"]*)")?/g))child.setAttribute(attribute[1],attribute[2]??"");this.append(child);} }
  querySelector(selector) { const matches=element=>selector.startsWith('[')?element.getAttribute(selector.slice(1,-1).split('=')[0])===(selector.includes('=')?selector.split('="')[1].slice(0,-2):element.getAttribute(selector.slice(1,-1)))&&element.getAttribute(selector.slice(1,-1).split('=')[0])!==null:selector.startsWith('.')?element.getAttribute('class')===selector.slice(1):element.tagName===selector.toUpperCase();for(const child of this.children){if(matches(child))return child;const nested=child.querySelector(selector);if(nested)return nested;}return null; }
  addEventListener(type, listener) { const listeners=this.events.get(type)??[];listeners.push(listener);this.events.set(type,listeners); }
  removeEventListener(type,listener) { this.events.set(type,(this.events.get(type)??[]).filter(item=>item!==listener)); }
  fire(type,event={}) { for(const listener of this.events.get(type)??[])listener(event); }
  setAttribute(name,value) { this.attributes.set(name,value); }
  getAttribute(name) { return this.attributes.get(name)??null; }
  removeAttribute(name) { this.attributes.delete(name); }
  set src(value) { this.setAttribute("src",value); }
  get src() { return this.getAttribute("src"); }
  animate(frames,options) { const animation={frames,options,onfinish:null,oncancel:null,cancel(){this.cancelled=true;this.oncancel?.();},finish(){this.onfinish?.();}};this.animation=animation;return animation; }
  pause() { this.paused=true;this.pauseCount=(this.pauseCount??0)+1; }
  load() {}
  remove() { if(this.parent)this.parent.children=this.parent.children.filter(item=>item!==this); }
}
const previousDocument=globalThis.document,previousRevoke=URL.revokeObjectURL,previousWindow=globalThis.window;
const motion={matches:false,addEventListener(_event,listener){this.listener=listener;},removeEventListener(){this.listener=null;}};globalThis.window={matchMedia:()=>motion};
const revoked=[],viewed=[],readyVersions=[];
globalThis.document={createElement:tag=>new PlayerElement(tag)};
URL.revokeObjectURL=url=>revoked.push(url);
try {
  const state={previewUrl:"blob:first",previewBinding:{timeline_version:1}};
  const player=playerPanel({markViewed:binding=>viewed.push(binding),previewReady:(binding,url)=>readyVersions.push([binding.timeline_version,url])},state);
  player.update();const first=created.filter(item=>item.tagName==="VIDEO").at(-1);
  assert.equal(first.hidden,true);assert.deepEqual(readyVersions,[]);first.fire("loadeddata");assert.equal(first.hidden,false);assert.deepEqual(readyVersions,[[1,"blob:first"]]);
  first.paused=false;first.fire("playing");assert.equal(viewed[0].timeline_version,1);
  state.previewUrl="blob:second";state.previewBinding={timeline_version:2};player.update();
  const second=created.filter(item=>item.tagName==="VIDEO").at(-1);
  assert.equal(first.paused,false,"background media loading cannot interrupt current playback");assert.equal(second.hidden,true);
  state.previewUrl="blob:third";state.previewBinding={timeline_version:3};player.update();
  const third=created.filter(item=>item.tagName==="VIDEO").at(-1);
  second.fire("loadeddata");assert.equal(first.paused,false,"late media event cannot replace the current player");
  third.fire("error");assert.deepEqual(readyVersions,[[1,"blob:first"]],"filmstrip authority cannot advance for stale or failed frames");assert.equal(first.paused,false,"failed media retains the playable prior version");
  state.previewUrl="blob:fourth";state.previewBinding={timeline_version:4};player.update();
  first.volume=0.35;first.muted=true;
  const fourth=created.filter(item=>item.tagName==="VIDEO").at(-1);fourth.fire("loadeddata");
  assert.equal(fourth.volume,0.35,"ready version inherits the actual previous playback volume");assert.equal(fourth.muted,true,"ready version preserves user mute without changing media gain");
  assert.deepEqual(readyVersions,[[1,"blob:first"],[4,"blob:fourth"]]);assert.equal(first.paused,true);assert.equal(fourth.hidden,false);assert.equal(fourth.paused,true,"a version load never starts playback without the user");
  fourth.fire("playing");assert.equal(viewed.at(-1).timeline_version,4);
  assert.equal(fourth.animation.options.duration,180);assert.equal(first.parent.children.includes(first),true,"old decoded layer remains until transition completes");
  fourth.animation.finish();assert.equal(first.parent.children.includes(first),false,"retiring layer released at transition completion");
  state.previewUrl="blob:fifth";state.previewBinding={timeline_version:5};player.update();const fifth=created.filter(item=>item.tagName==="VIDEO").at(-1);fifth.fire("loadeddata");assert.equal(fourth.parent.children.includes(fourth),true);
  state.previewUrl="blob:sixth";state.previewBinding={timeline_version:6};player.update();const sixth=created.filter(item=>item.tagName==="VIDEO").at(-1);assert.equal(fifth.animation.cancelled,true,"next selection interrupts prior fade");assert.equal(fourth.parent.children.includes(fourth),false);sixth.fire("loadeddata");motion.matches=true;motion.listener();assert.equal(sixth.animation.cancelled,true,"live reduced-motion change immediately settles");assert.equal(fifth.parent.children.includes(fifth),false);
  state.previewUrl="blob:seventh";state.previewBinding={timeline_version:7};player.update();const seventh=created.filter(item=>item.tagName==="VIDEO").at(-1);seventh.fire("loadeddata");assert.equal(seventh.animation,undefined,"reduced-motion version switch is immediate");assert.equal(seventh.paused,true,"transitions never autoplay");
  motion.matches=false;state.previewUrl="blob:eighth";state.previewBinding={timeline_version:8};player.update();const eighth=created.filter(item=>item.tagName==="VIDEO").at(-1);eighth.fire("loadeddata");state.previewUrl="";player.update();assert.equal(eighth.animation.cancelled,true,"reset interrupts and cleans an in-flight transition");assert.equal(eighth.parent.children.filter(item=>item.tagName==="VIDEO").length,0,"reset leaves no stale video layers");
  player.destroy();for(const url of ["blob:first","blob:second","blob:third","blob:fourth","blob:fifth","blob:sixth","blob:seventh","blob:eighth"])assert.equal(revoked.filter(item=>item===url).length,1,`release ${url} exactly once`);assert.equal(motion.listener,null);assert.equal(fourth.paused,true);assert.ok(revoked.includes("blob:first"));assert.ok(revoked.includes("blob:second"));assert.ok(revoked.includes("blob:fourth"));
} finally { globalThis.document=previousDocument;globalThis.window=previousWindow;URL.revokeObjectURL=previousRevoke; }
console.log("Renderer player frame-ready, stale-load, failure retention and explicit playback checks passed");

globalThis.document={createElement:tag=>new PlayerElement(tag)};globalThis.window={matchMedia:()=>motion};URL.revokeObjectURL=url=>revoked.push(url);
try{
  const identity={project_id:'p',request_id:'r',draft_id:'d',render_id:'render',output_hash:'a'.repeat(64),timeline_version:1};
  const state={previewUrl:'blob:identity',previewBinding:identity},player=playerPanel({markViewed(){},previewReady(){}},state);player.update();const current=created.filter(item=>item.tagName==='VIDEO').at(-1);current.readyState=2;current.fire('loadeddata');current.currentTime=3.25;current.paused=false;
  assert.deepEqual(player.reuseReadyPreview({...identity}),{binding:identity,url:'blob:identity'});assert.equal(current.currentTime,3.25);assert.equal(current.paused,false);
  for(const key of ['project_id','request_id','draft_id','render_id','output_hash','timeline_version'])assert.equal(player.reuseReadyPreview({...identity,[key]:key==='timeline_version'?2:'different'}),null,`cannot reuse changed ${key}`);
  current.error={code:3};assert.equal(player.reuseReadyPreview(identity),null,'broken media remains explicitly reloadable');current.error=null;current.readyState=1;assert.equal(player.reuseReadyPreview(identity),null,'metadata alone is not a decoded reusable frame');current.readyState=2;
  state.previewUrl='blob:identity-other';state.previewBinding={...identity,draft_id:'other',timeline_version:2};player.update();const pending=created.filter(item=>item.tagName==='VIDEO').at(-1);const restored=player.reuseReadyPreview(identity);assert.equal(restored.url,'blob:identity');state.previewUrl=restored.url;state.previewBinding=restored.binding;player.update();pending.fire('loadeddata');assert.equal(current.paused,false);assert.equal(current.currentTime,3.25);assert.equal(pending.parent.children.includes(pending),false);assert.equal(revoked.includes('blob:identity'),false,'pending cancellation cannot release current URL');
  current.error={code:3};assert.equal(player.reuseReadyPreview(identity),null);state.previewUrl='blob:identity-retry';player.update();const retry=created.filter(item=>item.tagName==='VIDEO').at(-1);retry.readyState=2;retry.fire('loadeddata');assert.equal(retry.hidden,false,'explicit failed-media retry gets a fresh decoded element');player.destroy();assert.equal(player.reuseReadyPreview(identity),null,'destroyed project media cannot be reused');
}finally{globalThis.document=previousDocument;globalThis.window=previousWindow;URL.revokeObjectURL=previousRevoke;}
console.log('Renderer identical media reuse, pending cancellation, changed identity and failed-media reload checks passed');

const {comparisonPanel}=await import("../../apps/desktop/src/renderer/features/comparison-panel.js");
const priorCreate=URL.createObjectURL,priorStyle=globalThis.getComputedStyle;let comparisonUrl=0;const comparisonUrls=[];
globalThis.document={createElement:tag=>new PlayerElement(tag)};globalThis.window={matchMedia:()=>motion};globalThis.getComputedStyle=()=>({opacity:"0.5",transform:"translateY(4px)"});motion.matches=false;URL.createObjectURL=()=>{const url=`blob:compare-${++comparisonUrl}`;comparisonUrls.push(url);return url;};URL.revokeObjectURL=url=>revoked.push(url);
try {
  const panel=comparisonPanel(),items=[1,2].map(version=>({draft:{timeline_version:version},data:{bytes:new Uint8Array([1]),mime_type:"video/mp4"},timeline:{}}));
  const decode=videos=>{for(const video of videos){video.readyState=2;video.fire("loadeddata");}};
  const opener=new PlayerElement("button");opener.isConnected=true;let pending=panel.open(items,()=>true,opener),videos=created.filter(item=>item.tagName==="VIDEO").slice(-2);decode([videos[0]]);await Promise.resolve();assert.equal(panel.node.hidden,true,"comparison cannot expose a black second video while only one decoded");decode([videos[1]]);assert.equal(await pending,true);assert.equal(panel.node.hidden,false);assert.equal(panel.node.dataset.phase,"opening");assert.equal(panel.node.animation.options.duration,180);assert.ok(videos.every(v=>v.paused),"comparison never autoplays or touches main playback");panel.node.animation.finish();assert.equal(panel.node.dataset.phase,"open");
  document.activeElement=panel.node.children.find(child=>child.tagName==="BUTTON");panel.close();assert.equal(document.activeElement,opener,"dismiss restores original connected trigger focus");assert.equal(panel.node.hidden,false,"closing retains decoded layers through exit transition");assert.equal(panel.node.dataset.phase,"closing");assert.equal(panel.node.inert,true);panel.node.animation.finish();assert.equal(panel.node.hidden,true);assert.equal(panel.node.children.length,0);
  pending=panel.open(items,()=>true);videos=created.filter(item=>item.tagName==="VIDEO").slice(-2);panel.close();decode(videos);assert.equal(await pending,false,"late decoded callbacks after close cannot reopen");assert.equal(panel.node.hidden,true);
  let current=true;pending=panel.open(items,()=>current);videos=created.filter(item=>item.tagName==="VIDEO").slice(-2);current=false;decode(videos);assert.equal(await pending,false,"changed request/project selection invalidates pending comparison");assert.equal(panel.node.hidden,true);
  pending=panel.open(items,()=>true);videos=created.filter(item=>item.tagName==="VIDEO").slice(-2);const failure=assert.rejects(pending,/比较画面解码失败/);videos[0].error={code:3};videos[0].fire("error");await failure;assert.equal(panel.node.hidden,true,"decode failure is surfaced and resources are released");
  pending=panel.open(items,()=>true,opener);decode(created.filter(item=>item.tagName==="VIDEO").slice(-2));await pending;const otherInput=new PlayerElement("textarea");document.activeElement=otherInput;panel.close();assert.equal(document.activeElement,otherInput,"close never steals focus already moved elsewhere");const closing=panel.node.animation;const next=panel.open(items,()=>true);assert.equal(closing.cancelled,true,"new preparation interrupts exiting comparison");decode(created.filter(item=>item.tagName==="VIDEO").slice(-2));await next;motion.matches=true;motion.listener();assert.equal(panel.node.dataset.phase,"open","live reduced-motion settles immediately");panel.close();assert.equal(panel.node.hidden,true,"reduced-motion close is immediate");
  pending=panel.open(items,()=>true);decode(created.filter(item=>item.tagName==="VIDEO").slice(-2));await pending;assert.equal(panel.node.dataset.phase,"open");panel.destroy();for(const url of comparisonUrls)assert.equal(revoked.filter(value=>value===url).length,1,`comparison releases ${url} exactly once`);
}finally{globalThis.document=previousDocument;globalThis.window=previousWindow;globalThis.getComputedStyle=priorStyle;URL.createObjectURL=priorCreate;URL.revokeObjectURL=previousRevoke;}
console.log("Renderer comparison dual-frame readiness, cancellation, exit resource lifetime and reduced motion checks passed");

const {exportDialog}=await import("../../apps/desktop/src/renderer/features/export-dialog.js");
globalThis.document={createElement:tag=>new PlayerElement(tag)};globalThis.window={matchMedia:()=>motion};globalThis.getComputedStyle=()=>({opacity:"0.5",transform:"translateY(4px)"});motion.matches=false;
try{
  const calls=[],replies=[];const dialog=exportDialog(identity=>{calls.push(identity);return new Promise(resolve=>replies.push(resolve));});
  const opener=new PlayerElement("button");opener.isConnected=true;const selected={project_id:"p1",request_id:"request-a",draft_id:"draft-a",render_id:"render-a",timeline_version:1,preview_qc:"通过",master_qc:"通过"};
  dialog.setProject("p1");assert.equal(dialog.open(selected,opener),true);const panel=dialog.node.children[0],dismiss=panel.children[0].children[1],send=panel.children.at(-1),status=panel.children.at(-2);
  assert.equal(document.activeElement,dismiss);assert.equal(panel.getAttribute("aria-modal"),"true");send.fire("click");selected.draft_id="draft-b";assert.equal(calls[0].draft_id,"draft-a","export binds the exact identity present when dialog opened");assert.equal(send.disabled,true);
  dialog.close();assert.equal(document.activeElement,opener);assert.equal(dialog.node.hidden,false);assert.equal(dialog.node.inert,true);const closing=panel.animation;dialog.open({...selected,draft_id:"draft-a"},opener);assert.equal(closing.cancelled,true,"reopen interrupts exit without replacing content");replies.shift()({ok:false,error:{code:"DESKTOP_EXPORT_CANCELLED",message:"已取消导出"}});await Promise.resolve();await Promise.resolve();assert.match(status.textContent,/已取消导出/);dialog.close(true);dialog.open({...selected,draft_id:"draft-a"},opener);assert.match(status.textContent,/已取消导出/,"closing retains the same-version export error");
  send.fire("click");dialog.setProject("p2");dialog.setProject("p1");dialog.open({...selected,draft_id:"draft-a"},opener);replies.shift()({ok:false,error:{message:"late old-project result"}});await Promise.resolve();await Promise.resolve();assert.doesNotMatch(status.textContent,/late old-project/);assert.equal(send.disabled,false,"old epoch cannot mutate a reopened project dialog");
  motion.matches=true;motion.listener();dialog.close();assert.equal(dialog.node.hidden,true,"reduced motion closes immediately");dialog.destroy();
}finally{globalThis.document=previousDocument;globalThis.window=previousWindow;globalThis.getComputedStyle=priorStyle;}
console.log("Renderer export identity, retained failure, interruptible close, focus and project-epoch checks passed");


const { alignedPreviewSeconds } = await import("../../apps/desktop/src/renderer/features/player-panel.js");
const viewTimeline=(clips)=>({sequence:{timebase:{value:1n,timescale:25n}},tracks:[{kind:"video",enabled:true,clips}]});
const sourceClip={source:{asset_id:"actual-source",start_pts:1000n,end_pts:2000n,timescale:1000n},timeline_start:0n,timeline_duration:25n};
const from=viewTimeline([sourceClip]),reordered=viewTimeline([{...sourceClip,timeline_start:50n,source:{...sourceClip.source,start_pts:2000n,end_pts:4000n,timescale:2000n}}]);
assert.equal(alignedPreviewSeconds(from,reordered,0.52),2.52,"source PTS correspondence survives reordering and different source timescales");
assert.equal(alignedPreviewSeconds(from,viewTimeline([{...sourceClip,source:{...sourceClip.source,asset_id:"unrelated"}}]),0.52),null,"removed footage must never percentage-sync to unrelated content");
assert.equal(alignedPreviewSeconds(from,viewTimeline([sourceClip,{...sourceClip,timeline_start:50n}]),0.52),null,"repeated footage without unambiguous lineage cannot be guessed");
assert.equal(alignedPreviewSeconds(from,reordered,2),null,"a gap has no source correspondence");
assert.throws(()=>alignedPreviewSeconds(from,reordered,NaN),/位置无效/);
console.log("Renderer exact source correspondence and no-match comparison checks passed");

const { editNavigationHistory, advanceEditNavigation } = await import("../../apps/desktop/src/renderer/state/workbench-state.js");
const requestHistory={latest_draft_id:"c",drafts:[{draft_id:"a",parent_draft_id:null},{draft_id:"b",parent_draft_id:"a"},{draft_id:"c",parent_draft_id:"b"}]};
const originalHistory=editNavigationHistory(requestHistory,null);
const undoHistory=advanceEditNavigation(originalHistory,"restore-b",-1);
assert.equal(undoHistory.ids[undoHistory.cursor],"b");
assert.equal(advanceEditNavigation(undoHistory,"restore-a",-1).ids[0],"a");
assert.equal(advanceEditNavigation(undoHistory,"restore-c",1).cursor,2);
assert.deepEqual(originalHistory.ids,["a","b","c"],"preparing another navigation never changes the prior successful history");
const reopenedHistory={...requestHistory,latest_draft_id:"restore-b",drafts:[...requestHistory.drafts,{draft_id:"restore-b",parent_draft_id:"c"}]};
assert.deepEqual(editNavigationHistory(reopenedHistory,JSON.parse(JSON.stringify(undoHistory))),undoHistory,"saved undo cursor survives reopen while Host keeps a new committed draft");
const branchedHistory=advanceEditNavigation(undoHistory,"new-edit");
assert.deepEqual(branchedHistory.ids,["a","b","new-edit"],"an edit after undo replaces only the redo navigation branch, never Host history");
assert.throws(()=>advanceEditNavigation(branchedHistory,"bad",1),/没有可撤销/);
console.log("Renderer persistent edit undo, redo, branch and failed-navigation immutability checks passed");

const { creationNoticeText } = await import("../../apps/desktop/src/renderer/state/workbench-state.js");
assert.match(creationNoticeText("CREATION_DURATION_TARGET_UNMET: operation failed"),/总时长不符合当前要求/);
assert.match(creationNoticeText("CREATION_TIME_INEXACT: operation failed"),/精确帧边界/);
assert.doesNotMatch(creationNoticeText("CREATION_PRODUCTION_FAILED"),/未提交/);
assert.equal(creationNoticeText("REQUEST_BASE_STALE: exact cause"),"REQUEST_BASE_STALE: exact cause");

const providerMessage="模型服务未能完成这次请求，本次制作已停止。已保存的作品版本仍保留；请查看本地记录中的具体原因。";
assert.equal(creationNoticeText(`MODEL_PROVIDER_FAILED: ${providerMessage}`),providerMessage,"ordinary creator notice uses safe Main copy without repeating diagnostic code");

const { previewPlaceholderText }=await import("../../apps/desktop/src/renderer/features/player-panel.js");
const placeholderRequest={authorization:{request_id:"current"},status:"paused",drafts:[],production:null};
const placeholderState={selectedRequestId:"current",media:[{location_type:"original"}],workspace:{requests:[placeholderRequest]}};
assert.match(previewPlaceholderText({media:[]})[0],/画面将在这里开始/);
assert.match(previewPlaceholderText({media:placeholderState.media})[0],/素材已导入/);
for(const [phase,label] of [["material-preparation","正在准备素材"],["observation","正在分析画面与声音"],["generation-and-commit","正在生成与校验初稿"],["preview-master-render","正在制作可播放画面"]]){placeholderRequest.production={phase};assert.equal(previewPlaceholderText(placeholderState)[0],label);assert.doesNotMatch(previewPlaceholderText(placeholderState).join(" "),/导入素材|%/);}
placeholderRequest.status="failed";assert.match(previewPlaceholderText(placeholderState)[0],/未完成/);assert.match(previewPlaceholderText(placeholderState)[1],/继续制作/);assert.doesNotMatch(previewPlaceholderText(placeholderState).join(" "),/未提交|导入素材/);
placeholderRequest.status="paused";placeholderRequest.production=null;placeholderRequest.drafts=[{renders:[{}]}];assert.match(previewPlaceholderText(placeholderState)[0],/选择一个版本/);

const {validateWorkspaceContext,clipMatchesTimeline}=await import("../../apps/desktop/src/renderer/state/workbench-state.js");
const actualContext={context_version:2,profile_query:{contexts:["旅行"],except_principle_ids:["excluded-principle"]},composing_new:true,selected_render_id:"",watched_preview:{project_id:"p",request_id:"r",draft_id:"v1",render_id:"render-v1",output_hash:"a".repeat(64),timeline_version:1},clip_selection:{track_id:"v",clip_id:"shared",timeline_version:1}};
assert.deepEqual(validateWorkspaceContext(actualContext,"p"),actualContext);
const {profile_query:legacyQuery,...legacyContext}=actualContext;
assert.deepEqual(validateWorkspaceContext({...legacyContext,context_version:1},"p"),{...actualContext,profile_query:null},"legacy form values never imply an applied profile query");
assert.deepEqual(validateWorkspaceContext({...actualContext,profile_query:null},"p").profile_query,null,"explicit non-personalized choice is preserved");
for(const query of [undefined,{}, {contexts:["旅行"]}, {contexts:"旅行",except_principle_ids:[]},{contexts:["旅行","旅行"],except_principle_ids:[]},{contexts:[],except_principle_ids:[null]},{contexts:[],except_principle_ids:[],snapshot:{}}])assert.throws(()=>validateWorkspaceContext({...actualContext,profile_query:query},"p"),/无效/);

for(const bad of [{...actualContext,composing_new:undefined},{...actualContext,context_version:3},{...actualContext,watched_preview:{...actualContext.watched_preview,project_id:"other"}},{...actualContext,clip_selection:{track_id:"v",clip_id:"shared"}}])assert.throws(()=>validateWorkspaceContext(bad,"p"),/无效/);
assert.equal(clipMatchesTimeline(actualContext.clip_selection,{version:2,tracks:[{track_id:"v",clips:[{clip_id:"shared"}]}]}),false,"same clip ID in another version cannot be referenced as the saved selection");
assert.equal(clipMatchesTimeline(actualContext.clip_selection,{version:1,tracks:[{track_id:"v",clips:[{clip_id:"shared"}]}]}),true);

const {thumbnailTick}=await import("../../apps/desktop/src/renderer/features/timeline-panel.js");
assert.equal(thumbnailTick({timeline_start:540n,timeline_duration:180n}),630n,"representative frame is inside the actual fourth shot, not its encoded cut boundary");
assert.equal(thumbnailTick({timeline_start:3n,timeline_duration:1n}),3n);assert.throws(()=>thumbnailTick({timeline_start:0n,timeline_duration:0n}),/精确时间/);
const {creationQcRows}=await import("../../apps/desktop/src/renderer/features/creation-workspace.js");
const silent={code:"SILENCE",severity:"warning",blocker:false};const qcPair={preview:{qc:{issues:[silent]}},master:{qc:{issues:[silent]}}};assert.deepEqual(creationQcRows(qcPair).map(item=>item.text),["预览与成片：检测到静音（提示，此项不阻止导出）"]);
qcPair.master.qc.issues=[{...silent,blocker:true}];const qcRows=creationQcRows(qcPair);assert.equal(qcRows.length,2,"different blocker states must never be merged into a harmless warning");assert.match(qcRows[1].text,/未通过检查/);assert.equal(qcRows[1].blocker,true);
const { selectedTimelineShot } = await import('../../apps/desktop/src/renderer/features/timeline-panel.js');
const selectedShotTimeline={version:5,tracks:[{track_id:'video-main',clips:[{clip_id:'shot_2'}]}]};
assert.equal(selectedTimelineShot({timeline_version:5,track_id:'video-main',clip_id:'shot_2'},selectedShotTimeline,'video-main','shot_2'),true);
assert.equal(selectedTimelineShot({timeline_version:4,track_id:'video-main',clip_id:'shot_2'},selectedShotTimeline,'video-main','shot_2'),false,'same shot ID in another version is not selected');
