# Stage3 Skill Catalog runtime

## Purpose / Big Picture
将用户提供的 64 内容单元接入当前真实 Creation Planning，不重设计产品或扩展底层 editing 家族。唯一内容源为 `AVE_Creative_Skill_Catalog_Source.md`；完整字节与 SHA-256 保留在内置知识目录。

## Context and Orientation
起始无 active package；历史 WP-S3-INTEGRATION-001 已 completed。本次新增依赖它的 WP-S3-SKILL-001，以同 programme 的 CAP-S3-SKILL-001 / ACC-S3-SKILL-A-F 明确本次增量边界；既有 C1–C9 作为回归，不重新要求阶段 Exit。现有 Stage2 CreativeSkillDefinition/SkillEvaluation 和 Stage3 三轮 source-measurement Planner 分离，起始 Skill 尚未进入主创作链。初始工作区合同 examples 有非本任务改动，保留。

## Plan of Work / Concrete Steps
1. 保留原始 Catalog，映射完整正文和版本 pin，明确旧合同冲突。
2. 在现有 Planning 三轮内选择 Skill → 加载所选正文并测量 → 提交绑定具体字段的决定。不开独立 Skill 模型调用。
3. 用组合 fixture 验证 A–F、失败语义、权限/硬要求/请求/Profile/Skill/Trend 优先级、绑定和消费者。
4. 纯逻辑稳定后少量真实 Planner，再 Preview/Master；最终源执行完整门禁。

## Validation and Acceptance
最小相关 fixture 与 Planner integration；最终 contracts/typecheck/architecture/docs/check/acceptance:final:synthetic。技术通过不代表真人听评。真实联调输入/配置缺失应具体记录，不能用 fixture 替代。

## Idempotence and Recovery
知识版本不可变；协议失败不重试、不换模型、不过滤非法项。原有 Host 请求修订/模拟/验证/CommitPlan 继续拥有写入权。无需迁移或改用户数据库；失败不改变 Timeline。恢复须保留根因和调用账本。

## Interfaces and Dependencies / Artifacts and Notes
CreativeSkillDefinition、SkillEvaluation、creation-planning exchange、CreationDecision/CreationPlan、Host 与现有 Command 链。必要合同扩展必须同步 schema、生成物、验证器、实际消费方和测试。范围仅此包；不提交/推送/合并/发布，不启动下一阶段。

## Progress
- [x] 定位主运行时和治理边界，登记 scoped package。
- [x] Catalog 和通用 Runtime。
- [x] Planner/Host 接入与代表测试。
- [x] 真实模型/媒体与最终门禁。

## Surprises & Discoveries
源 ID 为 S01 等大写格式，现行 definition 合同只允许小写；现行 evaluation 的 blocked 混合证据和上下文缺口；源正文不具有结构化 evidence/capability 字段，不能编造其内容。

## Decision Log
保留原文，不生成每 Skill 的 TS 实现。选择和证据/能力判断在固定上下文内由模型提出，Host 校验 ID、版本、证据、能力与效果字段，拒绝协议破损。最终采用必须可追溯至具体决定字段。

## Outcomes & Retrospective
真实公共口播素材：3 个物理 Planner 调用选取 S01/E01/E02/V04/A01/W03/E05/S09，最终进入 Host Commit，8 秒/两个镜头的 Preview/Master 均通过原 QC。A–F 为纯 fixture 的传输、决策、编译和失败语义验证，不能冒充真实模型创作质量。最终完整 check 与 acceptance:final:synthetic 已通过；无 Stage Exit/真人听评/提交推送声明。

真实联调保留的失败：缺少 grounded evidence、非法 effect JSON pointer、与实际 caption 不相关的证据、空 color 误绑定，均被阻断而未过滤/修复/换模型。校验已从仅提示强化为 exact pin + 与测量/声明 executable capability 相关的字段 enum，仍由 Host 校验最终真实值。中间 full check 在新真实失败需要源修复时停止，不能算最终通过。

最终验证源指纹 6a33c8c47a3ff622aa99512fe5276797bad90fc28f5868ef94d1c3c41bdd636a。原系统 Pillow 版本不符合固定依赖的失败完整保留；改用现成隔离 Worker 12.3.0，原失败项及完整门禁通过。同一真实 Timeline 无模型重调再编码、哈希一致且 Master QC passed。最终记录见 [EVD-20261001-S3-SKILL-FINAL](../evidence/runs/EVD-20261001-S3-SKILL-FINAL.md)。没有真人 Stage Exit、远程 CI 或下一阶段声明。
