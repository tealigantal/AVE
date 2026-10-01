# AI Agent Permission Model

## Purpose, authority and status

This document consolidates AVE's permission boundary for future agent-like
automation. It does not introduce an autonomous agent, ACL service or alternate
approval state machine. Enforcement remains in Project Host, Contract Runtime,
Project API, Timeline validation, RenderGraph resolution and delivery gates—not
in model self-restraint.

Canonical boundaries are defined by
[System Architecture](../architecture/SYSTEM_ARCHITECTURE.md),
[Creative Intelligence Runtime](../intelligence/CREATIVE_INTELLIGENCE_RUNTIME.md)
and [Review and Approval Model](../ux/REVIEW_APPROVAL_MODEL.md). Human approval
cannot waive hard engineering, evidence, privacy, rights or source-identity
invariants.

## Actors and authority

| Actor | May produce | May persist/authorize |
| --- | --- | --- |
| Renderer / conversational UI | user requests, selections and approval actions through a white-listed Project API | no project-state authority |
| Model Gateway | contract-validated creative candidates and audit metadata | no persistence, approval or execution authority |
| Worker Host | protocol-bounded media/analysis candidates and execution results | no SQLite, Timeline, approval or project-stage authority |
| Feature/Core logic | pure proposals, validation and deterministic compilation results | no direct SQLite write; no cross-feature orchestration |
| Project Host | bounded context, validated artifacts, commands, approvals, jobs and transactions | sole project-state/SQLite/Commit authority |
| Human user/reviewer | Contract, Story, Edit/Commit and Delivery decisions within policy | explicit, scoped and version-bound approval actor |

An "agent action" is therefore a request or candidate routed through these
boundaries. It is never ambient access to files, media, database, shell or the
Timeline.

## Allowed autonomous actions

These actions may run without case-by-case creative approval only when an
approved project policy authorizes the exact scope and Project Host enforces the
request:

- validate metadata already available through a white-listed Project API;
- request Worker probe, fingerprint, proxy, transcript or analysis candidates;
- extract/index approved metadata and generate evidence candidates;
- generate alternative Direction Cards, Story candidates or Edit Intent drafts;
- run deterministic schema, source, capability, rights/privacy and staleness
  checks;
- generate QC measurements, diagnostics and repair suggestions;
- rank/retrieve exact-version Skills or knowledge snapshots within consent;
- estimate cost/latency and explain blockers or missing evidence.

"Metadata extraction" does not grant direct original-file access to the model.
Project Host checks session, privacy, identity and policy, then schedules Worker
with the minimum required inputs. Candidate results require validation before
registration.

## Stage3 请求授权与再次询问

Stage3 的制作/修改请求授权范围内的草稿生成、内部 Story 选择与提交，无须另造逐级人审。当前 Stage2 仍执行原 exact approvals，S3-01/04 切换合同和消费者。再次询问适用于：
- 解除明确保护、改变未经请求授权的人物呈现或硬约束；
- 扩展敏感呈现、商业意义或事实范围；请求内改变方向直接做新草稿，不能虚构事实；
- approving a semantic Edit Intent/CommitPlan when the policy does not already
  authorize the exact reversible class;
- resolving ambiguous causality, identity, emotion or material factuality;
- 首次开启或扩大跨项目学习/外部数据范围；已授权集合内观察不逐条询问；
- accepting subjective picture, sound, pacing and story quality;
- final Delivery/Publish authorization.

Approval binds exact object digest, base version, affected scope and expected
effect. Stale inputs or materially changed effects invalidate it. A broad chat
message is not indefinite future consent.

## Forbidden actions

No agent, model, Worker, UI or approval may:

- directly read or modify `project.sqlite` outside Project Host;
- directly mutate Timeline or bypass approved Edit Intent adaptation,
  `CommandEditIntent`, `CommandEditIR`, preconditions, simulation, validation
  and CommitPlan;
