---
evidence_id: EVD-20261003-S3-RELIABLE-ERROR-VISIBILITY
work_package_id: WP-S3-RELIABLE-IMPORT-001
date: 2026-10-03
repository_commit: 13a3ce07fa9b4a7d8a7bf9a338497d9a0cc214de
code_fingerprint: db2c7632b670755c63d69e27125bc0f13b097ae0a9971b2c5b104f0038e1f864
scope_fingerprint: 0f19617fa33ada9608ffce7820d29b0688f1ed5d1638e22014a63ad31443d5d9
capability_ids: [CAP-S3-RELIABLE-IMPORT-001]
acceptance_ids: [ACC-S3-RELIABLE-IMPORT-001]
result: blocked
---

# 错误停留的局部修复完成；P1整体仍待验

用户将本轮优先事项改为“错误显示太快，错误弹窗不要直接退出”的简单修改。
本记录不完成P1，不启动P2，不把局部修复或受控Electron检查写成Windows十步通过。

统一错误弹窗独立于通知/选择/后台成功，没有自动关闭计时；Esc阻止默认关闭，
必须点击“关闭错误提示”。错误记录按钮可以重新打开本页会话内的原错误。
API失败/传输异常、工作台操作、素材预览、播放器、音频库、缩略图、波形与复制错误
接入该显示路径；上传失败保留原对话框的逐项结果，手动关闭后继续。
全局未捕获异常/Promise拒绝也显示错误；Electron启动错误确认后不再自动app.quit。
此局部内存记录不代替P3要求的Host持久问题，刷新后的历史恢复尚未声明实现。

类型检查、Renderer边界、architecture、git diff --check通过。隔离实际Electron DOM
验证错误停留31秒，期间无关成功和Esc不关闭，点击按钮后关闭、历史重新打开保留
原详情。工程fixture不是真实用户操作。第一轮GUI进程的shell返回不能证明最后断言；
第二轮用Node等待子进程并保存实际结果。截图发现fixture HTML缺UTF-8导致模拟错误
中文乱码，第三轮补fixture charset并重新观察，不改旧截图/记录，产品HTML已有charset。
检查结果和截图分别为error-dialog-check-attempt03.json/png/log。

完整输入摘要e849be826bc1aa78b867badb39219ae80a99ac1116d9c4cfdeb96b0c840d3aac。
两镜像构建与当前运行身份：desktop
sha256:f2f5379d02633a217a6a9febf509225cc696325da69a6e124761479681ea588b，whisper
sha256:ea3e6798e84aa6167d4dd4e82757daff50150e008317dd35cd99a90b10925232。
本机工作台已更新，两服务健康；实际HTTP返回新错误组件、手动关闭文本且没有setTimeout，
不是仅凭HTTP200断言弹窗行为。whisper随共享desktop网络命名空间一起重建，模型缓存保留。

停机SIGTERM实际返回143，未获得期望的正常保存退出确认；PID1是configure启动器，
不能把该结果声称为Host已完成输入flush。未宣称最后未保存输入已保护、WIN-08通过或
无数据丢失实操通过。重建后五个原AVE命名卷仍在，两服务恢复；没有删除卷/原片/缓存。
后续完整恢复验收必须核对实际项目与最后有效输入，不能用健康状态替代。

docs:sync通过，docs:check仍因历史Evidence适用性失败而exit1，日志保存为
docs-check-error-dialog.log。未修改历史Evidence或适用性索引以伪造全绿。
没有提交、推送、合并或正式发布。P1整体及Stage Exit/Release保持未完成。

本次变更之前，新提供的九个真实来源在精确旧候选镜像51da113b…中的工程导入已通过，
七张JPG实际EXIF均为0，两MP4完整FFmpeg解码通过，内容重复/幂等/重开和原片SHA保持。
real-source-import-attempt01.json摘要
e0e73ef90e8acc2bbba1a4f93758caaf4ab63a4b5723020d00d53e39314ef05c，
real-video-decode-attempt01.json摘要
88a157d67f65bc923f25bfaab0324229d75cc0f449488ab45f1acfb7639bb597。
音频PTS与nb_samples显示实际正负不连续，不将完整解码通过推断为严格采样连续；
P2仍需核验edit list、解码时间及严格边界，真实间隙不能吞掉。
私有文件名/原路径只存在本机获准证据目录，公开记录用编号与摘要。
