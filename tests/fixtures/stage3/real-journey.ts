import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { StringDecoder } from "node:string_decoder";
import { buildRealDesktop, reuseRealDesktop, launchRealDesktop, armExactFileSelection } from "./real-electron.js";
import { digestFile, readPublicMedia } from "./real-public-media.js";

/** Frozen before first generation. Only prompt strings go through normal product input;
 * evaluator source labels, expected ranges and acceptance answers never enter the model. */
export const realJourney = {
  identity: "stage3-isolated-creator",
  persona: "公开实拍旅行剪辑测试身份，与真实用户档案隔离；偏好只能由下面真实反馈、采用与授权链学习。",
  profileContexts: ["旅行短片", "旅行", "徒步", "海边旅行"],
  cold: "用这份素材做一个24秒的徒步小故事，至少四个镜头：让人看出队伍在岩石步道上前进，并有远近变化。不要添加素材里没有的事件、配乐或台词；没有真实语音就不要编字幕。先做完整可播放初稿。",
  feedback: "太拖沓了。改成12秒，至少四个短镜头，重新选材和排序，让脚步与人物动作带动节奏，去掉重复段。我平时剪旅行短片喜欢这种紧凑的动作节奏，请记住；这是一条长期偏好，不只这一次。保留真实可用原声，不虚构声音或对白。",
  repairedFeedback: "上一版只是把同样的四个镜头缩短了，没有重新选材和排序。请真正重新选材并改变镜头排序，仍做12秒、至少四个短镜头，让脚步与人物动作带动节奏，去掉重复段。纠正经验记录：只有旅行短片紧凑的动作节奏是我的长期偏好；保留真实声音、不虚构对白只是本次作品的内容真实性要求，不是我的长期声音审美偏好。",
  alternate: "用相同素材做一个30秒的安静观察版本，至少四个镜头，让峡谷空间与人的尺度成为重点，长镜头舒展，不做动作集锦，不虚构声音。",
  relativeShorter: "把成片缩短一点，保留这次安静观察的方向；这只是本次修改，不是长期偏好。",
  heldOut: "用这些新素材做一个18秒的海边旅行小故事，至少四个镜头，有人物活动和环境的关系。采用适用于旅行短片的已有偏好。不要使用片头片尾文字卡、标志或虚构事件，不编对白。",
  opposite: "当前这版改成30秒，至少四个镜头，每个镜头更舒展，优先海岸景色，人物动作只作点缀。虽然我以前喜欢紧凑节奏，当前明确要求优先，请不要把这次要求覆盖成长久习惯。",
  repairedOpposite: "刚才30秒那版镜头反而更碎，片尾一闪而过。我现在观看的是原18秒版本，请基于正在看的这一版改为30秒：每个镜头更舒展，海岸景色优先，人物动作只作点缀。这只是当前要求，不是长期偏好。",
  exception: "这一次是例外：做一个24秒的慢节奏海边观察版本，保留更多环境空镜，不改变我的长期旅行剪辑偏好。",
  correction: "纠正我的长期偏好：以后旅行短片不要一味快剪，更喜欢环境先行、动作随后、镜头有呼吸感。当前改成24秒至少四个镜头，按这个新偏好重新组织。这是明确长期纠正，不是本次例外。",
  afterForget: "用现有素材重新做一个18秒的海边小故事，至少四个镜头。只按这次要求和素材本身判断，不引用已删除的经验，不编对白或添加不存在的内容。",
  speech: "做一个8秒的人物解说小片，分成两个连续片段，保留原语种同期声和真实环境声音。字幕只用所选范围里确实说出的原文，不翻译、不补词、不总结，不添加配乐。先做完整可播放初稿。",
  soundFeedback: "两个片段的同期声都太响了，请都降低12dB。保持原画面范围、镜头顺序、总时长和字幕原文，不添加或翻译任何话，也不要改变色彩。这是本次具体混音修正，不是长期偏好。",
  colorFeedback: "两个镜头的曝光都比现在提高0.3，让人物画面亮一点。保持原片范围、镜头顺序、总时长、当前音量和字幕原文不变，不改对比度、饱和度或构图。这是本次具体画面修正，不是长期偏好。",
  repairedColorFeedback: "上一版变成灰白轮廓了，对比度被错误清零。请把两个镜头的对比度恢复为正常的1，饱和度保持1，曝光保持我上次要求的0.3，不要再次累加。仍保持原片范围、镜头顺序、总时长、当前音量和字幕原文、构图不变。这是修复本次画面错误，不是长期偏好。",
  framingFeedback: "两个镜头都在当前横屏画布内居中等比放大到1.2倍，人物显得近一点，保持横屏比例。保持原片范围、顺序、总时长、现在的曝光和音量、字幕原文不变。这只是本次具体构图修正，不是长期偏好。",
  performance: "做一个18秒的现场音乐演出记录，至少四个镜头，选择音乐正在演奏的部分，展示演奏者、指挥和乐器之间的关系。保留真实同期音乐，不另配乐、不编造对白或字幕。按现场演出的情境安排节奏，不把旅行动作集锦的习惯直接套用。这是当前作品要求，不更新长期偏好。",
  assertions: {
    C1: "A原片SHA/许可冻结；>=4真实源范围，24秒目标使用BigInt RationalTime严格相等断言（历史冻结文件不改）；自动出Preview/Master、实际decode/QC；A静音不造语音。",
    C2: "制作中输入修订/取消；旧run不能写新revision；保护对象/手动并发明确拒绝原因。故障Fixture单独记录。",
    C3: "24→12秒，无操作员提供时间码；source范围/顺序实际不同；至少4镜头，长期反馈原话保存。",
    C4: "两版比较、观看/采用分离、撤销/重做、跨版组合、保护镜头、多镜头音量/字幕、手动修改并重开。",
    C5: "同A素材30秒环境意图与12秒动作意图的选材/顺序/平均镜头长度存在实质差异；独立D真实演出按演出情境检索、不误用旅行节奏，保留真实同期音乐。",
    C6: "真实授权A学习→新B首作前B未进入档案→B检索实际使用原则→当前相反/例外/纠正→遗忘A及依赖后再生成，排除索引/缓存/历史重学。",
    C7: "1440/1000窗口真实截图与录屏实看；空/制作/失败/比较；即时关窗未发送输入恢复。",
    C8: "所有实际产物Hash/源范围；双render相同semantic manifest；C原文字幕、双镜头音量/曝光/居中构图分别核实际PCM和编码像素；导出文件与master一致；版本选择重开。",
    C9: "每个失败保留cause/stack/run/input-version/commit-state，不内部重试，不挑成功；持久化与删除交错由明确Fixture另验。",
  },
} as const;

