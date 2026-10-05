import { net, protocol } from "electron";
import { resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { Readable } from "node:stream";
import type { HostContext } from "./types.js";

protocol.registerSchemesAsPrivileged([{ scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }]);

export function registerAppProtocol(rendererRoot: string, context?: HostContext): void {
  protocol.handle("app", async (request) => {
    const url = new URL(request.url);
    if (url.hostname !== "renderer") return new Response("not found", { status: 404 });
    if (url.pathname.startsWith("/browse/")) {
      // The default Electron protocol does not supply a trusted sender ID.
      // Only the existing single-window app may use it; multiple windows fail closed.
      const owner = context?.sessions.soleWindowId();
      if (!context || owner === undefined || (request as Request & { initiatorOrigin?: string }).initiatorOrigin !== "app://renderer") return new Response("forbidden", { status: 403 });
      try {
        const operation = context.sessions.capture(owner, context.sessions.activeProjectId(), true);
        const result = await context.host.mediaBrowseResponse(owner, url.pathname.slice("/browse/".length), request.method, request.headers.get("range") ?? undefined, { signal: request.signal, assertCurrent: () => context.sessions.assertCurrent(operation) });
        return new Response(result.body ? Readable.toWeb(result.body) as ReadableStream<Uint8Array> : null, { status: result.status, headers: result.headers });
      } catch (error) { console.error("AVE browsing request failed", error); return new Response("media unavailable", { status: 410 }); }
    }
    const requested = resolve(rendererRoot, `.${decodeURIComponent(url.pathname)}`);
    if (!(requested === rendererRoot || requested.startsWith(`${rendererRoot}${sep}`))) return new Response("forbidden", { status: 403 });
    return net.fetch(pathToFileURL(requested).toString());
  });
}
