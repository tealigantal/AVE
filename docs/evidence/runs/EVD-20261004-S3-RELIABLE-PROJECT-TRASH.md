---
evidence_id: EVD-20261004-S3-RELIABLE-PROJECT-TRASH
work_package_id: WP-S3-RELIABLE-IMPORT-001
date: 2026-10-04
repository_commit: 13a3ce07fa9b4a7d8a7bf9a338497d9a0cc214de
code_fingerprint: 88d1b91ab6c2aaaa6eefa435d23e6a741fb5433f082bdc7cc4ef5992903945a8
scope_fingerprint: e1934d0d1aa1768fc5bed1ddbd102559bb49edb8aacbb3f4a0a1b3cbbf33c690
capability_ids: [CAP-S3-RELIABLE-IMPORT-001]
acceptance_ids: [ACC-S3-RELIABLE-IMPORT-001]
result: blocked
---

# 作品页删除的局部修复；完整P1未完成

用户反馈九项真实导入成功，随即报告作品页无法删除作品。实际代码缺少删除入口和命令。
在同一活动P1追加此局部范围，不启动P2–P5。作品页近期卡片新增独立删除按钮，确认后
移入持久回收站、提供恢复。旧version1导航索引兼容读取，非法标记仍拒绝、原子保存失败
不隐藏卡片；重复删除/恢复幂等。Renderer只传不透明ID。原片、项目目录、SQLite、导出
全部保留；不宣称释放磁盘空间。手动选择目录成功打开可恢复导航入口。

当前项目删除先等待所有窗口输入保存确认，再由Host关闭，最后保存导航墓碑；保存失败
保持未删除状态并报错，关闭后登记失败明确提供重新打开/重试。其他项目删除不关闭当前
项目。恢复不自动打开、不自动重试模型。取消保留卡片。错误接入已有可截图弹窗。

工程验证通过：stage3-recent-projects.test.ts实际Host/SQLite覆盖取消、当前/其他作品删除、
保存确认失败阻止删除、回收站重读持久性、拒绝直接打开回收站、恢复、幂等、严格ID输入、
受控存储失败不改变索引、旧索引/来源身份/会话失效的既有回归。其他项目数据库字节保持。
stage3-desktop-lifecycle.test.ts、typecheck、architecture、renderer:workbench:test、web:host:test
通过。隔离实际Electron DOM验证按钮调用不透明ID、取消保留卡片、删除后恢复行、恢复
后卡片、失败后卡片和持久错误均存在，见project-trash-dom-attempt01.json/png。该受控
fixture不是真人或实际生产项目删除验收；没有删除用户现有作品作为测试。

完整构建输入摘要：397fe2e419a46081cb00a75b9df18328bca72249bb0df0d5dac93b682f0344c4。
候选构建和当前本机运行镜像：
desktop sha256:4fcae4cd3840eb66ac48859d7ca1f57964ae3be924aec68f3d552556658b0df8
whisper sha256:03e3a76b75cadc2fb540e06937e12cf121413cf92ad5a07fb246d461b4345ed7
两服务健康；实际HTTP内容核验已提供删除和恢复处理器，不能仅从HTTP200推出行为通过。
五个原AVE数据卷保留，四项保护文件SHA均与基线相同。

本轮更新前向精确Node Host子进程发送SIGTERM，期望浏览器保存确认后正常退出；实际
输入flush十秒超时，最终exit1。首次失败保留：未收到当前浏览器保存确认，不能声称最后
未保存输入已落盘。Host/SQLite关闭后两服务已恢复；该风险不计恢复实操通过，也不改写
上轮exit143记录。只保留已持久化内容的证据，最后未保存输入需真人核对。

必需docs/check的历史Evidence适用性失败继续如实记录，未改写历史Evidence或适用性索引。
本记录result blocked表示完整P1与Windows WIN-01/02/08尚未完成；用户反馈和工程测试不
替代完整真实交互记录或故事、美学、听感接受。Stage Exit/Release保持未完成。
没有提交、推送、合并或正式发布。新代码改变后受影响旧产品验收不得复用为当前通过。

最终补充：docs:sync通过；docs:check exit1，完整pnpm check也在docs:check同一历史Evidence适用性门槛退出1，后续串联检查未运行。两份首轮日志为project-trash-docs-check-attempt01.log与project-trash-repository-check-attempt01.log。最终architecture/Renderer边界/git diff --check通过，重新采集构建输入摘要与两服务当前标签仍完全一致。
