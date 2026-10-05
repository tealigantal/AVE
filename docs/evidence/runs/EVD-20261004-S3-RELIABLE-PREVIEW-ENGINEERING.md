---
evidence_id: EVD-20261004-S3-RELIABLE-PREVIEW-ENGINEERING
work_package_id: WP-S3-RELIABLE-PREVIEW-001
date: 2026-10-04
repository_commit: 13a3ce07fa9b4a7d8a7bf9a338497d9a0cc214de
code_fingerprint: f7a992b62faa590b4c17ba90e538027ca2d7911bbbe21ca857eb97a434ca889d
scope_fingerprint: 434e94808a8fc379b66664eb31d4d4d7509ec7709c6161b6a3288f7027ff17e5
capability_ids: [CAP-S3-RELIABLE-PREVIEW-001]
acceptance_ids: [ACC-S3-RELIABLE-PREVIEW-001]
result: passed
---

# P2完整素材浏览工程验证

本Evidence只确认当前源码的工程验证，不确认实际界面、听音、主观接受、Stage Exit或Release。完整check下游70条命令逐项exit0，开始/结束指纹一致；账本 docs/evidence/assets/reliable-preview/full-ledger-attempt03.json，SHA256 cd35a4d8ca9d0fc26aa8de009a413b8b329b77853cf244b7bf5b3b515946e183。P2专项账本 docs/evidence/assets/reliable-preview/focused-ledger-attempt04.json 逐命令日志有SHA256。docs同步/检查由收尾独立执行，不冒称首次失败的pnpm check调用通过。

Worker真实完整图片/视频/独立音频派生、透明度/方向、18秒尾部解码、Host来源/派生摘要、Range/HEAD/416、跨会话拒绝、取消先于请求、晚到结果、未读取流关闭、并发释放、来源替换、波形单独失败与问题重开持久化均通过。Browser认证流和Electron受控协议适配通过；Electron实际Windows播放仍待人工。严格分析和配乐保持独立，浏览源时间映射明确blocked。AAC内部间隙仍返回MEDIA_SAMPLE_AUDIO_GAP，不能用浏览结果形成精修边界。

新编译镜像对九份既有获准来源重新转换/整段解码：七张图片和两段视频均通过。两视频源与产物时长分别37.967秒、32.856秒，真实音轨存在，尾部解码通过；严格链仍保留MEDIA_PREVIEW_FAILED及MEDIA_SAMPLE_AUDIO_GAP根因。见real-source-report-attempt01.json，原片SHA和字节数未变。这不是界面播放/听音验收。

两服务构建attempt03通过，输入摘要0fa8b7bdfc5850c3d47d5cb779422a4d2aacf3e590f06d736b9787a4ebaa5b9b。编译镜像842个来源/700个运行输出逐项哈希核验通过，见image-provenance-attempt02.log。运行替换需既有工作台真实保存确认，不能强制关闭；实际交接运行状态另见HUMAN-PENDING记录。

docs:check收尾首次因当前P2代码与已完成P1人工记录指纹不同被拒绝，closeout-docs-check-attempt01.log保留。修正仅对completed/accepted包的static审计校验不可变的历史构建；live完成、未完成包static仍比较当前构建。新增反例验证当前漂移仍拒绝新完成、历史来源篡改/工程指纹篡改仍拒绝，Evidence header与人类记录指纹必须相同。P1历史反馈不被重写，不被当作当前P2接受。该治理修复后再次执行完整工程链。新代码指纹的变化只来自文档验收模块及其反例测试；产品输入、来源和编译输出身份保持不变，image-provenance-attempt02.log按最终输入再次逐项核验。

首次失败和修复日志保留：Node纯函数测试静态导入Renderer API导致缺window，改为需要交互时动态导入；新审计读取所需SQLite all类型缺失，补齐真实类型；Windows handle/path设备ID差异按既有inode规则处理且保留摘要/大小/时间；旧Matroska间隙fixture先触发CREATION_MEDIA_BOUNDS_REQUIRED，改用保留真实间隙的AAC验证预期严格失败。full-attempt01/focused-attempt01/02及build-attempt02失败均保留，修复后最终源码复验通过。

历史Evidence未重写。完整回归通过后才刷新适用性索引，关联本Evidence及逐命令账本；该关联不能扩大历史人工接受。用户数据与其他服务保留，无提交/推送/合并/发布。P2工作包仍blocked，等待新构建的WIN-01/03/08反馈。

## 最终文档结果

closeout-docs-sync-attempt02、closeout-docs-check-attempt02、closeout-docs-sync-check-attempt02实际exit0，git diff --check exit0。P2未执行docs:complete；包blocked和人工Debt active由生成状态体现。最终日志哈希与保护核验见final-verification.json，非人工确认记录。
