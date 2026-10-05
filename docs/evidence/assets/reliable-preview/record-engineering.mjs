import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { loadProgramModel } from "../../../../scripts/docs/program-model.mjs";
import { fingerprint } from "../../../../scripts/docs/fingerprint.mjs";
import { capabilityScope, scopeFingerprint } from "../../../../scripts/docs/evidence-scope.mjs";
const base = "docs/evidence/assets/reliable-preview/";
const evidence = "EVD-20261004-S3-RELIABLE-PREVIEW-ENGINEERING";
const blocked = "EVD-20261004-S3-RELIABLE-PREVIEW-HUMAN-PENDING";
const fp = await fingerprint();
const readJson = async path => JSON.parse(await readFile(path, "utf8"));
const hash = async path => createHash("sha256").update(await readFile(path)).digest("hex");
for (const name of ["full-ledger-attempt03.json", "focused-ledger-attempt04.json"]) {
  const ledger = await readJson(base + name);
  if (ledger.code_fingerprint !== fp || ledger.final_fingerprint !== fp || !ledger.finished_at || ledger.commands.some(item => item.exit_code !== 0)) throw new Error(`Incomplete or stale ledger: ${name}`);
  for (const item of ledger.commands) if (await hash(item.log.path) !== item.log.sha256) throw new Error(`Log drift: ${item.command}`);
}
const ledgerPath = base + "full-ledger-attempt03.json", ledgerSha = await hash(ledgerPath);
const value = await loadProgramModel(process.cwd());
const program = value.programs.find(item => item.manifest.program_id === "creative-assistant-stage3");
const capability = program.capabilities.find(item => item.capability_id === "CAP-S3-RELIABLE-PREVIEW-001");
const scope = await scopeFingerprint(process.cwd(), capabilityScope(program, capability));
const header = (id, result) => `---\nevidence_id: ${id}\nwork_package_id: WP-S3-RELIABLE-PREVIEW-001\ndate: 2026-10-04\nrepository_commit: 13a3ce07fa9b4a7d8a7bf9a338497d9a0cc214de\ncode_fingerprint: ${fp}\nscope_fingerprint: ${scope}\ncapability_ids: [CAP-S3-RELIABLE-PREVIEW-001]\nacceptance_ids: [ACC-S3-RELIABLE-PREVIEW-001]\nresult: ${result}\n---\n`;
await writeFile(`docs/evidence/runs/${evidence}.md`, header(evidence, "passed") + `
# P2完整素材浏览工程验证

本Evidence只确认当前源码的工程验证，不确认实际界面、听音、主观接受、Stage Exit或Release。完整check下游70条命令逐项exit0，开始/结束指纹一致；账本 ${ledgerPath}，SHA256 ${ledgerSha}。P2专项账本 ${base}focused-ledger-attempt04.json 逐命令日志有SHA256。docs同步/检查由收尾独立执行，不冒称首次失败的pnpm check调用通过。

Worker真实完整图片/视频/独立音频派生、透明度/方向、18秒尾部解码、Host来源/派生摘要、Range/HEAD/416、跨会话拒绝、取消先于请求、晚到结果、未读取流关闭、并发释放、来源替换、波形单独失败与问题重开持久化均通过。Browser认证流和Electron受控协议适配通过；Electron实际Windows播放仍待人工。严格分析和配乐保持独立，浏览源时间映射明确blocked。AAC内部间隙仍返回MEDIA_SAMPLE_AUDIO_GAP，不能用浏览结果形成精修边界。

新编译镜像对九份既有获准来源重新转换/整段解码：七张图片和两段视频均通过。两视频源与产物时长分别37.967秒、32.856秒，真实音轨存在，尾部解码通过；严格链仍保留MEDIA_PREVIEW_FAILED及MEDIA_SAMPLE_AUDIO_GAP根因。见real-source-report-attempt01.json，原片SHA和字节数未变。这不是界面播放/听音验收。

两服务构建attempt03通过，输入摘要0fa8b7bdfc5850c3d47d5cb779422a4d2aacf3e590f06d736b9787a4ebaa5b9b。编译镜像842个来源/700个运行输出逐项哈希核验通过，见image-provenance-attempt02.log。运行替换需既有工作台真实保存确认，不能强制关闭；实际交接运行状态另见HUMAN-PENDING记录。

docs:check收尾首次因当前P2代码与已完成P1人工记录指纹不同被拒绝，closeout-docs-check-attempt01.log保留。修正仅对completed/accepted包的static审计校验不可变的历史构建；live完成、未完成包static仍比较当前构建。新增反例验证当前漂移仍拒绝新完成、历史来源篡改/工程指纹篡改仍拒绝，Evidence header与人类记录指纹必须相同。P1历史反馈不被重写，不被当作当前P2接受。该治理修复后再次执行完整工程链。新代码指纹的变化只来自文档验收模块及其反例测试；产品输入、来源和编译输出身份保持不变，image-provenance-attempt02.log按最终输入再次逐项核验。

首次失败和修复日志保留：Node纯函数测试静态导入Renderer API导致缺window，改为需要交互时动态导入；新审计读取所需SQLite all类型缺失，补齐真实类型；Windows handle/path设备ID差异按既有inode规则处理且保留摘要/大小/时间；旧Matroska间隙fixture先触发CREATION_MEDIA_BOUNDS_REQUIRED，改用保留真实间隙的AAC验证预期严格失败。full-attempt01/focused-attempt01/02及build-attempt02失败均保留，修复后最终源码复验通过。

历史Evidence未重写。完整回归通过后才刷新适用性索引，关联本Evidence及逐命令账本；该关联不能扩大历史人工接受。用户数据与其他服务保留，无提交/推送/合并/发布。P2工作包仍blocked，等待新构建的WIN-01/03/08反馈。
`);
await writeFile(`docs/evidence/runs/${blocked}.md`, header(blocked, "blocked") + `
# P2实际界面待验

当前工程通过，关联${evidence}。人工WIN-01/03/08未执行，不预填通过，不运行docs:complete。用户已授权必要两服务本地构建准备，未授权强制丢弃输入。

首次更新尝试只向旧desktop发送SIGTERM；Host以DESKTOP_INPUT_SAVE_TIMEOUT拒绝关闭，Node/项目保留。旧启动脚本一并终止YAMNet，已按同一模型目录/端口及原1000:1000用户恢复并实测health。保存保护日志runtime-update-save-barrier-attempt01.log保留。当前默认仍旧P1服务，不把新编译镜像说成新运行版本；待用户正常保存关闭页面后继续安全替换，再核验运行文件及实际人工流程。

人工流程：既有九项列表；图片方向/缩放/恢复；两视频完整画面/声音/拖到尾部/全屏；已有或新导入独立音频正常播放，快速切换无旧声音；返回作品保留版本/观看位置，正常关闭重开素材仍在。只能在最终运行身份核验后发出该验收，不要求构造坏文件、JSON或录屏补造。用户明确反馈后另建真实确认Evidence完成P2，当前不推进P3。
`);
capability.status = "tested"; capability.evidence_ids = [evidence];
const acceptance = program.acceptances.find(item => item.acceptance_id === "ACC-S3-RELIABLE-PREVIEW-001");
acceptance.status = "blocked"; acceptance.evidence_ids = [evidence, blocked];
const wp = program.manifest.work_packages.find(item => item.work_package_id === "WP-S3-RELIABLE-PREVIEW-001");
wp.status = "blocked";
program.state.active_work_package = null; program.state.latest_evidence_id = blocked;
program.state.debts = program.state.debts.filter(item => item.debt_id !== "DEBT-S3-RELIABLE-PREVIEW-HUMAN");
program.state.debts.push({ debt_id: "DEBT-S3-RELIABLE-PREVIEW-HUMAN", summary: "P2工程及新镜像已验证；旧Host拒绝未确认输入保存的关闭，运行替换和新构建WIN-01/03/08人工验收待用户正常关闭页面后继续。", status: "active", capability_ids: [capability.capability_id], acceptance_ids: [acceptance.acceptance_id], exit_condition: "安全替换两服务并核验实际运行身份，获得对应最终构建的五步真实用户反馈，再执行包完成协议。", evidence_ids: [blocked] });
for (const [path, object] of [[program.files.manifest, program.manifest], [program.files.capabilities, program.capabilities], [program.files.acceptances, program.acceptances], [program.files.state, program.state]]) await writeFile(path, JSON.stringify(object, null, 2) + "\n");
const indexPath = "docs/evidence/APPLICABILITY_INDEX.json", index = await readJson(indexPath), scopes = [];
for (const item of value.programs) {
  for (const cap of item.capabilities.filter(cap => ["implemented", "tested", "accepted"].includes(cap.status))) {
    const definition = capabilityScope(item, cap), currentScope = await scopeFingerprint(process.cwd(), definition);
    scopes.push({ program_id: item.manifest.program_id, capability_id: cap.capability_id, scope_fingerprint: currentScope });
    for (const evidenceId of cap.evidence_ids) {
      const entry = { capability_id: cap.capability_id, evidence_id: evidenceId, repository_fingerprint: fp, scope_id: definition.scope_id, scope_fingerprint: currentScope, applicability_index_only: true, revalidation_evidence_id: evidence, revalidation_ledger: { path: ledgerPath, sha256: ledgerSha } };
      const found = index.entries.findIndex(old => old.capability_id === cap.capability_id && old.evidence_id === evidenceId && old.applicability_index_only === true);
      if (found < 0) index.entries.push(entry); else index.entries[found] = entry;
    }
  }
}
await writeFile(indexPath, JSON.stringify(index, null, 2) + "\n");
await writeFile(base + "revalidation-closeout-scopes.json", JSON.stringify({ code_fingerprint: fp, entries: scopes }, null, 2) + "\n");
console.log(JSON.stringify({ evidence, blocked, code_fingerprint: fp, scope_fingerprint: scope, ledger_sha256: ledgerSha }));
