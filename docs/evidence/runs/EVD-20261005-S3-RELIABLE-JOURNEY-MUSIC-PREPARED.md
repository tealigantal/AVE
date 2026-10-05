---
evidence_id: EVD-20261005-S3-RELIABLE-JOURNEY-MUSIC-PREPARED
work_package_id: WP-S3-RELIABLE-JOURNEY-001
date: 2026-10-05
repository_commit: 13a3ce07fa9b4a7d8a7bf9a338497d9a0cc214de
code_fingerprint: 8aaf3b63174a980e69bffa6d4ce10757592c33cfa1eab2957f9c73480610b0a5
scope_fingerprint: 6bf61493e2ef4d725bd59196001810c7e04f61ddc6f4ba98062c9d9912f8e957
capability_ids: [CAP-S3-RELIABLE-JOURNEY-001]
acceptance_ids: [ACC-S3-RELIABLE-JOURNEY-001]
result: blocked
---

# P3 配乐署名续验与修复准备

本记录属于执行 Evidence，续接用户“继续p3验收”，保留旧 Evidence、未提交工作、真实下载试听与遗忘已确认的范围。不推进 P4、Stage Exit 或 Release。用户明确批准扩展 P3 allowed_paths，加入 stage3-creative.ts 与 stage3-source.test.ts 修复实际发现的整片时长识别缺陷。

## 现有6080公开路径

Edge连接失败 nodeRepl.fetch request failed；内置浏览器成功打开原6080服务，未新增服务。公开操作仅使用此前自建项目6f5cc560-9cf8-4d18-ba81-6804f9bd19c9的moving-heldout.mp4与own-sky.png，不上传其他用户作品。档案仅查看项目，学习仍关闭。确认现有ave-split/creation-v1授权后自动配乐。

运行Desktop仍为sha256:616960a9ea5aeaea01c0138053be17aff4ecf7cc87cd9d06b8fd72b8f2bdc82a、产品输入51257e07adb77263ef8df0bd3344027fd854b9a17690beaecbf9259b6343a607。本节是这个旧运行版本的实际观察，不能证明本次新增源码已运行。

初稿v5为2秒，漏掉明确要求的3秒天空图片却显示可播放；未计为通过。只读源码验证“总长5秒”没有进入现有整片duration budget识别。公开纠正“成片总时长5秒、两镜头都必须出现”后得到v6：视频2秒、图片3秒、独立配乐5秒，128×72，双QC通过；浏览器video实际完整播放至5秒、ended=true、readyState=4、无media error。模型总run数从原2增至5，不伪装只发生一次调用。v0-v6均保留。见[只读项目身份](../assets/reliable-journey/p3-music-public-identities.json)、[公开界面](../assets/reliable-journey/p3-music-v6-public.txt)、[截图](../assets/reliable-journey/p3-music-v6-public.png)。初稿遗漏截图与首次错误仍保留。

v6选用Champ de tournesol / Loyalty Freak Music /目录记录CC0-1.0。音频原片hash为1cd0a1029eadfa6d1bb0b200019e8c4ad761582b78176a2c7750afa5ed5c694e；实际使用1105..221605/44100，gain -12dB，Timeline 0..150/30。署名文本、来源链接、目录许可字段及改动说明均已显示。选曲理由仍沿用首稿的“2-second duration”，这句说明不反映纠正版总长，不能用它替代实际使用清单。未新建学习或采用记录。

公开点击下载并确认后，Host写出0fcea87e-0566-4f2f-8d6e-189603dc3e53.mp4（114018字节）及.audio.json/.credits.txt；MP4 SHA256为5b252b3ef23aa7c0ab369f0f7f714121119772fbe1ea2bdca4e545fcd4240819，与音频清单output_hash一致。ffprobe实测H.264 128×72及AAC都为5秒，ffmpeg完整解码exit0。清单仅含实际使用的1首音乐，没有把试听候选塞进署名。浏览器确认保存Downloads/AVE-v6.mp4.audio.json，SHA256与Host清单613a42aa1d038d6559f3e29370fc3e58c73f538f0bebecf8d5e6d6d88eabc541一致。MP4与credits.txt的浏览器保存终态未确认，不能把Host落盘等同三个文件下载完成。首次download事件等待发生在产品确认之前而超时，属操作等待时机错误，随后完成确认得到清单下载。证据摘要见[账本](../assets/reliable-journey/p3-music-ledger.json)。本次音乐作品人工试听和最终交付署名阅读仍待用户反馈。

首次音频试听后切换视图触发下载取消，Host保留AggregateError中的AUDIO_LIBRARY_CANCELLED，但安全错误转换不识别AUDIO前缀，公开登记QUERY_FAILED。此失败保留，不归为网络失败。后续稳定视图试听未观察到可解码audio元素，因此不声明音频库试听接受。日志还出现CREATION_UI_STALE并发输入保护，未绕过修订或覆盖持久输入，不据截图“输入已保存”推断其他页面全部关闭。

## 新源码与准备镜像

安全错误转换保留AUDIO typed code与取消说明；Renderer仅在project.audio.preview入口将AUDIO_LIBRARY_CANCELLED视为控制结果，保持ok:false。Host公开dispatcher回归证明取消不写问题，AUDIO_RESOURCE_HASH_CHANGED仍写问题。增加真实Renderer竞态夹具断言，取消不会生成模态问题。原始原因和历史问题不删除。

整片“总长”现在进入原有RationalTime硬时长预算，无新Timeline或模型路线。实际完整请求绑定150ticks；回归拒绝观察到的2秒输出，接受5秒；镜头/片段/原片总长、约数、否定仍不能误判成整片硬约束。不把这一有界识别扩展宣称为任意自然语言零遗漏保证。

通过：workspace-issues.test.ts、typecheck（最终测试修订后再次通过）、contracts:check、web:host:test、renderer:workbench:test、stage2-workspace-renderer:test、stage3:generation:test、最终stage3-source属性测试，以及实际Electron隐藏窗口Renderer竞态工程检查。Electron检查不替代Windows人工验收。自建工程runner首轮缺少Worker资源、第二轮缺少正式CSS导致夹具失败；补齐原夹具依赖后第三轮通过，未放宽断言，三次日志均保留。

两服务新镜像已构建，输入0a2627aac0a962705373af1ca23cabdf2773bd5f8684cbb3e3eb54a746bb3d12；Desktop sha256:bb58bc59bf5a71de2217bbc328ecc39229822e8bf887d7c021f1d861e0b95fc3，Whisper sha256:e7f08663710c9d54756950100a7d40c3b8bfd0081756d24b4d270bb0379cdb40。构建前后输入一致，仅构建，尚未替换运行服务。依据AGENTS.md部署授权与输入保护规则，已请求用户保存关闭页面并授权同步；此记录发布时未收到答复。无提交、推送、合并、服务/卷清理或权限修改。

P3继续blocked：新镜像运行复验、完整浏览器三文件下载及此音乐作品人工听音尚未完成；全局历史Evidence applicability门禁仍未通过。不执行docs:complete，不为未复验历史能力补假通过。

## 发布后文档校验
最终docs:sync exit0，docs:check exit1：28项历史能力Evidence applicability（包含本次时长源码修订影响的既有能力）；无当前P3适用性错误、无latest fingerprint mismatch、无generated drift。相关diff --check exit0，源码指纹结束时仍为8aaf3b63174a980e69bffa6d4ce10757592c33cfa1eab2957f9c73480610b0a5。既有27项属于修订前记录，不冒充本次最终数量。
