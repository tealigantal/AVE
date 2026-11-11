import { execFile as callbackExecFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { collectBuildInputs } from "./build-identity.mjs";

const execFile = promisify(callbackExecFile);
export async function buildReliableImages(root = process.cwd(), runner = execFile, platform = null) {
  if (platform !== null && !["linux/amd64", "linux/arm64"].includes(platform)) throw new Error(`BUILD_PLATFORM_UNSUPPORTED: ${platform}`);
  const before = await collectBuildInputs(root);
  const outputs = [];
  for (const service of ["desktop", "whisper"]) {
    const dockerfile = service === "desktop" ? "docker/Dockerfile" : "docker/Whisper.Dockerfile";
    const tag = platform ? `ave-${service}:linux-${platform.split("/")[1]}` : `ave-${service}:local`;
    await runner("docker", ["build", ...(platform ? ["--platform", platform] : []), "--file", dockerfile, "--label", `io.ave.build-input-digest=${before.digest}`, "--tag", tag, "."], { cwd: root, timeout: 1800000, maxBuffer: 32 * 1024 * 1024, windowsHide: true });
    const inspected = JSON.parse((await runner("docker", ["image", "inspect", "--format", "{{json .}}", tag], { cwd: root, windowsHide: true })).stdout);
    if (!/^sha256:[a-f0-9]{64}$/.test(inspected.Id ?? "") || inspected.Config?.Labels?.["io.ave.build-input-digest"] !== before.digest) throw new Error(`BUILT_IMAGE_IDENTITY_INVALID: ${service}`);
    if (platform && `${inspected.Os}/${inspected.Architecture}` !== platform) throw new Error(`BUILT_IMAGE_PLATFORM_MISMATCH: ${service}`);
    outputs.push({ service, image_id: inspected.Id, build_input_digest: before.digest, ...(platform ? { platform, tag } : {}) });
  }
  if ((await collectBuildInputs(root)).digest !== before.digest) throw new Error("BUILD_INPUT_CHANGED_DURING_BUILD: rebuild both services before acceptance");
  return { build_input_digest: before.digest, services: outputs, note: "images built; services have not been recreated and no user acceptance is claimed" };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== "--platform")) throw new Error("usage: node scripts/docker/build-reliable.mjs [--platform linux/amd64|linux/arm64]");
  console.log(JSON.stringify(await buildReliableImages(process.cwd(), execFile, args[1] ?? null), null, 2));
}
