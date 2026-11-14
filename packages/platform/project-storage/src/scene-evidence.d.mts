export type DecodedFrameIndex = {
 source_digest:string;stream_index:number;time_base:{numerator:number;denominator:number};threshold:number;start_pts:number;end_pts:number;content_digest:string;
 frames:Array<{frame_index:number;pts:number;end_pts:number;change_score:number}>;
 spans:Array<{span_index:number;first_frame_index:number;last_frame_index:number;start_pts:number;end_pts:number}>;
};
export function readMediaSceneIndex(value:unknown, sourceDigest:string):DecodedFrameIndex;
