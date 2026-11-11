import type { PreparedModelTransport } from "./public.js";

// Host bootstrap and its verified preloads are the trusted execution base.
// Renderer/model data cannot import or install this process-local capability.
export type TrustedDispatch = Readonly<{
  digest: string;
  resumeDispatch: (transport: PreparedModelTransport, send: () => Promise<Response>) => Promise<Response>;
}>;

let installed: TrustedDispatch | null = null;
let registered = false;

export function registerTrustedDispatch(authority: TrustedDispatch): void {
  if (registered || !authority || Object.keys(authority).sort().join(",") !== "digest,resumeDispatch" || !/^[a-f0-9]{64}$/.test(authority.digest) || typeof authority.resumeDispatch !== "function") throw new Error("TRUSTED_DISPATCH_REGISTRATION_INVALID");
  installed = Object.freeze({ digest: authority.digest, resumeDispatch: authority.resumeDispatch });
  registered = true;
}

export function takeTrustedDispatch(): TrustedDispatch | null {
  const value = installed;
  installed = null;
  return value;
}
