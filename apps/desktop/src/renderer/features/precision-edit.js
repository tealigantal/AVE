export function exactSourceTime(text){
 const value=String(text).trim(),fraction=/^(\d+)\/(\d+)$/.exec(value),decimal=/^(\d+)(?:\.(\d+))?$/.exec(value);let numerator,denominator;
 if(fraction){numerator=BigInt(fraction[1]);denominator=BigInt(fraction[2]);}else if(decimal){const digits=decimal[2]??"";numerator=BigInt(decimal[1]+digits);denominator=10n**BigInt(digits.length);}else throw new Error("源时间请填写非负秒数或分数，如 4410/44100");
 if(denominator<=0n||numerator>BigInt(Number.MAX_SAFE_INTEGER)||denominator>BigInt(Number.MAX_SAFE_INTEGER))throw new Error("源时间超出可精确表示范围");return {schema_version:1,value:Number(numerator),timescale:Number(denominator)};
}
export function precisionAction(timeline,values,ticks){
 const target=JSON.parse(values.target||"null"),clip=timeline.tracks.find(t=>t.track_id===target?.[0])?.clips.find(c=>c.clip_id===target?.[1]),kind=values.kind,associated=values.associated==="yes",enabled=values.enabled==="yes",snap=values.snap==="yes";
 if(!["insert","ripple","duck","caption"].includes(kind)&&!clip)throw new Error("请选择当前版本的片段");
 const clip_id=clip?.clip_id,at=()=>String(ticks(values.at)),duration=()=>String(ticks(values.duration));
 const number=key=>{const text=String(values[key]).trim(),n=Number(text);if(!text||!Number.isFinite(n))throw new Error(`${key} 需要有效数值`);return n;};
 if(kind==="move"||kind==="duplicate")return {kind,clip_id,at_ticks:at(),associated,snap};
 if(kind==="split")return {kind,clip_id,at_ticks:at(),associated};
 if(kind==="trim")return {kind,clip_id,source_start:exactSourceTime(values.source_start),source_end:exactSourceTime(values.source_end),associated};
 if(kind==="delete")return {kind,clip_id,associated};
 if(kind==="ripple")return {kind,start_ticks:at(),end_ticks:String(ticks(values.end))};
 if(kind==="insert"||kind==="replace"){const source=JSON.parse(values.source||"null");if(!source)throw new Error("先读取本作品获准的素材片段，再选择素材");const data={kind,asset_id:source.asset_id,span_id:source.span_id,source_start:exactSourceTime(values.source_start),source_end:exactSourceTime(values.source_end),duration_ticks:duration()};return kind==="insert"?{...data,at_ticks:at(),role:values.role}:{...data,clip_id};}
 if(kind==="image_duration")return {kind,clip_id,duration_ticks:duration()};
 if(kind==="transform")return {kind,clip_id,x:number("x"),y:number("y"),scale_x:number("scale_x"),scale_y:number("scale_y"),rotation:number("rotation")};
 if(kind==="reframe")return {kind,clip_id,mode:values.mode,focal_x:number("focal_x"),focal_y:number("focal_y")};
 if(kind==="gain")return {kind,clip_id,gain_db:number("gain_db")};
 if(kind==="fades")return {kind,clip_id,fade_in:exactSourceTime(values.fade_in),fade_out:exactSourceTime(values.fade_out)};
 if(kind==="repeat")return {kind,clip_id,count:number("count")};
 if(kind==="mute"||kind==="solo")return {kind,clip_id,enabled};
 if(kind==="duck")return {kind,enabled};
 if(kind==="detach")return {kind,clip_id};
 if(kind==="link"){const picture=JSON.parse(values.picture||"null");if(!picture)throw new Error("选择需要关联的画面");return {kind,clip_id,picture_clip_id:picture[1]};}
 if(kind==="caption"){const selected=JSON.parse(values.caption||"null");return {kind,track_id:selected?.[0]??target?.[0],caption_id:selected?.[1]??null,text:values.caption_operation==="delete"?null:values.caption_text,at_ticks:at(),duration_ticks:duration(),safe_y_ratio:number("safe_y_ratio")};}
 throw new Error("未知精修操作");
}
export const precisionFields=[
 ["kind","操作","select"],["target","选择画面或音频","select"],["at","成片位置或区间起点（秒）","text","0"],["end","作品级删除区间终点（秒）","text","1"],["duration","展示或字幕时长（秒）","text","1"],
 ["source","本作品获准素材","select"],["source_start","源素材选段开始（秒或分数）","text","0"],["source_end","源素材选段结束（秒或分数）","text","1"],["role","插入用途","select"],
 ["associated","同步关联画面、声音与字幕","select"],["snap","吸附到已有片段边界","select"],["gain_db","音量 dB","text","-12"],["fade_in","淡入时长（秒）","text","0"],["fade_out","淡出时长（秒）","text","0"],["count","总播放次数（2–16）","text","2"],["enabled","启用此操作","select"],
 ["x","水平位置","text","0"],["y","垂直位置","text","0"],["scale_x","水平缩放（0.1–4）","text","1"],["scale_y","垂直缩放（0.1–4）","text","1"],["rotation","旋转角度","text","0"],["mode","构图方式","select"],["focal_x","水平焦点（0–1）","text","0.5"],["focal_y","垂直焦点（0–1）","text","0.5"],["picture","关联画面","select"],
 ["caption","选择字幕（留空新增）","select"],["caption_operation","字幕操作","select"],["caption_text","字幕文字","textarea"],["safe_y_ratio","字幕垂直位置（0.1–0.9）","text","0.82"],["raw_text","此次修改的说明","textarea"],["preserve_refs","保护这些对象（可选）","select"]
];
export const precisionOperations=[["move","移动"],["split","分割"],["trim","按源选段裁剪"],["insert","插入素材"],["delete","普通删除"],["ripple","删除作品区间并同步后续内容"],["duplicate","复制"],["replace","替换素材并保留时序"],["image_duration","图片展示时长"],["transform","位置、缩放与旋转"],["reframe","构图与焦点"],["gain","音量"],["fades","音频淡入淡出"],["repeat","有限重复"],["mute","静音／恢复"],["solo","独听／恢复全部声音"],["duck","对白避让"],["detach","声画分离或解除关联"],["link","关联声音与画面"],["caption","字幕内容、时序与基础排版"]];
export function showPrecisionFields(controls){
 const kind=controls.kind.value,visible=new Set(["kind","target","raw_text","preserve_refs"]),mapping={move:["at","associated","snap"],duplicate:["at","associated","snap"],split:["at","associated"],trim:["source_start","source_end","associated"],insert:["at","duration","source","source_start","source_end","role"],replace:["duration","source","source_start","source_end"],delete:["associated"],ripple:["at","end"],image_duration:["duration"],transform:["x","y","scale_x","scale_y","rotation"],reframe:["mode","focal_x","focal_y"],gain:["gain_db"],fades:["fade_in","fade_out"],repeat:["count"],mute:["enabled"],solo:["enabled"],duck:["enabled"],detach:[],link:["picture"],caption:["caption","caption_operation","caption_text","at","duration","safe_y_ratio"]};
 for(const name of mapping[kind]??[])visible.add(name);for(const [name,control]of Object.entries(controls))control.parentElement.hidden=!visible.has(name);
}
