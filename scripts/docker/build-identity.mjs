import { createHash } from "node:crypto";
import { execFile as callbackExecFile } from "node:child_process";
import { lstat, readFile, readdir } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { fingerprint } from "../docs/fingerprint.mjs";

const execFile = promisify(callbackExecFile);
export const digest = (value) => createHash("sha256").update(typeof value === "string" || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest("hex");
const portable = (path) => path.split(sep).join("/");
export function contained(root, path) {
  if (typeof path !== "string" || !path || isAbsolute(path) || path.includes("\\") || path.split("/").includes("..")) throw new Error(`BUILD_IDENTITY_PATH_INVALID: ${path}`);
  const target = resolve(root, path);
  const sub = relative(resolve(root), target);
  if (!sub || sub.startsWith(`..${sep}`) || sub === ".." || isAbsolute(sub)) throw new Error(`BUILD_IDENTITY_PATH_INVALID: ${path}`);
  return target;
}

// Docker's current context is an allowlist. Unsupported syntax fails rather than silently omitting inputs.
function expression(pattern) {
  if (/[\[\]{}?]/.test(pattern)) throw new Error(`BUILD_IGNORE_UNSUPPORTED: ${pattern}`);
  const escaped = pattern.replace(/[.+^$()|\\]/g, "\\$&").replaceAll("**/", "§DIR§").replaceAll("**", "§ALL§").replaceAll("*", "[^/]*").replaceAll("§DIR§", "(?:.*/)?").replaceAll("§ALL§", ".*");
  return new RegExp(`^(?:${escaped})(?:/.*)?$`);
}
export function dockerIgnore(text) {
  const rules = text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#")).map((line) => {
    const include = line.startsWith("!");
    const pattern = (include ? line.slice(1) : line).replace(/^\/+|\/+$/g, "");
    if (!pattern || pattern.includes("..")) throw new Error(`BUILD_IGNORE_UNSUPPORTED: ${line}`);
    return { include, match: expression(pattern) };
  });
  return (file) => { let included = true; for (const rule of rules) if (rule.match.test(file)) included = rule.include; return included; };
}

