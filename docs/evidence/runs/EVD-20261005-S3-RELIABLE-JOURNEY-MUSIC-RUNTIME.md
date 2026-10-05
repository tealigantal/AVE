---
evidence_id: EVD-20261005-S3-RELIABLE-JOURNEY-MUSIC-RUNTIME
work_package_id: WP-S3-RELIABLE-JOURNEY-001
date: 2026-10-05
repository_commit: 13a3ce07fa9b4a7d8a7bf9a338497d9a0cc214de
code_fingerprint: d55645a47bd8f0c8991f3e939da33fb1120ea37b0c4832f576a7fabd7b3399b8
scope_fingerprint: 3e85945d3f9ed638106a3385300fa684de78abc945e1cbb25b9b8133194e5892
capability_ids: [CAP-S3-RELIABLE-JOURNEY-001]
acceptance_ids: [ACC-S3-RELIABLE-JOURNEY-001]
result: blocked
---

# P3 配乐、署名、同步及真实下载续验

本记录续接 MUSIC-PREPARED，属于执行 Evidence。用户明确允许同步既有 desktop/whisper，并批准加入浏览器 entry 与对应下载测试。未提交、推送、合并、Release 或推进 P4；历史 Evidence 与原有问题均保留。

## 已运行的修复

首次同步使用准备镜像，来源与运行输出 provenance 校验通过。真实 6080 工作台重新打开项目 6f5cc560-9cf8-4d18-ba81-6804f9bd19c9；v0..v6 与原输入保留，模型调用计数仍为5，未新增云生成。v6实际播放到5秒，两个画面分别2秒、3秒，配乐5秒。运行模块解析“先放视频2秒，再放图片3秒，总长5秒”为minimum=maximum=5/1；此前源码回归已验证2秒输出拒绝。这是运行模块与已有作品检查，不冒充修复后重新云生成首稿的验收。

Revelation实际下载试听后点击停止，保留原有4条问题，无新失败弹窗；Host日志保留 AUDIO_LIBRARY_CANCELLED 根因，外层日志前缀 QUERY_FAILED 不是最终安全错误码。停止后“正在获取并验证音频”文案仍残留，不能将文案当作当前任务仍执行的证明。Champ de tournesol真实试听生成15秒audio，readyState=4，通过实际键盘播放到currentTime=duration=15、ended=true，无媒体错误。自动播放进度不能替代人的听感确认。

## 浏览器下载缺陷与修复

自动批量三下载在本轮再次仅保存audio.json，故未接受，保留其失败事实。浏览器entry已改为三个保留的显式链接，每个文件由独立用户动作触发，可重试，不虚构实际保存确认。对应测试执行真实entry模块，验证无自动下载、三条链接绑定正确、早先点击不删除其他链接、关闭后清理，以及无下载响应不打开弹窗。

重新构建并同步既有两服务后，真实工作台公开导出v6，分别点击成片、音频清单、音频署名；浏览器确实保存：

- `C:/Users/24179/Downloads/AVE-v6.mp4`，114018 bytes，SHA256 `5b252b3ef23aa7c0ab369f0f7f714121119772fbe1ea2bdca4e545fcd4240819`。
- `C:/Users/24179/Downloads/AVE-v6.mp4.audio (2).json`，2946 bytes，SHA256 `613a42aa1d038d6559f3e29370fc3e58c73f538f0bebecf8d5e6d6d88eabc541`。
- `C:/Users/24179/Downloads/AVE-v6.mp4.credits.txt`，383 bytes，SHA256 `e4cdb49ac03740ad1b7eceafd7224840c97d82fbac4cbdff4394e38ee581f2d8`。

三个保存文件逐字节哈希均与对应Host导出相同，清单绑定v6、MP4output_hash、实际使用的单项配乐；包含来源、许可、使用范围与修改信息。最新export_id=515a1e11-5621-4609-bb4d-7acf62cff663。对应Host同哈希MP4经ffprobe确认H264128x72与AAC均5秒，ffmpeg完整解码exit0；不以Host文件写入记录代替上述浏览器下载事实。

## 最终运行身份与保存边界

build_input_digest=`93f71c55a89dcf04ae2c7efcb9ae943a87089da8bdbac3e50a894259630996f9`。
desktop image=`sha256:526380e53fd84a201d2267ee5a4da888b488e7d365b4479f40463604f31fdd35`；whisper image=`sha256:22fca8485b793c0ade21d7815efc0b2138d583529a240f44091a9c410956c06a`。currentBuildIdentity及assertRuntimeBuildProvenance通过，覆盖来源输入及运行产物。最终两服务健康仅表示服务启动，不代替以上交互证据。两次同步前后所有AVE挂载类型、源、名称、目的地、读写模式一致；gp/gym容器ID未变。

## 验证与未接受范围

本次浏览器entry最终改动：`node --experimental-vm-modules tests/property/browser-download.test.mjs`、typecheck、contracts:check、web:host:test、renderer:workbench:test全部exit0。VM测试首次缺dynamic import callback失败，补齐真实模块入口依赖后通过，未削弱断言。时长/取消修复的此前专项与Renderer真实工程夹具检查见MUSIC-PREPARED；源未变，不重复无关全量。

资产均在 `docs/evidence/assets/reliable-journey/`：p3-browser-download-test-final.log，以及p3-download-{typecheck,contracts,web-test,renderer-test}.log；其余p3-download-前缀的build.log、sync.log、runtime-identity.json、project-final.json、verified.json、ffprobe.json、decode.log、containers-final.txt、mounts-final.txt、public.png、final-work.png/txt、duration-runtime.json。首次运行与取消日志为p3-music-runtime-*。原自动下载残缺事实及准备状态不覆写。

仍保留人工配乐听感未确认、修复后原请求新云首稿未重做、旧版本选曲理由中2秒说明陈旧、停止试听残留状态文案，以及全局历史能力Evidence适用性失配。不得将本次音乐下载链路接受提升为完整P3、Stage Exit或Release。最终docs:sync/check结果记录于执行计划及本轮日志。

最终docs:sync exit0；docs:check exit1，共28项历史能力Evidence适用性失配，没有P3当前适用性、代码指纹或生成文档漂移报错。最终镜像v6再次实播到5秒、ended=true、readyState=4。运行时长断言第一次把合同字符串分数误当BigInt而失败，核对真实类型后以精确字符串5/1断言通过；未改生产代码或放宽时长值。
