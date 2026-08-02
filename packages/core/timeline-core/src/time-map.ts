export type TimeMapMode = "speed" | "hold" | "reverse";
export type TimeMapSegment = Readonly<{ segment_id: string; timeline_start: bigint; timeline_end: bigint; source_start: bigint; source_end: bigint; mode: TimeMapMode; speed_numerator?: bigint; speed_denominator?: bigint }>;
export type TimeMap = Readonly<{ map_id: string; segments: readonly TimeMapSegment[]; pitch_policy: "preserve" | "change" }>;

export function validateTimeMap(map: TimeMap): readonly string[] {
  const errors: string[] = []; let timelineEnd: bigint | undefined;
  if (!map.map_id || !map.segments.length) errors.push("time map needs an id and segments");
  for (const segment of map.segments) {
    if (!segment.segment_id || segment.timeline_start < 0n || segment.timeline_end <= segment.timeline_start || segment.source_start < 0n || segment.source_end < segment.source_start) errors.push("time map segment range is invalid");
    if (timelineEnd !== undefined && segment.timeline_start !== timelineEnd) errors.push("time map segments must be contiguous"); timelineEnd = segment.timeline_end;
    if (segment.mode === "speed" && (!segment.speed_numerator || !segment.speed_denominator || segment.speed_numerator <= 0n || segment.speed_denominator <= 0n)) errors.push("speed segment needs a positive rational speed");
  }
  return errors;
}

export function mapTimelineToSource(map: TimeMap, timelineTime: bigint): bigint {
  const errors = validateTimeMap(map); if (errors.length) throw new Error(`TIME_MAP_INVALID:${errors.join(",")}`);
  const segment = map.segments.find((candidate) => timelineTime >= candidate.timeline_start && timelineTime <= candidate.timeline_end);
  if (!segment) throw new Error("TIME_MAP_OUT_OF_RANGE");
  if (segment.mode === "hold") return segment.source_start;
  const elapsed = timelineTime - segment.timeline_start; const duration = segment.timeline_end - segment.timeline_start;
  const sourceDuration = segment.source_end - segment.source_start;
  const mapped = (elapsed * sourceDuration) / duration;
  return segment.mode === "reverse" ? segment.source_end - mapped : segment.source_start + mapped;
}
