# DOC-008 当前仓库文档与 Evidence 适用性校正

本计划属于独立文档 Work Order，依据用户“修正文档，按照当前仓库”。现有 DOC-007 是可靠媒体实施记录，不能把本次跨 programme 的文档审计当作 P3 产品成功或另一产品计划；本计划仅登记文档校正及相称的只读/隔离验证，状态权威仍是既有 programme 与生成视图。

允许范围：AGENTS/README 的生命周期说明、docs/README 与 owning navigation、现有 UX 现行行为、docs/evidence/APPLICABILITY_INDEX.json、新 DOC-008 Evidence 与 assets、programme 仅适用性审计与真实 Debt，以及工具生成 docs/current 与 DOCUMENT_INDEX。禁止修改业务代码、合同、依赖、完成工具、历史 ADR/Evidence、项目数据；不提交、推送、合并、部署或云调用。不关闭 P3 或启动 P4，待现有 P3 人工确认工具授权处理。

步骤：核对旧全量工程账本、产品来源文件清单与当前源码差异；修正明确过期的文字；对受影响边界补离线检查，保存原始日志和来源绑定；逐能力决定是否可更新适用性索引。不支持的旧范围保持未完成，不以新摘要伪造通过。最后执行 docs:sync、docs:check 及文档治理检查。

基线：28条 evidence applicability；P3用户已明确人工通过，产品构建输入93f71c55…与运行产物来源校验通过，但正式包关闭工具尚未支持P3人工路径。旧全量工程账本指纹b4c1aa…不能直接作为当前源码通过。已有未提交变更全部保留。

执行结果：现行生命周期、删除、下载与人工接受文案已校正。核对70条旧工程日志哈希，审计37项变化及28项能力scope；当前22组离线复核21通过、1失败，另导入Host检查通过。Stage2/Stage3完整工程链通过；渲染媒体正确性在默认构图的满框/留边预期处失败，保留首次根因，不改实现或断言。14项经相应当前检查支持后追加适用性；14项涉及graph_compiler的范围不刷新，保留Debt。全局门禁blocked，当前记录见EVD-20261005-DOC-008-CURRENT-REPOSITORY，未推进P3/P4或Release。

最终校正：当前索引保存唯一现行绑定，旧索引快照与历史Evidence保留；README/AGENTS仅文案变化额外更新3项文档scope，不冒充产品重新验收。docs:sync通过，docs:check剩14项真实未通过边界，文档治理串行检查通过。中间并行共享锁冲突及重复索引命中旧值的失败日志保留，不回写为通过。完成本次文档范围，未通过的渲染验证留在各programme Debt，待授权实施包处理。
