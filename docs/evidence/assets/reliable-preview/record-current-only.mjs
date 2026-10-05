import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { loadProgramModel } from "../../../../scripts/docs/program-model.mjs";
import { fingerprint } from "../../../../scripts/docs/fingerprint.mjs";
import { capabilityScope, scopeFingerprint } from "../../../../scripts/docs/evidence-scope.mjs";

const base = "docs/evidence/assets/reliable-preview/";
const evidence = "EVD-20261004-S3-RELIABLE-PREVIEW-CURRENT-ONLY";
const readJson = async path => JSON.parse(await readFile(path, "utf8"));
const hash = async path => createHash("sha256").update(await readFile(path)).digest("hex");
const fp = await fingerprint();
for (const [name, count] of [["full-ledger-attempt05.json", 70], ["focused-ledger-attempt06.json", 14]]) {
  const ledger = await readJson(base + name);
  if (ledger.code_fingerprint !== fp || ledger.final_fingerprint !== fp || !ledger.finished_at || ledger.commands.length !== count || ledger.commands.some(item => item.exit_code !== 0)) throw new Error(`Incomplete or stale ledger: ${name}`);
  for (const item of ledger.commands) if (await hash(item.log.path) !== item.log.sha256) throw new Error(`Log drift: ${item.command}`);
}
const preservation = await readJson(base + "no-alias-preservation.json");
if (preservation.result !== "passed") throw new Error("Runtime preservation audit is not passed");
const runtime = await readJson(base + "no-alias-current-runtime.json");
if (runtime.code_fingerprint !== fp || runtime.runtime.services.length !== 2 || runtime.runtime.services.some(s => s.build_input_digest !== runtime.build_input_digest)) throw new Error("Runtime identity mismatch");
const value = await loadProgramModel(process.cwd());
const program = value.programs.find(item => item.manifest.program_id === "creative-assistant-stage3");
const capability = program.capabilities.find(item => item.capability_id === "CAP-S3-RELIABLE-PREVIEW-001");
const scope = await scopeFingerprint(process.cwd(), capabilityScope(program, capability));
const ledgerPath = base + "full-ledger-attempt05.json", ledgerSha = await hash(ledgerPath);
const header = `---\nevidence_id: ${evidence}\nwork_package_id: WP-S3-RELIABLE-PREVIEW-001\ndate: 2026-10-04\nrepository_commit: 13a3ce07fa9b4a7d8a7bf9a338497d9a0cc214de\ncode_fingerprint: ${fp}\nscope_fingerprint: ${scope}\ncapability_ids: [CAP-S3-RELIABLE-PREVIEW-001]\nacceptance_ids: [ACC-S3-RELIABLE-PREVIEW-001]\nresult: blocked\n---\n`;
await writeFile(`docs/evidence/runs/${evidence}.md`, header + `
# P2唯一现行入口和两服务同步

本次用户授权范围是先同步源码与Docker，物理移除旧接口，保留用户数据和无关改动。该同步及工程验证已完成；P2真实视频失败尚未修复，本Evidence总结果blocked，不执行docs:complete，不推进P3，不当作界面播放、听音、Stage Exit或Release通过。

git fetch后HEAD与origin/main均13a3ce07fa9b4a7d8a7bf9a338497d9a0cc214de，ahead/behind 0/0，无待合并PR。最新实施是保留的未提交P0–P2源码，未reset、stash、提交、推送或合并。新旧区分由现行策略、实际调用方和新ADR-0042确定；ADR-0041历史原文和旧Evidence保留。

已物理移除Host readMediaPreview及IPC project.media.preview；精修调用方与两项既有Host测试迁移到readMediaAnalysis/project.media.analysis。project.media.browse与media.browse.v1仍是图片、视频、独立音频统一浏览入口。严格分析是另一现行用途，保留原片PTS/sample证据，不能删作旧播放器。没有别名、回退或双读。认证Web测试验证旧查询UNKNOWN_QUERY、旧Host方法不存在、新分析查询真实返回波形和音频。初次正向用0.1秒WAV触发ENOENT，日志focused-web-host-test-attempt05.log保留；改为1秒fixture后真实分析通过，生产算法和错误断言未放宽。

最终源码完整check下游70条命令及专项14条均exit0，开始/结束指纹相同。账本${ledgerPath}，SHA256 ${ledgerSha}；focused-ledger-attempt06.json及每条日志有SHA256。初次focused05失败、full04因fixture变化中止均保留，不宣称首次通过；docs工具检查由收尾单独记录。

两镜像构建输入摘要${runtime.build_input_digest}，运行摘要${runtime.runtime.digest}。桌面镜像${runtime.runtime.services.find(s=>s.service==='desktop').image_id}；Whisper镜像${runtime.runtime.services.find(s=>s.service==='whisper').image_id}。新镜像842来源和700编译输出逐项核验，通过镜像内原型和IPC/Renderer源码证明旧入口缺失。运行身份再次通过assertRuntimeBuildProvenance核验，文件为no-alias-current-runtime.json、no-alias-runtime-provenance.log、no-alias-compiled-removal.log。

旧Host收到SIGTERM后自行退出，没有本次保存超时；只用原compose.yaml与docker/compose.gpu.yaml执行up -d --no-build desktop whisper。旧两个AVE容器已移除，目前只有两个新AVE容器且healthy。五个AVE数据卷、材料只读及导出读写绑定、GPU设备和原配置文件路径保留；Windows路径C:/与/run/desktop/mnt/host/c/只按精确盘符映射比较，原始表示同时保存。22个原数据卷名称全部保留，6个无关容器ID、镜像显示值和运行/停止状态相同，见no-alias-preservation.json。四个确认的退役AVE镜像ID在首次盘点就已不存在，本次再次确认无容器引用且镜像不存在，因此没有执行image rm或广泛清理；不能声称本次删除了这些镜像。未删项目、原片、导出、模型卷、历史或其他服务。

用户此前真实截图报告QUERY_FAILED及WORKER_CRASH、视频不可播放。只读诊断发现旧浏览取消未排空时Renderer立即开始新prepare；共享Worker在取消宽限超时后终止，能够杀掉新请求。旧运行日志退出137，cgroup未记录OOM。取消/Worker生命周期修复没有包含在本次入口同步中，后续应修复现行共享链路，不能添加第二套视频脚本。新构建的真实播放、快速切换、声音和保存重开尚未验收。P1既有人工通过保持其原构建绑定，不扩大为P2验收。

全量工程通过后刷新适用性索引，仅说明当前工程覆盖，不改历史Evidence，也不赋予历史人工反馈新的运行身份。最终无关文件字节核对另见no-alias-final-change-audit.json。
`, { flag: "wx" });
capability.status = "tested";
capability.evidence_ids = [...new Set([...capability.evidence_ids, evidence])];
const acceptance = program.acceptances.find(item => item.acceptance_id === "ACC-S3-RELIABLE-PREVIEW-001");
acceptance.status = "blocked";
acceptance.evidence_ids = [...new Set([...acceptance.evidence_ids, evidence])];
program.manifest.work_packages.find(item => item.work_package_id === "WP-S3-RELIABLE-PREVIEW-001").status = "blocked";
program.state.active_work_package = null;
program.state.latest_evidence_id = evidence;
program.state.code_fingerprint = fp;
program.state.latest_validation_at = new Date().toISOString();
const debt = program.state.debts.find(item => item.debt_id === "DEBT-S3-RELIABLE-PREVIEW-HUMAN");
debt.summary = "用户真实反馈视频不可播放并出现QUERY_FAILED/WORKER_CRASH。唯一现行接口及两服务同步已完成，旧别名及旧容器移除；共享Worker取消竞态尚未修复，不能将工程通过或healthy当作播放通过。";
debt.exit_condition = "修复现行浏览释放/取消与共享Worker生命周期，验证快速切换和真实视频播放、声音，再获得绑定最终运行身份的WIN-01/03/08反馈。";
debt.evidence_ids = [...new Set([...debt.evidence_ids, evidence])];
for (const [path, object] of [[program.files.manifest, program.manifest], [program.files.capabilities, program.capabilities], [program.files.acceptances, program.acceptances], [program.files.state, program.state]]) await writeFile(path, JSON.stringify(object, null, 2) + "\n");
const indexPath = "docs/evidence/APPLICABILITY_INDEX.json", index = await readJson(indexPath), scopes = [];
for (const item of value.programs) for (const cap of item.capabilities.filter(cap => ["implemented", "tested", "accepted"].includes(cap.status))) {
  const definition = capabilityScope(item, cap), currentScope = await scopeFingerprint(process.cwd(), definition);
  scopes.push({ program_id: item.manifest.program_id, capability_id: cap.capability_id, scope_fingerprint: currentScope });
  for (const evidenceId of cap.evidence_ids) {
    const entry = { capability_id: cap.capability_id, evidence_id: evidenceId, repository_fingerprint: fp, scope_id: definition.scope_id, scope_fingerprint: currentScope, applicability_index_only: true, revalidation_evidence_id: evidence, revalidation_ledger: { path: ledgerPath, sha256: ledgerSha } };
    const found = index.entries.findIndex(old => old.capability_id === cap.capability_id && old.evidence_id === evidenceId && old.applicability_index_only === true);
    if (found < 0) index.entries.push(entry); else index.entries[found] = entry;
  }
}
await writeFile(indexPath, JSON.stringify(index, null, 2) + "\n");
await writeFile(base + "no-alias-revalidation-scopes.json", JSON.stringify({ code_fingerprint: fp, entries: scopes }, null, 2) + "\n");
console.log(JSON.stringify({ evidence, code_fingerprint: fp, scope_fingerprint: scope, sync: "passed", p2_actual_playback: "blocked" }));
