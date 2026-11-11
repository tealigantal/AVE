import assert from "node:assert/strict";
import { registerTrustedDispatch, takeTrustedDispatch } from "../../packages/platform/model-gateway/src/trusted-dispatch.js";

assert.equal(takeTrustedDispatch(), null, "normal startup has no continuation authority");
assert.throws(() => registerTrustedDispatch({ digest: "invalid", resumeDispatch: async () => new Response() }), /REGISTRATION_INVALID/);
const actual = new Response("sent"), dispatch = async (_transport: unknown, send: () => Promise<Response>) => send();
registerTrustedDispatch({ digest: "a".repeat(64), resumeDispatch: dispatch });
assert.throws(() => registerTrustedDispatch({ digest: "b".repeat(64), resumeDispatch: dispatch }), /REGISTRATION_INVALID/);
const authority = takeTrustedDispatch();
assert.ok(authority && Object.isFrozen(authority));
assert.equal(await authority.resumeDispatch({ wire_digest: "c".repeat(64), input_bytes: 1 }, async () => actual), actual);
assert.equal(takeTrustedDispatch(), null, "capability cannot be injected twice");
console.log("Host trusted bootstrap: no default capability, one-time immutable registration and consumption passed");
