# Test Strategy

## Evidence ladder

| Layer | Proves | Does not prove |
| --- | --- | --- |
| schema/contract | accepted and rejected data shapes, compatibility | runtime ownership or useful output |
| pure domain | deterministic rules, invariants, property ranges | persistence or media execution |
| Host integration | authority path, atomicity, version conflict, idempotency | encoded semantic correctness alone |
| storage/reopen | durable last-valid state, migration/recovery | subjective creative quality |
| Worker/backend | plan validation and media execution facts | project approval or ownership |
| synthetic acceptance | deterministic end-to-end regression | representative real-media quality |
| real-media acceptance | encoded output, identity, stream and observable semantics | subjective acceptance unless viewed |
| human evaluation | picture, audio, pacing, story, trust, usability | broad generalization beyond reviewed artifacts |

## Required dimensions

Every capability slice covers success, invalid input, stale/version conflict,
unsupported capability, zero-mutation failure, idempotent retry, persistence and
reopen, provenance, and architecture boundary. Media changes also cover Preview/
Master semantic equivalence, encoded probes, QC, source identity, and retained
artifact review.

## Fixture policy

Fixtures state origin, license, consent, expected content, stream facts, and
retention. Real media remains outside Git when required; repository Evidence
records hashes and non-sensitive provenance, never private absolute paths.

## Status and anti-gaming

Test names use the exact bounded behavior. A marker string, filter plan, mock,
or output-file existence check cannot substitute for observable semantics.
Passing tests may set `tested` only through governed matrices and Evidence;
`accepted` additionally requires its specified real-media or human gate.

## 本轮真实交互门槛

DOC-007（历史计划已移除）定义本次自动矩阵、
Windows十步、逐项记录字段和身份失效规则。P0实现记录完整性/身份校验并
接入完成命令与CI现有check链，工具回归与产品实操分开记录。后续产品包
需要其负责的真实步骤，最终P5需要全十步与独立复核。失败、未运行、缺步、身份
漂移不能完成；负面案例须失败明确、持久状态正确且恢复可用才通过。

源码/镜像变化使受影响实操失效，跨模块后重跑完整核心旅程，首次失败与修复复验
用新记录关联。CI不从JSON或录屏存在推断真实操作成功；文件选择器、真实授权、
下载文件打开和听评不能用后台调用或mock代替。工程、实操、用户主观接受、
Stage Exit和Release分别记录，私有原片与连续录屏遵循既有保护政策。

本机完成强制实时验证原片、录屏、Host状态、当前两服务与编译出处，生成公开脱敏
完整性receipt供CI读取。CI核对当前源码/完整输入与收据绑定，重算运行摘要链；
不要求CI运行私有模型/容器或访问私有媒体，也不从收据推断实际动作完成。
相同内容提交后的HEAD/diff变化保留出处；字节/模型/输出或镜像变化仍使验收失效。

## Current results source

2026-10-04用户明确将真实Windows操作改由本人执行，Agent只运行工程检查并给出实际操作流程，以人工反馈作为实际操作是否通过的权威。P1新增明确用户消息确认路径，绑定已验收产品输入与运行身份、固定人工流程和当前工程日志；不要求用户补录屏或虚构逐步时间。工具已注册P1与P2；P2绑定现有九项素材、图片缩放恢复、完整视频声音/跳转/全屏、独立音频及切换释放、关闭重开五项人工流程和WIN-01/03/08。后续产品包promotion时按同一人工负责原则登记其具体流程和绑定，不继续要求Agent操作Windows或用户重复已经通过的步骤。未执行、失败、来源不明确或受影响产品身份变化仍不能完成；工程、人工实操、主观接受和Stage Exit仍分别记录。

Do not copy live pass/fail lists here. Use programme matrices, generated
[`docs/current/VALIDATION.md`](../current/VALIDATION.md), and immutable Evidence.
