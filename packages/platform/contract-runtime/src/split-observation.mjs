import { creationDigest } from "./creation-session.mjs";

const invalid = message => { throw new Error(`CREATION_SPLIT_PROOF_INVALID: ${message}`); };
const gcd = (a, b) => b ? gcd(b, a % b) : a;
const reduce = (n, d) => { const g = gcd(n, d); return { n: n / g, d: d / g }; };
const compare = (a, b) => a.n * b.d - b.n * a.d;
function sourceTime(value) {
  if (!value || value.schema_version !== 1 || !Number.isSafeInteger(value.value) || value.value < 0 || !Number.isSafeInteger(value.timescale) || value.timescale <= 0) invalid("sample source RationalTime invalid");
  return reduce(BigInt(value.value), BigInt(value.timescale));
}
function decimal(value) {
  if (typeof value !== "string" || !/^\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(value)) invalid("Whisper decimal timestamp invalid");
  const [mantissa, exponent = "0"] = value.toLowerCase().split("e"), [integer, fraction = ""] = mantissa.split(".");
  const power = Number(exponent) - fraction.length;
  if (!Number.isSafeInteger(power) || Math.abs(power) > 100) invalid("Whisper timestamp exponent cannot be represented");
  const digits = BigInt(integer + fraction);
  return power < 0 ? reduce(digits, 10n ** BigInt(-power)) : reduce(digits * 10n ** BigInt(power), 1n);
}
function absolute(origin, relative) {
  const value = reduce(origin.n * relative.d + relative.n * origin.d, origin.d * relative.d);
  if (value.n > BigInt(Number.MAX_SAFE_INTEGER) || value.d > BigInt(Number.MAX_SAFE_INTEGER)) invalid("Whisper source timestamp exceeds exact contract range");
  return { schema_version: 1, value: Number(value.n), timescale: Number(value.d) };
}
export function splitTranscript(sample, output) {
  const origin = sourceTime(sample.actual_start), end = sourceTime(sample.actual_end), duration = reduce(end.n * origin.d - origin.n * end.d, end.d * origin.d);
  if (duration.n <= 0n || !Array.isArray(output?.segments)) invalid("transcription or sample range missing");
  let previous = { n: 0n, d: 1n };
  return output.segments.map((segment, index) => {
    // Historical segment-only proofs remain readable. New providers require words.
    const words = segment.words;
    if (words !== undefined) {
      if (!Array.isArray(words) || !words.length) invalid("Whisper word alignment missing");
      let wordEnd = previous;
      for (const word of words) {
        const begin = decimal(word.start), finish = decimal(word.end);
        if (typeof word.word !== "string" || !word.word.trim() || compare(begin, wordEnd) < 0n || compare(begin, finish) > 0n) invalid("Whisper word alignment invalid");
        wordEnd = finish;
      }
    }
    const start = decimal(words ? words[0].start : segment.start);
    let finish = decimal(words ? words.at(-1).end : segment.end);
    // Preserve raw timestamps in the immutable child proof; only bound projection.
    if (index === output.segments.length - 1 && compare(start, duration) < 0n && compare(finish, duration) > 0n) finish = duration;
    if (compare(start, previous) < 0n || compare(start, finish) >= 0n || compare(finish, duration) > 0n || (words && words.some(word => compare(decimal(word.start), duration) >= 0n))) invalid("Whisper segment is unordered or outside the actual uploaded sample");
    if (typeof segment.text !== "string" || !segment.text.trim()) invalid("Whisper text missing");
    previous = finish;
    return { start: absolute(origin, start), end: absolute(origin, finish), text: segment.text };
  });
}
export function fuseSplitObservation(input, proof) {
  if (proof?.kind !== "split-observation-v1" || !Array.isArray(proof.parts) || input.context?.operation !== "observe" || !Array.isArray(input.context.samples) || input.context.samples.length !== input.media.length) invalid("observation composition metadata missing");
  let index = 0;
  const part = (role, sampleId) => {
    const entry = proof.parts[index++];
    if (!entry || entry.target.role !== role || entry.target.sample_id !== sampleId || creationDigest(entry.output) !== entry.output_hash) invalid("ordered child output identity/digest differs");
    return entry.output;
  };
  const perception = value => {
    if (!value || Object.keys(value).sort().join(",") !== "description,uncertain" || typeof value.description !== "string" || !value.description.trim() || typeof value.uncertain !== "boolean") invalid("perception fields invalid");
    return value;
  };
  const samples = input.media.map(media => {
    const sample = input.context.samples.find(item => item.sample_id === media.sample_id);
    if (!sample) invalid("sample metadata missing");
    if (media.mime_type === "image/png") return { sample_id: media.sample_id, ...perception(part("vision", media.sample_id)), transcript: [] };
    if (media.mime_type !== "audio/wav") invalid("unsupported sample type");
    const transcript = splitTranscript(sample, part("transcription", media.sample_id));
    return { sample_id: media.sample_id, ...perception(part("sound", media.sample_id)), transcript };
  });
  if (index !== proof.parts.length) invalid("extra child output");
  return { samples };
}
/** Both first publication and reopen must reconstruct the same fused response
 * from child outputs bound to immutable physical-call settlements. */
export function validateSplitObservationProof(state, ticket, input, output, audit) {
  const proof = audit?.composition, calls = state.model_calls.filter(call => call.run_id === ticket.run_id);
  if (!state.authorization.deployment?.routes || audit.token_usage !== undefined || audit.retry_count !== 0 || audit.cache_hit || !Array.isArray(proof?.parts) || calls.length !== proof.parts.length || creationDigest(fuseSplitObservation(input, proof)) !== creationDigest(output)) invalid("fusion differs from accounted calls");
  for (const [index, part] of proof.parts.entries()) {
    const call = calls[index], settlement = call.settlement;
    const usage = part.token_usage ? { ...part.token_usage, total: part.token_usage.total ?? part.token_usage.input + part.token_usage.output } : null;
    if (call.attempt !== index + 1 || call.revision !== ticket.revision || call.input_digest !== ticket.input_digest || creationDigest(call.profile) !== creationDigest(ticket.profile) || creationDigest(call.target) !== creationDigest(part.target) || settlement?.status !== "response" || settlement.output_digest !== part.output_hash || creationDigest(settlement.usage) !== creationDigest(usage)) invalid("child call settlement rebound");
  }
}
