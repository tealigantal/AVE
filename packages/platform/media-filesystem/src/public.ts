import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { ContentFingerprint } from "../../../core/media-identity/src/public.js";

export async function fingerprintFile(path: string): Promise<ContentFingerprint> {
  const bytes = await readFile(path);
  return {
    algorithm: "sha256",
    digest: createHash("sha256").update(bytes).digest("hex"),
    byte_length: BigInt(bytes.byteLength),
  };
}
