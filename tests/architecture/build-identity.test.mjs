import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { assertRuntimeBuildProvenance, collectBuildInputs, collectRuntimeIdentity, copyInputs, digest, dockerIgnore } from "../../scripts/docker/build-identity.mjs";
import { buildReliableImages } from "../../scripts/docker/build-reliable.mjs";

const root = await mkdtemp(resolve(tmpdir(), "ave-build-identity-"));
const put = async (path, contents) => { await mkdir(resolve(root, path, ".."), { recursive: true }); await writeFile(resolve(root, path), contents); };
try {
  await put(".dockerignore", "**\n!apps/**\n!resources/**\n!package.json\n!pnpm-lock.yaml\n!pnpm-workspace.yaml\n!tsconfig.base.json\n!scripts/docker/**\n**/node_modules\n**/__pycache__\n**/*.log\n");
  await put("docker/Dockerfile", "FROM node@sha256:" + "1".repeat(64) + " AS build\nCOPY apps ./apps\nCOPY resources ./resources\nCOPY package.json pnpm-lock.yaml ./\nCOPY --from=build /dist /app\n");
  await put("docker/Whisper.Dockerfile", "FROM whisper@sha256:" + "2".repeat(64) + "\nCOPY scripts/docker/build-desktop.mjs /run.mjs\n");
  for (const path of ["compose.yaml", "docker/compose.gpu.yaml", "package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "tsconfig.base.json", "scripts/docker/build-desktop.mjs", "scripts/docker/build-identity.mjs", "scripts/docker/build-reliable.mjs"]) await put(path, path);
  await put("apps/host.js", "host-v1"); await put("resources/audio/library.json", "library-v1");
  await put("apps/node_modules/private.js", "ignored"); await put("apps/__pycache__/worker.pyc", "ignored"); await put("apps/debug.log", "ignored");
  const before = await collectBuildInputs(root);
  assert(before.files.some((file) => file.path === "resources/audio/library.json"));
  assert(!before.files.some((file) => /node_modules|__pycache__|debug.log/.test(file.path)));
  await rm(resolve(root, "apps/__pycache__"), { recursive: true });
  await rm(resolve(root, "apps/debug.log"));
  assert.equal((await collectBuildInputs(root)).digest, before.digest, "excluded local cache/log inventory must not invalidate actual COPY bytes");
  await put("resources/audio/library.json", "library-v2");
  const after = await collectBuildInputs(root);
  assert.notEqual(before.digest, after.digest, "resource changes must invalidate full build input identity");
  await put("docs/arbitrary.md", "unrelated navigation");
  assert.equal((await collectBuildInputs(root)).digest, after.digest, "documentation not copied into an image must not impersonate build changes");
  await put("apps/private.env", "not-a-real-key");
  await assert.rejects(collectBuildInputs(root), /BUILD_INPUT_PRIVATE/);
  await rm(resolve(root, "apps/private.env"));
  await put("docker/Dockerfile", "FROM example\nCOPY missing-input /app\n");
  await assert.rejects(collectBuildInputs(root), /ENOENT/);
  assert.deepEqual(copyInputs('COPY ["apps", "resources", "/app"]\nCOPY --from=build /out /app'), ["apps", "resources"]);
  assert.throws(() => copyInputs("COPY ${UNKNOWN} /app"), /BUILD_COPY_UNSUPPORTED/);
  assert.throws(() => dockerIgnore("[a-z]"), /BUILD_IGNORE_UNSUPPORTED/);
  assert.equal(dockerIgnore("**\n!apps/**\n**/*.log")("apps/deep/a.log"), false);
  assert.equal(dockerIgnore("**\n!apps/**\n**/node_modules")("apps/node_modules/a.js"), false);

  function runner({ image = "sha256:" + "3".repeat(64), duplicate = false, config = "4".repeat(64) } = {}) {
    return async (_command, args) => {
      if (args[0] === "compose") return { stdout: duplicate ? "abc123abc123\ndef456def456" : "abc123abc123" };
      if (args[0] === "inspect") return { stdout: JSON.stringify({ State: { Running: true }, Image: image, Config: { Labels: { "com.docker.compose.config-hash": config } } }) };
      if (args[0] === "image") return { stdout: "{}" };
      if (args[2] === "node") return { stdout: "v22.16.0\n" };
      if (args[2] === "ffmpeg") return { stdout: "ffmpeg version test\n" };
      const service = args.at(-1);
      return { stdout: JSON.stringify({ service, python: "3.12", files: [{ path: "/app/run", bytes: 4, sha256: digest("run!") }], python_packages: [{ name: "example", version: "1" }], model_blobs: service === "whisper" ? [{ path: "/models/blob", bytes: 5, sha256: digest("model") }] : [] }) };
    };
  }
  const runtime = await collectRuntimeIdentity(root, runner());
  assert.equal(runtime.services.length, 2);
  assert.notEqual(runtime.digest, (await collectRuntimeIdentity(root, runner({ image: "sha256:" + "5".repeat(64) }))).digest, "image change must invalidate runtime identity");
  await assert.rejects(collectRuntimeIdentity(root, runner({ duplicate: true })), /RUNTIME_SERVICE_NOT_UNIQUE/);
  await assert.rejects(collectRuntimeIdentity(root, runner({ config: "" })), /RUNTIME_CONFIG_IDENTITY_MISSING/);
  assert.throws(() => assertRuntimeBuildProvenance({ build_input_digest: "0".repeat(64), runtime }), /IMAGE_INPUT_DRIFT/);
  const sourceInputs = [{ path: "apps/host.js", bytes: 4, sha256: digest("host") }];
  const outputs = [{ path: "apps/host.js", bytes: 5, sha256: digest("build") }];
  const identity = { inputs: { files: sourceInputs }, runtime: { services: [{ service: "desktop", manifest: { files: outputs.map((item) => ({ ...item, path: `/opt/ave/app/${item.path}` })), build_provenance: { schema_version: 1, source_roots: ["apps", "packages", "contracts", "database", "resources/audio", "tools/contract-codegen", "package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "tsconfig.base.json", "scripts/docker/build-desktop.mjs"], source_inputs: sourceInputs, source_digest: digest(sourceInputs), outputs, output_digest: digest(outputs) } } }] } };
  identity.build_input_digest = "0".repeat(64);
  identity.inputs.files = [...sourceInputs];
  identity.runtime.services.push({ service: "whisper", manifest: { files: [] } });
  for (const service of identity.runtime.services) service.build_input_digest = identity.build_input_digest;
  for (const [source, target, index] of [["docker/start-desktop.sh", "/usr/local/bin/ave-desktop", 0], ["docker/health-desktop.sh", "/usr/local/bin/ave-health", 0], ["docker/configure.py", "/opt/ave/configure.py", 0], ["docker/model-services.template.json", "/opt/ave/model-services.template.json", 0], ["scripts/stage3/yamnet_service.py", "/opt/ave/yamnet_service.py", 0], ["docker/start-whisper.py", "/opt/ave/start-whisper.py", 1]]) {
    const item = { path: source, bytes: 4, sha256: digest("test") };
    identity.inputs.files.push(item); identity.runtime.services[index].manifest.files.push({ ...item, path: target });
  }
  assertRuntimeBuildProvenance(identity);
  const changedSource = structuredClone(identity);
  changedSource.inputs.files[0].sha256 = digest("changed");
  assert.throws(() => assertRuntimeBuildProvenance(changedSource), /SOURCE_DRIFT/);
  const changedOutput = structuredClone(identity);
  changedOutput.runtime.services[0].manifest.files[0].sha256 = digest("tampered");
  assert.throws(() => assertRuntimeBuildProvenance(changedOutput), /OUTPUT_DRIFT/);
  await put("docker/Dockerfile", "FROM example\nCOPY apps /app\n");
  const commands = [];
  let label;
  const built = await buildReliableImages(root, async (_command, args) => {
    commands.push(args);
    if (args[0] === "build") { label = args[args.indexOf("--label") + 1].split("=")[1]; return { stdout: "" }; }
    return { stdout: JSON.stringify({ Id: "sha256:" + "6".repeat(64), Config: { Labels: { "io.ave.build-input-digest": label } } }) };
  });
  assert.equal(built.services.length, 2);
  assert.equal(commands.filter((args) => args[0] === "build").length, 2);
  assert(!commands.some((args) => ["compose", "rm", "restart"].includes(args[0])), "building must not recreate services or destroy user data");
  await assert.rejects(buildReliableImages(root, async (_command, args) => {
    if (args[0] === "build") { label = args[args.indexOf("--label") + 1].split("=")[1]; await put("apps/host.js", "changed while building"); return { stdout: "" }; }
    return { stdout: JSON.stringify({ Id: "sha256:" + "6".repeat(64), Config: { Labels: { "io.ave.build-input-digest": label } } }) };
  }), /BUILD_INPUT_CHANGED_DURING_BUILD/);
  console.log("complete build inputs, resource invalidation, private/missing input refusal and two-service runtime identity passed");
} finally { await rm(root, { recursive: true, force: true }); }
