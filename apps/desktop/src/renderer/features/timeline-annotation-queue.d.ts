export type TimelineAnnotationPayloadV1 = Readonly<{
  schema_version: 1;
  annotation_id: string;
  anchor: Readonly<{
    track_id: string;
    clip_id: string | null;
    start: Readonly<{ schema_version: 1; value: number; timescale: number }>;
    end: Readonly<{ schema_version: 1; value: number; timescale: number }> | null;
  }>;
  body: string;
}>;

export type TimelineAnnotationPayloadV2 = Readonly<{
  schema_version: 2;
  annotation_id: string;
  anchor: Readonly<{
    surface: "timeline" | "preview";
    track_id: string;
    clip_id: string | null;
    start: Readonly<{ schema_version: 1; value: number; timescale: number }>;
    end: Readonly<{ schema_version: 1; value: number; timescale: number }> | null;
    preview_point: Readonly<{ x: number; y: number }> | null;
  }>;
  body: string;
}>;

export type TimelineAnnotationPayload = TimelineAnnotationPayloadV1 | TimelineAnnotationPayloadV2;

export type TimelineAnnotationSubmission = Readonly<{
  schema_version: 3;
  operation_id: string;
  message_id: string;
  project_id: string;
  request_id: string;
  draft_id: string;
  expected_revision: number;
  timeline_version: number;
  request_text: string;
  preserve_refs: readonly string[];
  profile_query: Readonly<{ contexts: readonly string[]; except_principle_ids: readonly string[] }> | null;
  annotations: readonly TimelineAnnotationPayload[];
}>;

export function timelineAnnotationV2(annotation: TimelineAnnotationPayload): TimelineAnnotationPayloadV2;

export function prepareTimelineAnnotationSubmission(
  queue: Readonly<{ annotations: readonly TimelineAnnotationPayload[]; submission?: TimelineAnnotationSubmission | null }>,
  binding: Readonly<{ project_id: string; request_id: string; draft_id: string; expected_revision: number; timeline_version: number }>,
  content: Readonly<{ request_text: string; preserve_refs: readonly string[]; profile_query: Readonly<{ contexts: readonly string[]; except_principle_ids: readonly string[] }> | null }>,
  createId?: () => string,
): TimelineAnnotationSubmission;

export function timelineAnnotationReceiptMatches(
  receipt: unknown,
  submission: TimelineAnnotationSubmission | null | undefined,
): boolean;

export function timelineTickAtMediaTime(currentTime: number, timebase: Readonly<{ value: bigint; timescale: bigint }> | null | undefined): bigint | null;
export function previewPointAtClientPoint(clientX: number, clientY: number, stageRect: Readonly<{ left: number; top: number; width: number; height: number }> | null | undefined, videoWidth: number, videoHeight: number): Readonly<{ x: number; y: number }> | null;
export function createPreviewTimelineAnnotation(timeline: Readonly<{ sequence?: Readonly<{ timebase?: Readonly<{ value: bigint; timescale: bigint }> }>; tracks?: readonly Readonly<{ track_id: string; kind: string; enabled?: boolean; clips: readonly Readonly<{ clip_id: string; timeline_start: bigint; timeline_duration: bigint }>[] }>[] }>, tick: bigint, previewPoint: Readonly<{ x: number; y: number }>, createId?: () => string): TimelineAnnotationPayloadV2;

export function currentClipConversationAnnotation(timeline: Readonly<{ version: number; sequence: Readonly<{ timebase: Readonly<{ value: bigint; timescale: bigint }> }>; tracks: readonly Readonly<{ track_id: string; clips: readonly Readonly<{ clip_id: string; timeline_start: bigint; timeline_duration: bigint }>[]; captions?: readonly Readonly<{ caption_id: string; timeline_start: bigint; timeline_duration: bigint }>[] }>[] }>, selection: Readonly<{ timeline_version: number; track_id: string; clip_id?: string; caption_id?: string }> | null, body: string, createId?: () => string): TimelineAnnotationPayloadV2;
