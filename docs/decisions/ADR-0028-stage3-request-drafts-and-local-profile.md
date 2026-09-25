# ADR-0028 — Stage3 请求授权、可撤回草稿与本地用户档案

## Status / Date

2026-09-14：Stage3 目标设计决定，待候选 S3-01/03/04/05 实施。不是运行授权已切换，也不回写 ADR-0019/0021/0022/0023。所属决策层，由 [ADR Index](README.md) 导航；原 ADR 描述 Stage2，不能改写为新决定。

## Context

用户已决定直接制作主初稿、制作中调整、普通请求直接生成可撤回新草稿，以及一次授权范围内主动学习。当前逐对象 human approval、固定候选和 reference-only 桌面操作无法承载这些目标。必须改变授权和状态对象，不能仅删按钮。

## Considered Options

保留逐 Story/Edit 审批会违背默认旅程；伪造审批或赋予模型通用提交能力破坏信任；另建多 Agent 调度平台/云记忆没有本轮必要性。推荐在现有 Host/Job/Storage 内加入请求授权和修订控制，并在同一桌面主进程管理独立用户档案存储。

## Decision / Rationale

1. **请求授权**：Host 经可信用户输入通道保存不可变授权，包含请求 ID、用户/项目、素材身份集合、目标与约束、获准数据及外部模型范围、预算、保护集、策略版本、有效期/撤销代次。模型候选只引用授权，不能创建授权。后续普通要求在授权内创建 successor intent revision；超素材/外传/成本/保护范围重新询问，并明确新增的范围。
2. **草稿与采用分离**：草稿也是 Host 原子保存的真实 Timeline 版本，有 parent、base 和 request revision；采用指针和播放指针独立。内部通过校验不等于用户接受，草稿保存不等于最终导出，导出不等于发布。用户发起“制作/修改”是原始授权事实，永不生成虚假 Story/Commit 人审记录。
3. **并发控制**：Host 给每次要求变化分配单调修订号，候选固定 base Timeline、request revision、authorization generation、profile snapshot 和依赖摘要。提交事务内重查当前修订、权限/锁及 base；旧响应只能标 superseded 或保留为旧候选，不能覆盖新版本。保留工作须证明输入依赖未变，不全量盲目重跑，也不修改版本号伪 rebase。
4. **用户档案所有权**：新增本地 User Profile Store 由 Electron Main 组合根创建的单一 Profile Repository 所有者读写；复用现有 SQLite 依赖和事务能力，无新进程/云服务。该所有者只写用户库，不打开 `project.sqlite`。Project Host 仍是唯一项目 SQLite 写入者，经窄端口请求获准快照。不同项目 Host 不各自写用户库。CLI 如接入，必须取得同一用户库排他锁，不能形成第二写主。
5. **跨库一致性**：不用跨库假原子事务。项目提交后的学习事件带 project/event/content identity，档案写入以该键幂等；写档案失败不回滚既有作品，不称学习成功。用户档案生成递增 consent/deletion generation；Host 在上下文装配及提交前获取有效性凭据，过期/删除阻止新使用。项目保存仅固定最小获准快照和来源引用，历史保留不能成为重新学习来源。
6. **编辑链保留**：Host-owned semantic adapter → CommandEditIntent → CommandEditIR → simulation/validation → CommitPlan/原子提交。RationalTime/PTS，目标无关 Semantic Render Manifest + Preview/Master 各自 Graph/ExecutionPlan 不变。请求权限不能放松媒体身份和保护范围。

## Consequences / Verification

S3-01 实现授权/草稿/修订，S3-03 实现用户档案写主、撤销失效和跨库幂等，S3-04/05 接生成及 UI。测试原请求重放幂等、旧响应、两次反向修改、取消后结果、手动改动、删除与提交竞态；必须无错误提交。采用/播放/导出版本分别可追溯。详见 [C1–C9](../product-intelligence/CREATIVE_QUALITY_BENCHMARK.md)。

## Migration

实施时一次切换相关 Creative Contract、Story/semantic Intent、permission policy/approval、workspace/IPC 请求和草稿持久化合同；精确 Schema 身份、examples、生成绑定、Host validator/reader、Main 可信确认、Renderer、测试、当前规范同步。仅经 codegen 更新生成物，不保留旧 generator/双 reader/隐藏 adapter。既有不可变历史不伪造请求授权；不支持的旧项目格式在写入前明确拒绝，保留原文件，不静默升级、不删除用户项目。本轮没有执行数据迁移。

## Rollback

失败事务回滚至已有提交；取消仅清理本次尚未发布的派生产物，保持同一文件身份校验。开发代码回退须同时回退相同接口家族，不能用旧 reader 打开新格式后补值。必要时使用独立副本验证旧基线，用户原项目和素材不被覆盖。


### 删除与提交的线性化

同一主进程的 Profile Repository 用一个用户级串行队列协调撤销/删除和最终使用；不引入租约服务。Host 必须先进入该队列，再取得项目提交锁，在短临界区内重查 consent/deletion generation 并完成项目原子提交，随后释放；固定锁序是用户授权协调 → 项目提交锁。外部模型/长渲染绝不持锁。删除在同一队列提高代次并完成禁用登记后才向用户确认“未来不再使用”；若提交先完成，它是删除前的历史版本，若删除先完成，旧快照的提交必拒绝。崩溃后以已提交数据库记录恢复，不凭内存许可复用。

同样在外部请求发出和学习登记的最后边界串行核对；已发出的远端请求不能追回，删除后其返回不得新提交。档案内容清理可稍后完成，期间使用已阻断。C6/C9 明确验证“读取旧代次 → 删除先确认 → 旧候选提交”的交错，以及“提交先完成 → 删除确认”的合法顺序。