/** Independent evaluator only: SQLite is opened read-only; never calls Host commands. */
export async function readProjectProof(projectRoot: string): Promise<any> {
  const db = new DatabaseSync(resolve(projectRoot, "project.sqlite"), { readOnly: true });
  try {
    const refs = db.prepare("SELECT object_hash,object_type,relation_key,version FROM object_refs ORDER BY created_at,object_ref_id").all() as any[];
    const objects = [];
    for (const ref of refs) {
      const path = resolve(projectRoot, "objects/sha256", ref.object_hash.slice(0, 2), ref.object_hash);
      if (!["creation_session", "timeline_snapshot", "creation_draft_execution", "creation_render", "creation_observation", "creation_learning_result", "creation_learning_event", "creation_learning_decision", "creation_production_failure", "audio_source_measurement", "audio_resource_snapshot"].includes(ref.object_type)) continue;
      assert.equal(await digestFile(path), ref.object_hash);
      objects.push({ ...ref, value: JSON.parse(await readFile(path, "utf8")) });
    }
    const latest = new Map();
    for (const object of objects.filter(item => item.object_type === "creation_session")) if ((latest.get(object.relation_key)?.sequence ?? -1) < object.value.sequence) latest.set(object.relation_key, object.value);
    return { state: db.prepare("SELECT * FROM project_state").get(), requests: [...latest.values()], objects, model_runs: db.prepare("SELECT * FROM model_runs ORDER BY created_at").all(), jobs: db.prepare("SELECT job_id,task_type,attempt,state,started_at,completed_at FROM jobs ORDER BY created_at,job_id").all(), events: db.prepare("SELECT * FROM project_events ORDER BY event_id").all() };
  } finally { db.close(); }
}

