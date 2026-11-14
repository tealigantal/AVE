# WP-S3-RELIABLE-BASELINE-001 — 可靠性基线与真实交互验收门槛

用户于2026-10-03授权执行完整DOC-007（历史计划已移除）。
本包是P0工具/基线，不宣称产品实操完成。精确路径与required tests以manifest为准。

交付：保护既有数据与四项变更；完整构建输入/运行文件/两服务身份采集；真实交互记录校验，
接入docs:complete/check与CI现有check链，失败保持programme零写入。记录缺步骤、未运行、
失败、身份漂移、失效证据、错误执行者/时间段和恢复缺失必须拒绝。机器只证明格式/身份和
门槛执行，不代签真实观看听音或主观接受。已核验专用Windows控制工具可列出Edge窗口；
文件选择器、下载打开和有声录屏能力仍按步骤验证，不转为自动通过。

本机完成事务强制实时核验；先使用
`node scripts/docs/interaction-acceptance.mjs WP-ID RECORD-PATH RECORD-SHA256 RECEIPT-PATH`
生成不可覆盖的公开完整性收据，Evidence同时绑定record/receipt路径与SHA256。
私有证据使用`external:`相对引用和显式`AVE_INTERACTION_EVIDENCE_ROOT`；不上传原片。
CI只读校验收据、当前源码/完整输入、记录内运行摘要链及构建出处，独立观察仍是必要门槛。
提交相同字节导致的HEAD/diff布局变化保留为审计出处，不当作内容漂移；内容改变继续拒绝。

构建工具`node scripts/docker/build-reliable.mjs`为两镜像记录完整输入label，并检查构建期间输入未变。
desktop编译包保留source/output摘要；验收核对实际运行文件，包括两服务启动及模型配置映射。
本包只交付工具与回归，不执行镜像构建/重启；现有旧镜像缺来源label/provenance必须拒绝产品完成。

退出：对应恶意记录、构建身份完整性、完成事务零写入与既有文档治理回归通过；新EVD绑定
当前工具源码与scope；缺当前问题样本身份记录明确待验，只阻断对应P1/P2真实案例。历史
docs:check基线失败保留，后续受影响仓库回归后追加Evidence再恢复适用性，不改写旧记录。

禁止：产品行为/合同/数据库修改、云调用、容器重构或重启、私有媒体外传、Git出版；
不修改四项已有文件，不重写旧Evidence或历史ADR。本包后的产品工作包按唯一active规则接续。
