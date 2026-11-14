import { createHash } from "node:crypto";
import { constants, openSync, closeSync, fstatSync, lstatSync, readSync } from "node:fs";
import { mediaSceneResultV2Validator, creationDigest } from "../../contract-runtime/src/public.mjs";

const invalid = () => { throw new Error("MEDIA_EVIDENCE_INVALID: stored scene evidence"); };
const safe = (n, min=0) => Number.isSafeInteger(n) && n>=min;
const identity = s => `${s.dev}:${s.ino}:${s.size}:${s.mtimeNs}:${s.ctimeNs}`;

/** A neutral index, never a Worker v1 result. No staging path enters its identity. */
export function readMediaSceneIndex(value, sourceDigest) {
  if(!mediaSceneResultV2Validator(value) || value.receipt.header.source_digest!==sourceDigest) invalid();
  const {receipt}=value, header=receipt.header;
  // Bound retained business facts independently of file size, never truncate.
  if(receipt.frame_count>250000) throw new Error("MEDIA_EVIDENCE_MEMORY_BUDGET_EXCEEDED");
  if(lstatSync(value.path).isSymbolicLink()) invalid();
  const fd=openSync(value.path,constants.O_RDONLY|(process.platform==="win32"?0:constants.O_NOFOLLOW));
  try {
    const before=fstatSync(fd,{bigint:true});
    if(!before.isFile()||before.nlink!==1n||before.size!==BigInt(receipt.byte_length)) invalid();
    const hash=createHash("sha256"), buffer=Buffer.alloc(64*1024), frames=[],spans=[];
    let carry=Buffer.alloc(0),position=0,rows=0;
    const consume=line=>{
      if(line.length>4096) invalid();
      let row;try{row=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(line));}catch{invalid();}
      if(rows++===0){if(creationDigest(row)!==creationDigest(header))invalid();return;}
      if(Object.keys(row).sort().join(",")!=="change_score,end_pts,frame_index,pts"||row.frame_index!==frames.length||!safe(row.pts)||!safe(row.end_pts,1)||row.end_pts<=row.pts||typeof row.change_score!=="number"||!Number.isFinite(row.change_score)||row.change_score<0||row.change_score>100||row.pts!==(frames.at(-1)?.end_pts??receipt.start_pts))invalid();
      if(frames.length>=receipt.frame_count)invalid();
      frames.push(row);
      if(!spans.length||row.change_score>=header.threshold)spans.push({span_index:spans.length,first_frame_index:row.frame_index,last_frame_index:row.frame_index,start_pts:row.pts,end_pts:row.end_pts});
      else {const span=spans.at(-1);span.last_frame_index=row.frame_index;span.end_pts=row.end_pts;}
    };
    for(;;){const count=readSync(fd,buffer,0,buffer.length,position);if(!count)break;position+=count;hash.update(buffer.subarray(0,count));let start=0;
      for(let i=0;i<count;i++)if(buffer[i]===10){consume(Buffer.concat([carry,buffer.subarray(start,i+1)]));carry=Buffer.alloc(0);start=i+1;}
      carry=Buffer.concat([carry,buffer.subarray(start,count)]);if(carry.length>4096)invalid();
    }
    if(carry.length||position!==receipt.byte_length||hash.digest("hex")!==receipt.sha256||frames.length!==receipt.frame_count||frames.at(-1)?.end_pts!==receipt.end_pts||spans.length!==value.span_count||identity(before)!==identity(fstatSync(fd,{bigint:true}))||identity(before)!==identity(lstatSync(value.path,{bigint:true})))invalid();
    return {source_digest:header.source_digest,stream_index:header.stream_index,time_base:header.time_base,threshold:header.threshold,start_pts:receipt.start_pts,end_pts:receipt.end_pts,content_digest:receipt.sha256,frames,spans};
  } finally { closeSync(fd); }
}