const confirmationAudit = new WeakMap<object, { buffer: string; records: any[]; expected: number; error?: Error }>();
export async function readConfirmationAudit(app: any): Promise<any[]> {
  const audit = confirmationAudit.get(app); if (!audit) return [];
  const until = Date.now() + 5000;
  while (audit.records.length !== audit.expected && !audit.error && Date.now() < until) await new Promise(resolve => setTimeout(resolve, 10));
  if (audit.error) throw audit.error;
  assert.equal(audit.records.length, audit.expected, "Every strict native authorization must emit its actual approval audit");
  return structuredClone(audit.records);
}
export async function armConfirmation(app: any, expected: any) {
  if (!confirmationAudit.has(app)) {
    const audit = { buffer: "", records: [] as any[], expected: 0, error: undefined as Error | undefined }; confirmationAudit.set(app, audit);
    const output = app.process().stdout; assert.ok(output, "Native role audit requires the real Electron stdout stream");
    const decoder = new StringDecoder("utf8");
    output.on("data", (chunk: Buffer) => {
      audit.buffer += decoder.write(chunk); let newline;
      while ((newline = audit.buffer.indexOf("\n")) >= 0) {
        const line = audit.buffer.slice(0, newline); audit.buffer = audit.buffer.slice(newline + 1);
        if (line.startsWith("AVE_REAL_TEST_AUTHORIZATION ")) {
          try { audit.records.push(JSON.parse(line.slice("AVE_REAL_TEST_AUTHORIZATION ".length))); }
          catch (cause) { audit.error = new Error("Native approval audit is invalid JSON", { cause }); }
        }
      }
    });
    output.on("end", () => { audit.buffer += decoder.end(); if (audit.buffer.includes("AVE_REAL_TEST_AUTHORIZATION ")) audit.error = new Error("Native approval audit stream ended with an incomplete record"); });
  }
  await app.evaluate(({ dialog }: any, selected: any) => {
    const scope = globalThis as any;
    if (!scope.__aveTestConfirm) {
      scope.__aveTestConfirm = { pending: null, log: [] };
      dialog.showMessageBox = async (...args: any[]) => {
        const state = scope.__aveTestConfirm, item = state.pending; state.pending = null;
        const actual = args.at(-1);
        if (!item || JSON.stringify(actual) !== JSON.stringify(item)) throw new Error(`TEST_ROLE_EXACT_AUTHORIZATION_MISMATCH: ${JSON.stringify(actual)}`);
        const record = { role: "stage3-isolated-creator", at: new Date().toISOString(), approved: actual };
        state.log.push(record);
        process.stdout.write(`AVE_REAL_TEST_AUTHORIZATION ${JSON.stringify(record)}\n`);
        return { response: 1 };
      };
    }
    if (scope.__aveTestConfirm.pending) throw new Error("TEST_ROLE_CONFIRMATION_ALREADY_ARMED");
    scope.__aveTestConfirm.pending = selected;
  }, expected);
  confirmationAudit.get(app)!.expected += 1;
}

