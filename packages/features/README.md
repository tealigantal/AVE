# Feature packages

本目录按业务能力划分 Feature 包。每个包只从 `src/public.ts` 暴露跨边界合同；`commands/`、`queries/`、`use-cases/`、`policies/`、`validators/`、`prompts/` 和 `ports/` 是包内分层边界。

Feature 之间不得直接导入对方内部实现。跨 Feature 协作由 Project Host 编排，Core 只提供纯领域对象和算法。当前 R15 先建立可执行边界；业务迁移必须在后续独立切片中以测试证明，不以目录存在代替集成完成。
