/** Exact attribution of observed audio evidence to a chunk's non-overlapping
 * core. These helpers do not authorize model calls, remove raw child output,
 * deduplicate interpretations, or prove equivalence to unsegmented inference. */
type Time = Readonly<{ schema_version: 1; value: number; timescale: number }>;
type Chunk = Readonly<{ index: number; core_start_sample: number; core_end_sample: number; input_start_sample: number; input_end_sample: number }>;
type Observation = Readonly<{ start: Time; end: Time; uncertain: boolean }>;
type Event = Observation & Readonly<{ source_event_id: string }>;

const invalid = (message: string): never => { throw new Error(`AUDIO_CHUNK_BOUNDARY_INVALID: ${message}`); };
const integer = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const validTime = (value: Time): boolean => value !== null && typeof value === "object" && value.schema_version === 1 && integer(value.value) && integer(value.timescale) && value.timescale > 0;
const compare = (left: Time, right: Time): bigint => BigInt(left.value) * BigInt(right.timescale) - BigInt(right.value) * BigInt(left.timescale);
const sampleTime = (value: number, rate: number): Time => ({ schema_version: 1, value, timescale: rate });

function inspect(chunk: Chunk, rate: number, observed: Observation) {
  if (!chunk || !integer(chunk.index) || !integer(chunk.core_start_sample) || !integer(chunk.core_end_sample) || !integer(chunk.input_start_sample) || !integer(chunk.input_end_sample) || !integer(rate) || rate === 0 || chunk.input_start_sample > chunk.core_start_sample || chunk.core_start_sample >= chunk.core_end_sample || chunk.core_end_sample > chunk.input_end_sample || !observed || !validTime(observed.start) || !validTime(observed.end) || typeof observed.uncertain !== "boolean" || compare(observed.start, observed.end) >= 0n) invalid("invalid chunk, rate or nonempty observation interval");
  const inputStart = sampleTime(chunk.input_start_sample, rate), inputEnd = sampleTime(chunk.input_end_sample, rate), coreStart = sampleTime(chunk.core_start_sample, rate), coreEnd = sampleTime(chunk.core_end_sample, rate);
  if (compare(observed.start, inputStart) < 0n || compare(observed.end, inputEnd) > 0n) invalid("observation is outside its actual input context");
  const crosses = compare(observed.start, coreStart) < 0n && compare(observed.end, coreStart) > 0n || compare(observed.start, coreEnd) < 0n && compare(observed.end, coreEnd) > 0n;
  return { coreStart, coreEnd, crosses };
}

/** The exact midpoint belongs to at most one adjacent half-open core. Return
 * only an attribution: the caller must retain the original word and raw child
 * response, and flag conflicting/unaligned interpretations separately. */
export function classifyObservationAudioWord(chunk: Chunk, rate: number, word: Observation): Readonly<{ core_owned: boolean; crosses_boundary: boolean; uncertain: boolean }> {
  const { coreStart, coreEnd, crosses } = inspect(chunk, rate, word);
  const midpointNumerator = BigInt(word.start.value) * BigInt(word.end.timescale) + BigInt(word.end.value) * BigInt(word.start.timescale);
  const midpointDenominator = 2n * BigInt(word.start.timescale) * BigInt(word.end.timescale);
  const against = (boundary: Time) => midpointNumerator * BigInt(boundary.timescale) - BigInt(boundary.value) * midpointDenominator;
  return { core_owned: against(coreStart) >= 0n && against(coreEnd) < 0n, crosses_boundary: crosses, uncertain: word.uncertain || crosses };
}

/** Keep the original source identity and interval alongside any clipped core
 * intersection. Different model responses are never equated by this helper. */
export function intersectObservationAudioEvent(chunk: Chunk, rate: number, event: Event): Readonly<{ source_event_id: string; source_start: Time; source_end: Time; core_range: Readonly<{ start: Time; end: Time }> | null; crosses_boundary: boolean; uncertain: boolean }> {
  if (!event || typeof event.source_event_id !== "string" || !event.source_event_id.trim()) invalid("original event identity required");
  const { coreStart, coreEnd, crosses } = inspect(chunk, rate, event);
  const first = compare(event.start, coreStart) >= 0n ? event.start : coreStart;
  const last = compare(event.end, coreEnd) <= 0n ? event.end : coreEnd;
  const core_range = compare(first, last) < 0n ? { start: { ...first }, end: { ...last } } : null;
  return { source_event_id: event.source_event_id, source_start: { ...event.start }, source_end: { ...event.end }, core_range, crosses_boundary: crosses, uncertain: event.uncertain || crosses };
}