- inject arbitrary Timeline Commands, RenderGraph nodes, backend strings, shell,
  FFmpeg/MLT, code or network downloads through Skills or model output;
- directly access originals, filesystem paths, credentials or private media
  outside a Host-authorized narrow job;
- use a Proxy as Master Original or hide unsupported Preview/Master divergence;
- bypass protected refs, locks, rights, privacy, licensing or capability gates;
- fabricate people, Moments, Events, causes, dialogue, claims or evidence;
- auto-approve Contract, Story, Edit/Commit or Delivery;
- silently change project stage, memory consent, retention or user identity;
- publish, upload, purchase or contact an external service without explicit
  authority for that side effect;
- turn a failed/partial operation into empty success.

## Permission classes

| Class | Example | Gate | Failure result |
| --- | --- | --- | --- |
| read/query | retrieve approved evidence refs | Project API scope, privacy and version | denied/insufficient response; no state change |
| candidate generation | Story or QC suggestion | bounded context, Contract Schema and provenance | whole invalid response fails with retained diagnostic |
| derived registration | reviewed Evidence Pack or Decision Record | Host validation and idempotent identity | no authoritative artifact on failure |
| project mutation | approved edit | valid request authorization or separately required exact approval plus full Host Commit path | zero Timeline/event/artifact mutation on failure |
| render execution | Preview/Master request | committed Timeline, ExecutionPlan, source/capability resolution | explicit blocked bundle or failed job |
| delivery/external side effect | publish/export/send | QC/rights/privacy and exact human approval | remain at last valid delivery state |

## Reversible defaults

Agents may choose reversible presentation defaults—candidate ordering,
explanation length or non-authoritative preview selection—when they do not
change project truth or hide alternatives. 请求内草稿制作经有效授权及 Host gate；扩大隐私、费用、外部系统或保护范围才增加确认。

Undo is not a substitute for permission. A reversible edit still needs the
approved mutation path, provenance and version checks.

## Delegation and tools

An agent may delegate only a subset of its already-authorized request scope.
Delegation cannot expand media, project, time-range, network or mutation access.
Every tool call records actor/agent identity, purpose, exact inputs, policy and
result; returned data is minimized and redacted.

Tool/model confidence never expands permission. Repeated success does not grant
new rights. Provider or tool failure cannot cause fallback to a less governed
path.

## Memory and learning permissions

Project decisions may be retrieved within their project policy. Cross-project
User Memory is opt-in, inspectable and deletable. Skill evaluation evidence may
inform a reviewed new definition version but cannot train providers or alter
published definitions automatically. See
[Creative Memory Architecture](CREATIVE_MEMORY_ARCHITECTURE.md).

## Audit and recovery

Permission-sensitive operations record request, actor, exact refs/digests,
policy version, approval, expected effects, result and diagnostics. After crash
or retry, Project Host resumes from registered immutable state and replays only
explicitly idempotent work. It never infers approval from a completed Worker job
or model response.

## Work Order implications

S3-01/03/04 验证请求授权、学习范围、普通草稿和越界拒绝。无通用 Agent runtime，保留最小数据、版本、幂等和拒绝时无错误提交。

## 请求、采用、导出与发布

Host 保存用户实际请求、actor、授权素材/用途/预算/保护、有效期及撤销代次；内部候选引用该授权，不能创建 human approval。草稿保存只是可撤回项目版本；采用是用户选择的作品指针；导出绑定精确 Timeline/Master/QC 与目标文件；对外发布需要单独授权，不能由导出推断。用户可在请求时授权明确导出目标，但模型绝不能自动发布。

素材/媒体字段外传前、生成发出前、提交前复核授权；新的供应商、数据范围、超预算、保护解除或危险事实歧义再询问。单纯“再试一种”或范围内反馈不是无限后续授权，也不需要逐 Story/Edit 弹窗。详见 [ADR-0028](../decisions/ADR-0028-stage3-request-drafts-and-local-profile.md)。
