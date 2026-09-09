import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { externalPath, loadMaterialCase, type MaterialCase } from '../tests/integration/stage2-material-case.js';
import { runMaterialCase } from '../tests/integration/stage2-material-run.js';
const escape = (s: unknown) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
export async function acceptanceEntry(phase: string, output: string, manifest = process.env.AVE_REAL_MEDIA_MANIFEST) {
  if (!['prepare', 'run', 'validate'].includes(phase)) throw new Error('phase must be prepare, validate or run');
  const root = externalPath(output); await mkdir(root); // exclusive: no overwrite of previous reviews
  let material: MaterialCase | undefined; let blocker = '';
  try { if (!manifest) throw new Error('AVE_REAL_MEDIA_MANIFEST 未设置；需要六个独立、已授权原片及内容证据。'); material = await loadMaterialCase(manifest); }
  catch (error) { blocker = error instanceof Error ? error.message : String(error); }
  let results: any[] = [];
  let humanProjects: any[] = [];
  if (!blocker && phase === 'run') {
    try { results = await runMaterialCase(material!, root); humanProjects = await runMaterialCase(material!, root, true); }
    catch (error) { blocker = `技术执行未完成：${error instanceof Error ? error.message : String(error)}`; }
  }
  const rubric = ['故事清楚且完整', '事实与证据忠实', '人物表达与敏感内容准确', '镜头、节奏、连续性与遗漏', '适用的视觉可读性', '声音、接缝与聆听舒适度', '解释与备选有用', '修改受控且结果可信'];
  await writeFile(resolve(root, '人工评审.md'), `# 人工评审（未填写）\n\n案例：${material?.case_id ?? '待素材'}\n\n判定规则在运行前冻结：适用项至少 3 分（基本可接受），无未解决阻断。事实、权限、关键内容遗漏和技术语义错误不得被平均分抵消。未使用的字幕、音乐包装等记 N/A，不记满分。\n\n观看者：_____  日期：_____  产物 SHA-256：_____\n候选选择：A / B / 两者均可 / 两者均不接受（未选）\n\n${rubric.map(r => `- ${r}：__/5 或 N/A；理由：____；阻断：____`).join('\n')}\n\n问题：产物、时间点、所见/所闻、期望、严重性：_____\n\n结论：接受 / 修复后复审 / 不接受（未选）\n真实 Product 批准、拒绝与重开证据：_____\n`);
  await writeFile(resolve(root, '素材准备.md'), '# 主案例素材准备\n\n提供至少六个真正独立原片，建议同一活动共五至十分钟。不得复制、循环或预切单片冒充独立原片。原片保持仓库外，不上传。\n\n在 AVE_REAL_MEDIA_MANIFEST 指定的仓库外 JSON 增加 stage2_case，结构见仓库 tests/integration/stage2-material-case.ts 的 MaterialCase 类型。assets 包含原片路径、SHA-256、独立原片声明和授权依据；evidence 先记录原片实际内容、整数 PTS 范围、观察/解释、不确定性、具体需求及支持理由、真实来源和保护标记，再由候选引用。不要按 Beat 预算倒造事实，不要将人工文字标作 ASR。\n\n使用 duration-2m-v1：6–10 Beats、120 秒，一个 Beat 可包含多个合法范围。两候选在开场、采用内容、共有内容顺序中至少两项不同，需真人确认差异是否有意义。末尾裁剪须保留 12 秒 ending reserve、遵守 4 秒 variance 与内容保护。默认分配不保证有余量；无合法正例须报告缺口。\n\nprovenance.kind 只能是 system 或 human-reviewed；必须填写作者/方法。deterministic-fixture 只供工程测试。素材真实性和独立性声明仍需真人核验，哈希仅能发现完全重复文件。\n');
  const assets = material?.assets.map(a => `<li><a href="${escape(pathToFileURL(a.path).href)}">${escape(a.id)}</a> · ${escape(a.sha256)} · 授权：${escape(a.authorization)}</li>`).join('') ?? '<li>待提供</li>';
  const evidence = material?.evidence.map(e => `<tr><td>${escape(e.id)} / ${escape(e.asset)}</td><td>${e.start}/${e.timescale}–${e.end}/${e.timescale} 秒</td><td>${escape(e.observation)}<br>解释：${escape(e.interpretation)}<br>不确定：${escape(e.uncertainty.join('；'))}</td><td>${escape(e.supports.map(s => `${s.requirement}：${s.reason}`).join('；'))}<br>来源：${escape(e.provenance)}</td></tr>`).join('') ?? '';
  const videos = results.map(r => `<article><h3>${escape(r.label)} / ${escape(r.project.split(/[\\/]/).at(-1))}</h3><video controls preload="metadata" src="${escape(pathToFileURL(r.master.path).href)}"></video><p>Master SHA-256：${escape(r.master.sha256)}<br>Timeline ${r.timeline_version} · execution ${escape(r.execution.execution_id)}</p><p><a href="${escape(pathToFileURL(r.preview.path).href)}">完整 Preview</a></p></article>`).join('');
  await writeFile(resolve(root, '开始验收.html'), `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>Stage 2 开始验收</title><style>body{max-width:1100px;margin:40px auto;font:17px/1.7 system-ui;padding:20px;color:#172027}video{width:100%;max-height:600px}td{border:1px solid #ccc;padding:8px}article{margin:30px 0}code{overflow-wrap:anywhere}</style><h1>Stage 2 开始验收</h1><p><strong>${escape(blocker || (results.length ? '自动预检已执行；真人验收待完成' : '素材校验通过；编码执行待运行'))}</strong></p><p>这是只读评审目录。自动协议测试、真实媒体自动预检、Agent 辅助检查、真人内容判断分别记录。自动审批身份不表示有人看过或批准；本页不写项目、不发出审批。</p><ol><li>看素材概览、需求和关键事实。</li><li>完整观看两个候选，自行记录取舍；允许都不接受。</li><li>在现有 Electron Product 打开下方 human- 项目：素材 Contract/Evidence 是明确标识的预检准备状态，Story 尚未批准。先核对内容，再选择 Story、生成 Intent、批准并执行，生成当前 Preview/Master。自动预检决定不计真人审批。</li><li>查看局部修改的原范围、新范围和后果，决定接受或拒绝。</li><li>接受后对比完整前后成片，检查尾部和接缝。</li><li>明确拒绝另一合法建议，确认有效结果不变。</li><li>关闭、重开，核对当前版本、产物、决定与锁。</li><li>填写 <a href="人工评审.md">人工评审表</a>。</li></ol><h2>需求与禁止结果</h2><p>${escape(material?.contract.goal ?? '待素材与需求')}</p><ul>${material?.contract.requirements.map(r => `<li>${escape(r.id)}：${escape(r.statement)}</li>`).join('') ?? ''}</ul><p>禁止：${escape(material?.contract.forbidden.join('；') ?? '待填写')}</p><h2>原片</h2><ul>${assets}</ul><h2>证据索引</h2><table>${evidence}</table><h2>候选取舍</h2>${material?.candidates.map(p => `<p>${escape(p.id)}：${escape(p.title)} · ${escape(p.tradeoff)}</p>`).join('') ?? '待提供'}<h2>完整编码结果</h2>${videos || '<p>尚未生成真实成片，不能开始成片验收。</p>'}<h2>真人操作项目</h2>${humanProjects.map(p => `<p><code>${escape(p.project)}</code>：Story 待批准。选择候选后生成 Intent、批准、执行、渲染；本页不代点。</p>`).join('') || '待准备'}<h2>修改</h2><p>${escape(material?.feedback.reason ?? '待有合法余量的真实片段')}</p><p>${results.filter(r => r.feedback_preview).map(r => `预检已接受尾裁 ${material!.feedback.trim_pts}/${material!.evidence.find(e => e.id === material!.feedback.evidence)!.timescale} 秒；其他片段保持原样。另一建议已明确拒绝，重开已核对。真人须在自己的 human- 项目重复并记录。`).join('')}</p><p>技术附件：technical-results.json（仅运行完成后生成）；评分表始终未填写。<a href="素材准备.md">素材准备</a></p></html>`);
  console.log(`STAGE2_ACCEPTANCE_ROOT=${root}`);
  if (blocker && phase !== 'prepare') throw new Error(blocker);
  return { root, blocker, results };
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const [phase = 'prepare', output = process.env.AVE_INTELLIGENCE_PIPELINE_REVIEW_ROOT] = process.argv.slice(2);
  if (!output) throw new Error('provide a fresh external output directory');
  await acceptanceEntry(phase, output);
}
