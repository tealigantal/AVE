import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { fingerprint } from "../../../../scripts/docs/fingerprint.mjs";
const scripts = JSON.parse(await readFile("package.json", "utf8")).scripts;
const code_fingerprint = await fingerprint(), base = "docs/evidence/assets/reliable-preview/";
const mode = process.argv[2] ?? "focused";
const attempt = process.argv[3] ?? "01";
if (!/^[0-9]{2}$/.test(attempt)) throw new Error("Invalid attempt identity");
const commands = mode === "full" ? scripts.check.split(" && ").slice(2).map(command => command.replace(/^pnpm run /, "")) : ["contracts:check", "typecheck", "architecture", "media-browse:host:test", "media-browse:worker:test", "media-browse:protocol:test", "web:host:test", "stage3:sampling:test", "stage3:soundtrack:test", "renderer:workbench:test", "stage2-workspace-renderer:test", "interaction-acceptance:test", "worker:python:lint", "worker:python:typecheck"];
const ledger = { schema_version: 1, code_fingerprint, environment: "Windows isolated Python/Pillow 12.3.0; controlled engineering fixtures, no human acceptance", started_at: new Date().toISOString(), commands: [] };
for (const command of commands) {
  if (!/^[a-zA-Z0-9:-]+$/.test(command)) throw new Error("Unsupported validation command");
  const path = `${base}${mode}-${command.replaceAll(":", "-")}-attempt${attempt}.log`;
  let output = "";
  const exit_code = await new Promise((accept, reject) => {
    const child = spawn(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", `pnpm run ${command}`], { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    child.stdout.on("data", bytes => output += bytes); child.stderr.on("data", bytes => output += bytes);
    child.once("error", reject); child.once("exit", accept);
  });
  await writeFile(path, output);
  ledger.commands.push({ command, exit_code, log: { path, sha256: createHash("sha256").update(output).digest("hex") } });
  await writeFile(`${base}${mode}-ledger-attempt${attempt}.json`, JSON.stringify(ledger, null, 2) + "\n");
  console.log(`${command}: exit ${exit_code}`);
}
ledger.finished_at = new Date().toISOString(); ledger.final_fingerprint = await fingerprint();
await writeFile(`${base}${mode}-ledger-attempt${attempt}.json`, JSON.stringify(ledger, null, 2) + "\n");
if (ledger.final_fingerprint !== code_fingerprint) throw new Error("Validation source drift");
if (ledger.commands.some(command => command.exit_code !== 0)) process.exitCode = 1;
