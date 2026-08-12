import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import type { ContentFingerprint } from "../../../core/media-identity/src/public.js";

export async function fingerprintFile(path: string): Promise<ContentFingerprint> {
  const info = await stat(path);
  if (!info.isFile()) throw new Error("fingerprint input must be a file");
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path, { highWaterMark: 1024 * 1024 })) hash.update(chunk);
  return {
    algorithm: "sha256",
    digest: hash.digest("hex"),
    byte_length: BigInt(info.size),
  };
}
