import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

/** Real UI actions and browser compositor observations only; no Host calls. */
export async function observeRealMotion(page: any, output: string): Promise<void> {
  const frames = resolve(output, "motion-actual-frames"); await mkdir(frames);
  const session = await page.context().newCDPSession(page), captured: any[] = [], writes: Promise<void>[] = [];
  session.on("Page.screencastFrame", (event: any) => {
    const filename = `${String(captured.length).padStart(5, "0")}.jpg`;
    captured.push({ filename, metadata: event.metadata });
    writes.push(writeFile(resolve(frames, filename), Buffer.from(event.data, "base64")));
    void session.send("Page.screencastFrameAck", { sessionId: event.sessionId });
  });
  await session.send("Page.startScreencast", { format: "jpeg", quality: 80, maxWidth: 1440, maxHeight: 900, everyNthFrame: 1 });
  const observations: any[] = [];
  const sample = async (name: string, action: () => Promise<void>, reverse?: () => Promise<void>) => {
    await page.evaluate(async () => { await Promise.all(document.getAnimations().filter(animation => animation.effect?.getTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => undefined))); });
    const started = Date.now();
    const sampling = page.evaluate(async (actionName: string) => {
      const points: any[] = [], start = performance.now(); let lastTransition = start, sawDual = false;
      while (performance.now() - start < 15000) {
        const boxes = [...document.querySelectorAll(".project-home,.product-shell,.stage2-workspace,.export-overlay,.export-dialog,.comparison-panel,video")].map(item => { const rect = item.getBoundingClientRect(), style = getComputedStyle(item); return { class: item.className, label: item.getAttribute("aria-label"), x: rect.x, y: rect.y, width: rect.width, height: rect.height, opacity: style.opacity, visibility: style.visibility }; });
        const videos = [...document.querySelectorAll("video")].map(video => ({ label: video.getAttribute("aria-label"), main: !!video.closest(".player-stage"), src: video.currentSrc, time: video.currentTime, paused: video.paused, ready: video.readyState, seeking: video.seeking, network: video.networkState, hidden: video.hidden, opacity: getComputedStyle(video).opacity }));
        const animations = document.getAnimations().map(animation => ({ state: animation.playState, time: animation.currentTime, progress: animation.effect?.getComputedTiming().progress }));
        points.push({ at: performance.now(), boxes, focus: document.activeElement?.getAttribute("aria-label") ?? document.activeElement?.tagName, selected: (document.querySelector(".history-list") as HTMLElement | null)?.dataset.selectedDraftId, videos, animations });
        if (animations.some(animation => animation.state === "running")) lastTransition = performance.now();
        if (videos.filter(video => video.main && !video.hidden && video.ready >= 2).length === 2) sawDual = true;
        const target = actionName.includes("switch-old") ? "作品 v2 预览" : "作品 v5 预览";
        const settledSwap = (actionName.startsWith("reduced-") || sawDual) && videos.filter(video => video.main).length === 1 && videos.some(video => video.label === target && video.ready >= 2 && !video.hidden);
        const comparisonReady = boxes.some(box => box.class === "comparison-panel" && box.width > 0) && videos.filter(video => !video.main && video.ready >= 2).length === 2;
        if (performance.now() - start >= 1400 && performance.now() - lastTransition >= 300 && (actionName.includes("switch-") ? settledSwap : actionName.endsWith("comparison-open") ? comparisonReady : true)) break;
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      }
      return points;
    }, name);
    await action(); if (reverse) { await page.waitForTimeout(110); await reverse(); }
    const points = await sampling; observations.push({ name, started_epoch_ms: started, finished_epoch_ms: Date.now(), points });
    await writeFile(resolve(output, "motion-observations.json"), JSON.stringify(observations, null, 2));
    if (name.startsWith("switch-")) {
      assert.ok(points.some((point: any) => point.videos.filter((video: any) => video.main && !video.hidden && video.ready >= 2).length === 2 && point.videos.some((video: any) => video.main && Number(video.opacity) > 0 && Number(video.opacity) < 1)), "Must observe the actual two decoded layers during the 180ms ready transition");
      assert.equal(points.at(-1).videos.filter((video: any) => video.main).length, 1, "Retiring decoded layer must be released after transition");
    }
    if (name === "conversation-reverse") assert.ok(new Set(points.map((point: any) => point.boxes.find((box: any) => box.class === "stage2-workspace panel" || box.class.includes("stage2-workspace"))?.width)).size > 2, "Actual right panel geometry must change through intermediate widths");
    if (["comparison-open", "comparison-close", "comparison-escape"].includes(name)) {
      assert.ok(points.some((point: any) => point.boxes.some((box: any) => box.class === "comparison-panel" && box.width > 0 && Number(box.opacity) > 0 && Number(box.opacity) < 1)), "Comparison must have actual intermediate opacity before it settles");
      for (const point of points) if(point.boxes.some((box: any) => box.class === "comparison-panel" && box.width > 0 && Number(box.opacity) > 0)) assert.equal(point.videos.filter((video: any) => !video.main && video.ready >= 2).length, 2, "Visible comparison must contain two decoded real videos");
    }
    await page.screenshot({ path: resolve(output, `motion-${name}-settled.png`) });
  };
  try {
    const rail = page.getByRole("navigation", { name: "工作台导航" }), conversation = rail.getByRole("button", { name: "对话", exact: true });
    assert.equal(await conversation.getAttribute("aria-pressed"), "true");
    // The rail selects the request tab when history is active; only the active
    // request tab makes the next rail click a close/open toggle.
    await page.locator('[data-creation-view="request"]').click();
    const input = page.locator('[data-creation-form="revise"] [name="raw_text"]'), originalInput = await input.inputValue();
    const playingVersion=page.getByLabel("作品 v5 预览",{exact:true});await playingVersion.waitFor({state:"visible"});await page.waitForFunction(()=>{const video=document.querySelector('.player-stage video') as HTMLVideoElement;return video?.readyState>=3&&!video.seeking;});await playingVersion.focus();await page.keyboard.press("Space");await page.waitForFunction(()=>{const video=document.querySelector('.player-stage video') as HTMLVideoElement;return video&&!video.paused&&video.currentTime>0;});

    await input.fill("动效隔离测试：保留这条未发送输入。"); await input.focus(); await page.keyboard.press("Home"); await page.keyboard.down("Shift"); await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowRight"); await page.keyboard.up("Shift");
    const inputBefore = await input.evaluate((item: HTMLTextAreaElement) => ({ text: item.value, start: item.selectionStart, end: item.selectionEnd }));
    await sample("conversation-reverse", () => conversation.click(), () => conversation.click());
    assert.equal(await conversation.getAttribute("aria-pressed"), "true");
    assert.equal(await playingVersion.evaluate((video:HTMLVideoElement)=>video.paused),false,"Panel reversal must not interrupt existing playback");await playingVersion.focus();await page.keyboard.press("Space");
    assert.deepEqual(await input.evaluate((item: HTMLTextAreaElement) => ({ text: item.value, start: item.selectionStart, end: item.selectionEnd })), inputBefore, "Panel reversal must preserve unsent input and selection; rail focus is an intentional click");
    await page.locator('[data-creation-view="drafts"]').click();
    await sample("export-reverse", () => page.locator('[data-action="export"]').click(), () => page.getByRole("button", { name: "关闭导出", exact: true }).click());
    const options = await page.locator("button[data-creation-draft]").evaluateAll((items: HTMLButtonElement[]) => items.map(item => ({ value: item.dataset.creationDraft!, text: item.textContent })));
    const older = options.find((item: any) => /^v2 ·/.test(item.text)), newer = options.find((item: any) => /^v5 ·/.test(item.text)); assert.ok(older && newer);
    await page.locator(`button[data-creation-draft="${older.value}"]`).click();
    await sample("switch-old-ready", () => page.getByRole("button", { name: "观看此版", exact: true }).click());
    await page.getByLabel("作品 v2 预览", { exact: true }).waitFor({ state: "visible" });
    await page.locator(`button[data-creation-draft="${newer.value}"]`).click();
    await sample("switch-new-ready", () => page.getByRole("button", { name: "观看此版", exact: true }).click());
    await page.getByLabel("作品 v5 预览", { exact: true }).waitFor({ state: "visible" });
    await page.getByLabel("比较版本", { exact: true }).selectOption(older.value);
    await sample("comparison-open", () => page.getByRole("button", { name: "比较两个版本", exact: true }).click());
    await sample("comparison-close", () => page.getByRole("button", { name: "结束比较", exact: true }).click());
    assert.equal(await page.getByRole("button", { name: "比较两个版本", exact: true }).evaluate((item: HTMLElement) => document.activeElement === item), true, "Comparison dismiss must return focus to its connected trigger");
    await sample("escape-comparison-open", () => page.getByRole("button", { name: "比较两个版本", exact: true }).click());
    await page.getByRole("button", { name: "结束比较", exact: true }).focus();
    await sample("comparison-escape", () => page.keyboard.press("Escape"));
    assert.equal(await conversation.getAttribute("aria-pressed"), "true", "Esc closes the comparison without closing the unrelated conversation panel");

    await sample("work-return", () => page.locator('[data-action="home"]').click());
    await sample("work-open", () => page.locator(".project-home .project-card").click());
    await page.locator(".shot").first().click();
    await sample("clip-reference", () => page.getByRole("button", { name: "引用到对话", exact: true }).click());
    assert.match(await input.inputValue(), /关于作品 v5 的镜头 1/); assert.equal(await input.evaluate((item: HTMLTextAreaElement) => document.activeElement === item), true, "Explicit clip reference must intentionally focus the composer");
    await input.fill(originalInput);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await sample("reduced-conversation-reverse", () => conversation.click(), () => conversation.click());
    assert.ok(await page.evaluate(() => document.getAnimations().every(animation => Number(animation.effect?.getComputedTiming().duration) <= 1)), "Reduced motion must not leave long transitions running");
    await page.locator('[data-creation-view="drafts"]').click();
    await page.locator(`button[data-creation-draft="${older.value}"]`).click();
    await sample("reduced-switch-old", () => page.getByRole("button", { name: "观看此版", exact: true }).click());
    await page.locator(`button[data-creation-draft="${newer.value}"]`).click();
    await sample("reduced-switch-new", () => page.getByRole("button", { name: "观看此版", exact: true }).click());
    await page.getByLabel("比较版本", { exact: true }).selectOption(older.value);
    await sample("reduced-comparison-open", () => page.getByRole("button", { name: "比较两个版本", exact: true }).click());
    await sample("reduced-comparison-close", () => page.getByRole("button", { name: "结束比较", exact: true }).click());
    for(const observation of observations.filter(item=>item.name.startsWith("reduced-")))assert.ok(observation.points.every((point:any)=>point.animations.every((animation:any)=>animation.state!=="running"||Number(animation.time)<=1)), "Reduced motion must not run sustained visual transitions");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    for (const observation of observations) assert.ok(observation.points.length >= 2, "Motion observation must include actual changing browser frames");
    await page.waitForTimeout(500);
    await page.waitForFunction(()=>{const video=document.querySelector('.player-stage video') as HTMLVideoElement;return video?.readyState>=3&&!video.seeking;});
    await writeFile(resolve(output,"settled-video-state.json"),JSON.stringify(await page.locator('.player-stage video').evaluate((video:HTMLVideoElement)=>({readyState:video.readyState,seeking:video.seeking,networkState:video.networkState,paused:video.paused,error:video.error?.message??null})),null,2));
    await page.screenshot({path:resolve(output,"motion-final-media-settled.png")});
    const video = page.getByLabel("作品 v5 预览", { exact: true }); assert.equal(await video.evaluate((item: HTMLVideoElement) => item.paused), true, "Version transitions must not steal playback");
  } finally {
    await session.send("Page.stopScreencast"); await Promise.all(writes);
    await writeFile(resolve(output, "motion-frame-index.json"), JSON.stringify({ format: "actual Chromium compositor frames, no interpolation or duplicated frames", frames: captured }, null, 2));
    await session.detach();
  }
}
