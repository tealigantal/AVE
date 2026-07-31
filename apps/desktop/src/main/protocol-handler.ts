import { net, protocol } from "electron";
import { resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

protocol.registerSchemesAsPrivileged([{ scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }]);

export function registerAppProtocol(rendererRoot: string): void {
  protocol.handle("app", (request) => {
    const url = new URL(request.url);
    if (url.hostname !== "renderer") return new Response("not found", { status: 404 });
    const requested = resolve(rendererRoot, `.${decodeURIComponent(url.pathname)}`);
    if (!(requested === rendererRoot || requested.startsWith(`${rendererRoot}${sep}`))) return new Response("forbidden", { status: 403 });
    return net.fetch(pathToFileURL(requested).toString());
  });
}