export function copyInputs(text) {
  const logical = text.replace(/\\\r?\n/g, " ");
  const sources = [];
  for (const line of logical.split(/\r?\n/)) {
    const match = line.match(/^\s*COPY\s+(.+)$/i);
    if (!match) continue;
    let args = match[1].trim();
    if (/^--from[= ]/.test(args)) continue; // Generated stage outputs are captured in the runtime manifest.
    args = args.replace(/^(?:--(?:chown|chmod)=[^ ]+\s+)+/, "");
    const values = args.startsWith("[") ? JSON.parse(args) : args.split(/\s+/);
    if (!Array.isArray(values) || values.length < 2) throw new Error(`BUILD_COPY_UNSUPPORTED: ${line}`);
    for (const source of values.slice(0, -1)) {
      if (typeof source !== "string" || /[$*?\[\]\\]/.test(source) || source === ".") throw new Error(`BUILD_COPY_UNSUPPORTED: ${source}`);
      sources.push(source.replace(/^\.\//, "").replace(/\/$/, ""));
    }
  }
  if (!sources.length) throw new Error("BUILD_COPY_INPUTS_EMPTY");
  return [...new Set(sources)].sort();
}

export async function collectBuildInputs(root = process.cwd()) {
  const dockerfiles = ["docker/Dockerfile", "docker/Whisper.Dockerfile"];
  const additional = [".dockerignore", "compose.yaml", "docker/compose.gpu.yaml"];
  const ignoreText = await readFile(contained(root, ".dockerignore"), "utf8");
  const included = dockerIgnore(ignoreText);
  const files = new Map();
  const excluded = [];
  async function walk(path, force = false) {
    const target = contained(root, path);
    const details = await lstat(target);
    if (details.isSymbolicLink()) throw new Error(`BUILD_INPUT_SYMLINK: ${path}`);
    if (details.isDirectory()) {
      // Excluded dependency/cache directories cannot be re-included by this repository's policy.
      if (["node_modules", "__pycache__", ".git"].includes(path.split("/").at(-1))) { excluded.push(path); return; }
      for (const entry of (await readdir(target)).sort()) await walk(`${path}/${entry}`, force);
    } else if (details.isFile()) {
      if (!force && !included(path)) { excluded.push(path); return; }
      if (/(?:^|\/)(?:\.env(?:\..*)?|.*\.(?:pem|key|env))$/.test(path)) throw new Error(`BUILD_INPUT_PRIVATE: ${path}`);
      const bytes = await readFile(target);
      const file = { path, bytes: details.size, sha256: digest(bytes) };
      if (path.endsWith(".sh")) { const normalized = Buffer.from(bytes.toString("utf8").replace(/\r(?=\n|$)/g, "")); file.runtime_bytes = normalized.length; file.runtime_sha256 = digest(normalized); }
      files.set(path, file);
    } else throw new Error(`BUILD_INPUT_NOT_REGULAR: ${path}`);
  }
  const stages = [];
  for (const dockerfile of dockerfiles) {
    const text = await readFile(contained(root, dockerfile), "utf8");
    const inputs = copyInputs(text);
    for (const source of inputs) {
      const before = files.size;
      await walk(source);
      if (files.size === before && ![...files.keys()].some((file) => file === source || file.startsWith(`${source}/`))) throw new Error(`BUILD_COPY_EXCLUDED: ${source}`);
    }
    stages.push({ dockerfile, bases: text.split(/\r?\n/).filter((line) => /^FROM\s/i.test(line)).map((line) => line.trim()), copy_sources: inputs });
    await walk(dockerfile, true);
  }
  for (const path of additional) await walk(path, true);
  // Build helpers may read files beyond COPY directives; these are explicit, mandatory inputs.
  for (const path of ["package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "tsconfig.base.json", "scripts/docker/build-desktop.mjs", "scripts/docker/build-identity.mjs", "scripts/docker/build-reliable.mjs"]) await walk(path, true);
  const manifest = { format: "ave-build-inputs-v1", stages, files: [...files.values()].sort((a, b) => a.path.localeCompare(b.path, "en")), excluded: [...new Set(excluded)].sort() };
  // Local caches are diagnostic only: excluded files never become build inputs.
  return { ...manifest, digest: digest({ format: manifest.format, stages: manifest.stages, files: manifest.files }) };
}

const runtimeScript = String.raw`import os,sys,json,hashlib,importlib.metadata as metadata
service=sys.argv[1]
roots=['/opt/ave/app','/opt/ave/node_modules','/opt/ave/sound'] if service=='desktop' else ['/opt/ave/start-whisper.py']
roots+=['/usr/local/bin/ave-desktop','/usr/local/bin/ave-health','/opt/ave/configure.py','/opt/ave/yamnet_service.py','/opt/ave/model-services.template.json','/config/ave/sound/yamnet.tflite','/config/ave/sound/yamnet_class_map.csv'] if service=='desktop' else []
files=[]
def add(path):
  if os.path.islink(path):
    files.append({'path':path,'symlink':os.readlink(path)});return
  h=hashlib.sha256()
  with open(path,'rb') as f:
    for chunk in iter(lambda:f.read(1048576),b''):h.update(chunk)
  files.append({'path':path,'bytes':os.stat(path).st_size,'sha256':h.hexdigest()})
for root in roots:
  if not os.path.exists(root):raise RuntimeError('RUNTIME_REQUIRED_PATH_MISSING:'+root)
  if os.path.isfile(root):add(root);continue
  for parent,dirs,names in os.walk(root):
    dirs[:]=sorted(d for d in dirs if d!='__pycache__')
    for name in list(dirs):
      path=os.path.join(parent,name)
      if os.path.islink(path):add(path);dirs.remove(name)
    for name in sorted(names):
      if not name.endswith('.pyc'):add(os.path.join(parent,name))
packages=sorted([{'name':d.metadata['Name'],'version':d.version} for d in metadata.distributions()],key=lambda d:d['name'].lower())
models=[]
deployment={}
if service=='desktop':
  from urllib.parse import urlsplit,urlunsplit
  with open('/run/ave/model-services.json',encoding='utf-8') as f:configuration=json.load(f)
  for role in ['vision','planner','transcription','sound']:
    value=configuration[role]
    parts=urlsplit(value['base_url'])
    endpoint=urlunsplit((parts.scheme,parts.hostname+(':'+str(parts.port) if parts.port else ''),parts.path,'',''))
    deployment[role]={key:value[key] for key in ['provider','model','response_mode','structured_output','enable_thinking','max_tokens','thinking_budget','audio_input','text_output_only'] if key in value}
    deployment[role]['endpoint_digest']=hashlib.sha256(endpoint.encode()).hexdigest()
elif service=='whisper':
  cache='/home/ubuntu/.cache/huggingface/hub'
  for parent,dirs,names in os.walk(cache):
    dirs[:]=sorted(d for d in dirs if d not in ['.locks'])
    if '/blobs' in parent or '/refs' in parent or '/snapshots' in parent:
      for name in sorted(names):
        path=os.path.join(parent,name)
        if os.path.isfile(path) or os.path.islink(path):
          before=len(files);add(path);models.append(files[-1]);del files[before:]
  if not models:raise RuntimeError('RUNTIME_MODEL_CACHE_EMPTY')
  with open('/proc/1/environ','rb') as f:environment=f.read().split(b'\0')
  deployment={entry.split(b'=',1)[0].decode():entry.split(b'=',1)[1].decode() for entry in environment if entry.startswith((b'AVE_WHISPER_DEVICE=',b'WHISPER__INFERENCE_DEVICE=',b'WHISPER__COMPUTE_TYPE='))}
provenance=None
if service=='desktop' and os.path.isfile('/opt/ave/app/build-provenance.json'):
  with open('/opt/ave/app/build-provenance.json',encoding='utf-8') as f:provenance=json.load(f)
print(json.dumps({'service':service,'python':sys.version.split()[0],'files':sorted(files,key=lambda f:f['path']),'python_packages':packages,'model_blobs':models,'deployment':deployment,'build_provenance':provenance},separators=(',',':')))
`;

export async function collectRuntimeIdentity(root = process.cwd(), runner = execFile) {
  const options = { cwd: root, maxBuffer: 64 * 1024 * 1024, timeout: 180000, windowsHide: true };
  const services = [];
  for (const service of ["desktop", "whisper"]) {
    const container = (await runner("docker", ["compose", "ps", "--quiet", service], options)).stdout.trim();
    if (!/^[a-f0-9]{12,64}$/.test(container)) throw new Error(`RUNTIME_SERVICE_NOT_UNIQUE: ${service}`);
    const inspected = JSON.parse((await runner("docker", ["inspect", "--format", "{{json .}}", container], options)).stdout);
    if (inspected?.State?.Running !== true || !/^sha256:[a-f0-9]{64}$/.test(inspected.Image)) throw new Error(`RUNTIME_SERVICE_NOT_RUNNING: ${service}`);
    const configHash = inspected.Config?.Labels?.["com.docker.compose.config-hash"];
    if (!/^[a-f0-9]{64}$/.test(configHash ?? "")) throw new Error(`RUNTIME_CONFIG_IDENTITY_MISSING: ${service}`);
    const imageLabels = JSON.parse((await runner("docker", ["image", "inspect", "--format", "{{json .Config.Labels}}", inspected.Image], options)).stdout);
    const buildInputDigest = imageLabels?.["io.ave.build-input-digest"] ?? null;
    if (buildInputDigest !== null && !/^[a-f0-9]{64}$/.test(buildInputDigest)) throw new Error(`RUNTIME_BUILD_LABEL_INVALID: ${service}`);
    const python = service === "desktop" ? "/opt/ave-python/bin/python" : "python";
    const manifest = JSON.parse((await runner("docker", ["exec", container, python, "-c", runtimeScript, service], options)).stdout);
    if (manifest.service !== service || !Array.isArray(manifest.files) || !manifest.files.length || !Array.isArray(manifest.python_packages) || !Array.isArray(manifest.model_blobs) || (service === "whisper" && !manifest.model_blobs.length)) throw new Error(`RUNTIME_MANIFEST_INVALID: ${service}`);
    for (const file of [...manifest.files, ...manifest.model_blobs]) if (typeof file.path !== "string" || !file.path.startsWith("/") || (file.symlink === undefined && (!/^[a-f0-9]{64}$/.test(file.sha256 ?? "") || !Number.isSafeInteger(file.bytes) || file.bytes < 0))) throw new Error(`RUNTIME_FILE_IDENTITY_INVALID: ${service}`);
    const tools = service === "desktop" ? { node: (await runner("docker", ["exec", container, "node", "--version"], options)).stdout.trim(), ffmpeg: (await runner("docker", ["exec", container, "ffmpeg", "-version"], options)).stdout.split(/\r?\n/)[0] } : {};
    services.push({ service, image_id: inspected.Image, build_input_digest: buildInputDigest, configuration_digest: configHash, runtime_digest: digest({ manifest, tools, build_input_digest: buildInputDigest }), manifest, tools });
  }
  return { services, digest: digest(services.map(({ service, image_id, configuration_digest, runtime_digest }) => ({ service, image_id, configuration_digest, runtime_digest }))) };
}

export async function currentBuildIdentity(root = process.cwd(), { runtime = true } = {}) {
  const options = { cwd: root, windowsHide: true, maxBuffer: 16 * 1024 * 1024 };
  const head = (await execFile("git", ["rev-parse", "HEAD"], options)).stdout.trim();
  const inputs = await collectBuildInputs(root);
  const code = await fingerprint(root);
  const dirty = (await execFile("git", ["diff", "HEAD", "--binary", "--", ".dockerignore", "compose.yaml", "docker", "apps", "packages", "contracts", "database", "resources", "tools/contract-codegen", "scripts/docker", "scripts/stage3/yamnet_service.py", "package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "tsconfig.base.json"], options)).stdout;
  const identity = { repository_commit: head, code_fingerprint: code, dirty_build_diff_digest: digest(dirty), build_input_digest: inputs.digest, inputs };
  if (runtime) identity.runtime = await collectRuntimeIdentity(root);
  return identity;
}

export function assertRuntimeBuildProvenance(identity) {
  for (const service of ["desktop", "whisper"]) {
    if (identity.runtime?.services?.find((item) => item.service === service)?.build_input_digest !== identity.build_input_digest) throw new Error(`BUILD_PROVENANCE_IMAGE_INPUT_DRIFT: ${service}`);
  }
  const runtime = identity.runtime?.services?.find((item) => item.service === "desktop");
  const provenance = runtime?.manifest?.build_provenance;
  if (provenance?.schema_version !== 1 || !Array.isArray(provenance.source_roots) || !Array.isArray(provenance.source_inputs) || !provenance.source_inputs.length || !Array.isArray(provenance.outputs) || !provenance.outputs.length) throw new Error("BUILD_PROVENANCE_MISSING: rebuild desktop before product acceptance");
  const roots = ["apps", "packages", "contracts", "database", "resources/audio", "tools/contract-codegen", "package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "tsconfig.base.json", "scripts/docker/build-desktop.mjs"];
  if (JSON.stringify(provenance.source_roots) !== JSON.stringify(roots)) throw new Error("BUILD_PROVENANCE_ROOTS_INVALID");
  const expected = identity.inputs?.files?.filter((item) => roots.some((root) => item.path === root || item.path.startsWith(`${root}/`))).sort((a, b) => a.path.localeCompare(b.path, "en"));
  if (!expected?.length || JSON.stringify(expected) !== JSON.stringify(provenance.source_inputs) || digest(provenance.source_inputs) !== provenance.source_digest) throw new Error("BUILD_PROVENANCE_SOURCE_DRIFT");
  if (digest(provenance.outputs) !== provenance.output_digest || new Set(provenance.outputs.map((item) => item.path)).size !== provenance.outputs.length) throw new Error("BUILD_PROVENANCE_OUTPUT_INVALID");
  for (const output of provenance.outputs) {
    contained("/", output.path);
    const actual = runtime.manifest.files.find((item) => item.path === `/opt/ave/app/${output.path}`);
    if (!actual || actual.sha256 !== output.sha256 || actual.bytes !== output.bytes) throw new Error(`BUILD_PROVENANCE_OUTPUT_DRIFT: ${output.path}`);
  }
  const mappings = {
    desktop: { "docker/start-desktop.sh": "/usr/local/bin/ave-desktop", "docker/health-desktop.sh": "/usr/local/bin/ave-health", "docker/configure.py": "/opt/ave/configure.py", "docker/model-services.template.json": "/opt/ave/model-services.template.json", "scripts/stage3/yamnet_service.py": "/opt/ave/yamnet_service.py" },
    whisper: { "docker/start-whisper.py": "/opt/ave/start-whisper.py" },
  };
  for (const [service, files] of Object.entries(mappings)) {
    const manifest = identity.runtime.services.find((item) => item.service === service)?.manifest;
    for (const [source, target] of Object.entries(files)) {
      const input = identity.inputs.files.find((item) => item.path === source);
      const actual = manifest?.files?.find((item) => item.path === target);
      if (!input || !actual || (input.runtime_sha256 ?? input.sha256) !== actual.sha256 || (input.runtime_bytes ?? input.bytes) !== actual.bytes) throw new Error(`BUILD_PROVENANCE_RUNTIME_SOURCE_DRIFT: ${source}`);
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(await currentBuildIdentity(process.cwd(), { runtime: !process.argv.includes("--inputs-only") }), null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
