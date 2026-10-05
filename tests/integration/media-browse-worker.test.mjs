import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { Readable } from "node:stream";

// Exercise the actual Electron protocol adapter with controlled platform ports.
// This checks ownership and wire semantics; it does not claim native playback.
const source = await readFile(new URL("../../apps/desktop/src/main/protocol-handler.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText.replace('import { net, protocol } from "electron";', 'const { net, protocol } = globalThis.__aveBrowseProtocolTest;');
let handler, received;
globalThis.__aveBrowseProtocolTest = { net: { fetch: async () => new Response("static") }, protocol: { registerSchemesAsPrivileged: definitions => { assert.equal(definitions[0].privileges.stream, true); }, handle: (_scheme, callback) => { handler = callback; } } };
const { registerAppProtocol } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
let soleOwner = 7;
const sessions = { soleWindowId: () => soleOwner, activeProjectId: () => "project", capture: (owner, project) => ({ owner, project }), assertCurrent: operation => { assert.equal(operation.owner, 7); assert.equal(operation.project, "project"); } };
const host = { mediaBrowseResponse: async (...args) => { received = args; args[4].assertCurrent(); return { status: args[3] ? 206 : 200, headers: { "Content-Type": "video/mp4", "Content-Length": "3" }, body: args[2] === "HEAD" ? null : Readable.from([Buffer.from([1, 2, 3])]) }; } };
registerAppProtocol("C:/renderer", { sessions, host });
const request = (method = "GET", origin = "app://renderer") => Object.assign(new Request("app://renderer/browse/opaque", { method, headers: { range: "bytes=0-2" } }), { initiatorOrigin: origin });
assert.equal((await handler(request("GET", "https://evil.invalid"))).status, 403);
assert.equal((await handler(request("GET", undefined))).status, 206); // default argument is the trusted fixture origin
const browserStarted = new Request("app://renderer/browse/opaque"); assert.equal((await handler(browserStarted)).status, 403);
const result = await handler(request()); assert.equal(result.status, 206); assert.deepEqual([...new Uint8Array(await result.arrayBuffer())], [1, 2, 3]);
assert.deepEqual(received.slice(0, 4), [7, "opaque", "GET", "bytes=0-2"]);
assert.equal((await handler(request("HEAD"))).body, null);
soleOwner = undefined; assert.equal((await handler(request())).status, 403, "Multiple or absent Electron owners fail closed");
soleOwner = 7; host.mediaBrowseResponse = async () => { throw new Error("MEDIA_BROWSE_REFERENCE_EXPIRED"); };
assert.equal((await handler(request())).status, 410);
delete globalThis.__aveBrowseProtocolTest;
console.log("Actual Electron adapter: trusted origin, single-owner isolation, HEAD/Range streaming and expired-reference denial passed (controlled ports, no native playback claim)");