export async function runRealJourney(repository: string, reviewRoot: string, modelConfig: string, kind: "cold" | "speech" = "cold"): Promise<void> {
  const attemptRoot = resolve(reviewRoot, `${kind === "cold" ? "journey" : "speech-journey"}-${Date.now()}`), userData = resolve(attemptRoot, "test-user-data");
  await mkdir(attemptRoot, { recursive: true });
  const manifest = await readPublicMedia(reviewRoot), config = JSON.parse(await readFile(modelConfig, "utf8"));
  for (const source of manifest.sources) assert.equal(await digestFile(source.local_file), source.sha256);
  const prompt = kind === "cold" ? realJourney.cold : realJourney.speech, expectedSeconds = kind === "cold" ? 24 : 8, expectedShots = kind === "cold" ? 4 : 2;
  await writeFile(resolve(attemptRoot, "frozen-evaluator-plan.json"), JSON.stringify(realJourney, null, 2), { flag: "wx" });
  const report: any = { identity: realJourney.identity, case: kind, scope: "real production Electron journey, no mock Host", started_at: new Date().toISOString(), attemptRoot, operations: [], errors: [], authorizations: [], result: "running", source_manifest_sha256: await digestFile(resolve(reviewRoot, "source-rights/manifest.json")) };
  const save = async () => { await writeFile(resolve(attemptRoot, "result.json"), JSON.stringify(report, null, 2)); };
  const log = async (operation: string, detail: unknown = null) => { report.operations.push({ operation, detail, at: new Date().toISOString() }); await save(); console.log(`${operation} ${attemptRoot}`); };
  let app: any, page: any, projectRoot: string | undefined;
  try {
    const entrypoint = process.env.AVE_REAL_REUSE_BUILD_ROOT ? await reuseRealDesktop(reviewRoot, process.env.AVE_REAL_REUSE_BUILD_ROOT, attemptRoot) : await buildRealDesktop(repository, attemptRoot);
    app = await launchRealDesktop(repository, reviewRoot, attemptRoot, entrypoint, userData, modelConfig); page = await app.firstWindow();
    page.on("pageerror", (error: Error) => report.errors.push({ message: error.message, stack: error.stack }));
    await page.waitForURL("app://renderer/index.html");
    projectRoot = resolve(attemptRoot, kind === "cold" ? "project-learning" : "project-speech"); await mkdir(projectRoot);
    await armExactFileSelection(app, ["openDirectory", "createDirectory"], [projectRoot]);
    await page.getByRole("button", { name: "新建作品", exact: true }).click();
    const rail = page.getByRole("navigation", { name: "工作台导航" });
    await rail.getByRole("button", { name: "素材", exact: true }).click();
    const speechRights = kind === "speech" ? JSON.parse(await readFile(resolve(reviewRoot, "source-rights/C01-excerpt-rights.json"), "utf8")) : null;
    const learning = kind === "cold" ? manifest.sources.filter((item: any) => item.partition === "learning") : [{ id: "C01", partition: "speech-control", local_file: resolve(reviewRoot, "public-media/source-C01.mp4"), sha256: speechRights.sha256.toLowerCase() }];
    for (const source of learning) assert.equal(await digestFile(source.local_file), source.sha256);
    if (speechRights) await writeFile(resolve(attemptRoot, "speech-source-rights.json"), JSON.stringify(speechRights, null, 2));
    await armExactFileSelection(app, ["openFile", "multiSelections"], learning.map((item: any) => item.local_file), true);
    await page.getByRole("button", { name: "导入素材", exact: true }).click();
    for (const source of learning) await page.getByRole("button", { name: new RegExp(`source-${source.id}\\.mp4`) }).waitFor({ timeout: 120000 });
    await log("learning-imported", { projectRoot, sources: learning.map((item: any) => ({ id: item.id, sha256: item.sha256 })) });
    const form = page.locator('[data-creation-form="begin"]');
    await form.locator('[name="original_text"]').fill(prompt);
    await form.locator("summary").click();
    await form.getByRole("button", { name: "选择全部已导入素材" }).click();
    const allowed = ["request", "timeline", "evidence", "frames", "audio", "transcript", "profile"];
    for (const name of allowed) await form.locator(`input[name="${name}"]`).check();
    const assets = await form.locator('[name="asset_ids"]').evaluate((select: HTMLSelectElement) => [...select.selectedOptions].map(item => item.value));
    const provider = await form.locator('[name="provider"]').inputValue(), model = await form.locator('[name="model"]').inputValue();
    const expires = new Date(await form.locator('[name="expires_at"]').inputValue()).toISOString();
    const project = JSON.parse(await readFile(resolve(projectRoot, "project.json"), "utf8"));
    const endpoint = (value: string) => new URL(value).href.replace(/\/$/, "");
    const routes = ["vision", "transcription", "sound", "planner"].map(role => { const service = config[role] ?? config.vision; return `${role}: ${service.provider} / ${service.model} → ${endpoint(service.base_url)}`; });
    const detail = [`项目：${project.project_id} · 当前版本 v0`, `要求原文：\n${prompt}`, `授权素材：\n${assets.join("\n")}`, `模型服务：${provider} / ${model}`, `接收端：${endpoint((config.planner ?? config.vision).base_url)}`, "可发送的数据：本次要求、当前作品与时间线、素材观察与证据、素材抽帧、素材音频、转写、创作偏好", `分工接收端：\n${routes.join("\n")}`, "不得改变：未指定保护对象", `有效期：${expires}`, "本次授权包含范围内的素材分析和创作修改；扩大范围需重新授权。"].join("\n\n");
    await armConfirmation(app, { type: "warning", title: "AVE 创作请求授权", message: "确认素材、数据范围与模型服务", detail, buttons: ["取消", "授权本次创作"], defaultId: 0, cancelId: 0, noLink: true });
    await log("cold-request-authorized-scope", { source_ids: learning.map((item: any) => item.id), allowed, provider, model });
    await form.getByRole("button", { name: "授权并开始制作", exact: true }).click();
    report.authorizations = await readConfirmationAudit(app); await save();
    await page.screenshot({ path: resolve(attemptRoot, "cold-producing.png") });
    const deadline = Date.now() + 25 * 60 * 1000;
    let proof: any;
    while (Date.now() < deadline) {
      proof = await readProjectProof(projectRoot);
      const request = proof.requests.at(-1);
      if (request?.status === "failed") { await writeFile(resolve(attemptRoot, "cold-failed-proof.json"), JSON.stringify(proof, null, 2)); throw new Error(`REAL_CREATION_FAILED: ${request.authorization.request_id}; ${await page.locator('[role="status"]').innerText()}`); }
      if (request?.status === "watchable") break;
      const notice = await page.locator('[role="status"]').innerText();
      if (/^[A-Z][A-Z0-9_]+:/.test(notice)) { await writeFile(resolve(attemptRoot, "cold-failed-proof.json"), JSON.stringify(proof, null, 2)); throw new Error(`REAL_PRODUCT_FAILURE: ${notice}`); }
      await page.waitForTimeout(2000);
    }
    assert.equal(proof?.requests.at(-1)?.status, "watchable", "Real creation must produce a watchable version before timeout");
    await writeFile(resolve(attemptRoot, "cold-proof.json"), JSON.stringify(proof, null, 2));
    const { timelineFacts, validateRenderedProof, saveRenderedReview, assertExactDuration } = await import("./real-journey-continue.js");
    const facts = timelineFacts(proof); assert.ok(facts.video.length >= expectedShots, `Frozen story requires at least ${expectedShots} real shots`);
    if (kind === "speech") assert.equal(facts.video.length, 2, "Frozen speech story requests exactly two continuous clips");
    assertExactDuration(facts, expectedSeconds);
    if (kind === "cold") assert.ok(facts.timeline.tracks.every((track: any) => !track.captions?.length), "Silent source cannot generate invented speech captions");
    else { const captions = facts.timeline.tracks.flatMap((track: any) => track.captions ?? []); assert.ok(captions.length > 0, "Actual spoken source must exercise the subtitle path"); assert.ok(captions.every((caption: any) => !/[\u4e00-\u9fff]/.test(caption.text)), "English speech must not be silently translated into Chinese captions"); }
    const receipt = await validateRenderedProof(projectRoot, proof, facts.draft); await saveRenderedReview(projectRoot, attemptRoot, facts, receipt);
    await writeFile(resolve(attemptRoot, "cold-independent-assertions.json"), JSON.stringify({ seconds: facts.seconds, shots: facts.video.length, source_map: facts.source_map, calls: proof.requests.at(-1).model_calls.map((call: any) => ({ role: call.target?.role, status: call.settlement?.status, usage: call.settlement?.usage })) }, null, 2));
    await page.waitForFunction(() => [...document.querySelectorAll("video")].some(video => video.readyState >= 2 && video.videoWidth > 0), undefined, { timeout: 60000 });
    const video = page.getByLabel(`作品 v${facts.draft.timeline_version} 预览`, { exact: true }); await video.focus(); await page.keyboard.press("Space");
    await page.waitForFunction(() => [...document.querySelectorAll("video")].some(video => !video.paused && video.currentTime > 0)); await page.keyboard.press("Space");
    await page.screenshot({ path: resolve(attemptRoot, "cold-watchable.png") });
    await log("cold-watchable", { projectRoot, draft: proof.requests.at(-1).latest_draft_id });
    assert.deepEqual(report.errors, [], "Renderer errors must not be hidden by watchable media");
    report.result = "cold-watchable-next-stages-pending";
  } catch (error) {
    report.result = "failed"; report.failure = { message: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : null };
    if (page) await page.screenshot({ path: resolve(attemptRoot, "failure.png") }).catch((captureError: Error) => report.errors.push({ boundary: "screenshot", message: captureError.message }));
    throw error;
  } finally {
    const cleanup: unknown[] = [];
    if (app) {
      try { await app.close(); } catch (error) { cleanup.push(error); }
    }
    if (projectRoot) {
      try { await writeFile(resolve(attemptRoot, "final-closed-project-proof.json"), JSON.stringify(await readProjectProof(projectRoot), null, 2)); } catch (error) { cleanup.push(error); }
    }
    if (cleanup.length) { report.result = "failed"; report.cleanup_failures = cleanup.map(error => ({ message: String(error), stack: error instanceof Error ? error.stack : null })); }
    report.finished_at = new Date().toISOString(); await save(); console.log(`STAGE3_REAL_JOURNEY_EVIDENCE=${attemptRoot}`);
    if (cleanup.length) throw new AggregateError([...(report.failure ? [report.failure] : []), ...cleanup], "Real journey shutdown failed; original failure retained in result.json");
  }
}
