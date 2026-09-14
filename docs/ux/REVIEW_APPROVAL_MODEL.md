# Review and Approval Model

Stage3 请求授权、草稿保存、用户采用、最终导出和对外发布分开。用户“开始制作/修改”在素材、目标、预算、数据和保护范围内授权可撤回草稿，普通修改不再逐级批准 Story/Commit。Host 保存真实请求/actor/version，内部校验不能伪造人审。越素材/外部数据/费用/保护范围才再次询问。

当前 Stage2 代码仍按 Contract/Story/Edit/Delivery exact approval 执行；S3-01/04/05 同步替换合同、Host 权限和 Main/Renderer，不能只去掉弹窗。新草稿已保存不代表用户采用；查看旧版不代表恢复采用；导出不代表发布。见 [ADR-0028](../decisions/ADR-0028-stage3-request-drafts-and-local-profile.md)。

Human review is mandatory for creator identity, sensitive representation,
material factuality, subjective story quality and final delivery. Machine
checks remain mandatory for contracts, provenance, versioning, render semantics
and QC.
