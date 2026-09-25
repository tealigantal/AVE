# Creative Memory Architecture

## Purpose, authority and status

Creative memory lets AVE reuse reviewed context without turning model history
into hidden authority. This document defines a consent-first target boundary for
User, Project and Skill Memory. It does not introduce a Memory service,
database, autonomous learning loop or implemented capability.

Canonical target objects, versioning and ownership remain in the
[Product Intelligence Object Model](../intelligence/OBJECT_MODEL.md). Runtime
orchestration remains in
[Creative Intelligence Runtime](../intelligence/CREATIVE_INTELLIGENCE_RUNTIME.md).
Project Host is the only project-state and SQLite writer. Shared/cloud memory and cross-device synchronization remain outside Stage3. Local cross-project profiles and consent-scoped active learning belong to Stage3, under ADR-0028 and candidate S3-03.

## Memory is a governed view, not model state

AVE memory is a queryable set of immutable, provenance-bearing records. It is
not a prompt transcript, provider cache, mutable embedding collection, model
weight update or permission to retain private media. A generated preference is
a hypothesis until the user reviews it or an explicit policy accepts it.

Every memory item needs:

- stable ID, schema/object version, scope and status;
- source artifact/decision/feedback refs and exact content digests;
- created/observed time, recency policy and optional expiration;
- confidence with basis, counterexamples and conflict state;
- consent basis, privacy class, retention rule and deletion/export behavior;
- producer/tool/policy provenance and reviewer state;
- applicability dimensions and known exclusions.

Names and physical contracts are future implementation decisions. JSON Schema
becomes authoritative only through a promoted work package.

## Three memory scopes

### User Memory

Long-lived, opt-in preferences that may apply across projects:

- preferred pacing and tolerance for silence;
- subtitle style and information density;
- music characteristics and mix preferences;
- narrative preferences and creator-identity constraints;
- repeatedly rejected patterns, each with context and counterexamples.

User Memory never contains raw project media by default. It should favor
reviewed summaries and source Decision Record refs. Cross-project use must be
visible, editable, exportable, deletable and disableable. A single accepted or
rejected suggestion is evidence for a candidate preference, not a permanent
rule.

### Project Memory

The authoritative, recoverable creative history of one project:

- approved Creative Contract versions;
- exact Material Evidence Pack and Story Plan refs;
- accepted and rejected decisions, alternatives and reasons;
- approved semantic Edit Intents and committed Timeline provenance;
- review observations, feedback diagnoses, QC results and delivery decisions.

Project Memory is primarily a retrieval view over existing immutable artifacts
and append-only decisions. It does not duplicate them into a parallel state
store. Project Host resolves exact refs and current validity before use.

### Skill Memory

Evidence about how versioned Creative Skills perform in defined contexts:

- which `SkillEvaluation` recommendations users accepted or rejected;
- which expected effects survived human review;
- which contexts, evidence thresholds or conflicts caused failure;
- benchmark results and known counterexamples;
- definition/evaluator versions and population/segment boundaries.

Skill Memory cannot mutate a published `CreativeSkillDefinition`. New evidence
creates a new evaluation record, benchmark snapshot or reviewed definition
version. Repository-shipped read-only knowledge plus Project Host-pinned project
snapshots is the first safe boundary; a shared learning catalog is out of scope.

## Scope and precedence

| Scope | Default lifetime | Authority | May influence | Must not override |
| --- | --- | --- | --- | --- |
| current interaction | session/request | Project Host context assembly | current candidate generation | approved Contract or current explicit user instruction |
| project | project lifetime/retention policy | Project Host project artifacts | project retrieval, revision and explanation | approved facts, locks, rights/privacy or Timeline authority |
| user | opt-in user-defined retention | single local Profile Repository owner in Electron Main through a narrow Host-facing port | material selection, story, pacing, captions, sound and agreed visual treatment across projects | current project Contract or creator correction |
| skill evidence | immutable reviewed dataset snapshot | curated catalog plus Host-pinned refs | evaluation and definition revision | evidence gates, capability status or human acceptance |

Precedence is current explicit instruction and approved Creative Contract,
followed by project decisions, then applicable user preferences, then Skill and
default advice. Recency alone cannot erase a protected identity constraint.

## Write path

```text
user action / review / feedback / benchmark
  -> source artifact and consent validation
  -> candidate memory observation
  -> conflict, confidence and privacy evaluation
  -> user/policy review where required
  -> immutable registration by the appropriate authority
  -> exact-version retrieval snapshot for a CreativeRun
```

Model Gateway may propose a summary, but cannot persist it. Worker may produce
analysis candidates, but cannot classify them as preference. Project feedback
does not silently train a provider or shared model.

## Read path and context assembly

Project Host creates a bounded memory query from the approved Creative Contract,
project scope, purpose and privacy policy. Retrieval filters exact scope,
consent, status, expiry, applicability and conflicts before ranking. The
resulting snapshot records selected and rejected items with reasons and becomes
part of the `CreativeContextBundle` input fingerprint.

正常关闭、首次无档案、成功检索无适用记录：只用当前输入直接制作，并如实记录未使用个性化。DB 失败、索引损坏、必需来源缺失、权限/版本错误：受影响请求明确失败，不转换为空档案。用户可以另发显式不使用个性化的新请求，旧失败保留。

## Feedback and learning policy

Acceptance rate is not creative truth. An accepted change may reflect time
pressure; a rejection may be project-specific; publication does not prove every
decision was good. 一次早期反馈即可形成有来源、可纠正的假设；进一步观察更新适用范围及反例，不必等待多次确认才学习。Inference needs context segmentation, counterexamples and user-visible wording such as
"suggested preference" rather than "your style" until confirmed.

Corrections create successor records and invalidate affected retrieval
snapshots. Historical decisions retain pinned inputs for audit. Negative signals
must not be discarded merely because they reduce benchmark scores.

## Privacy and user control

Users must be able to see why a memory item exists, correct it, limit its scope,
exclude it from a project, export it and request deletion. Deletion policy must
distinguish the reusable memory item from immutable project audit records that
may need retention; the product must explain this distinction before consent.

Sensitive identity, health, protected-class, location or relationship
inferences require stricter policy and are excluded from automatic User Memory
by default. Raw media, private paths and provider prompts are not memory items.

## Invalidation and failure closure

- Missing consent or source provenance blocks registration.
- Scope leakage between projects/users blocks retrieval.
- Conflicting preferences return alternatives instead of last-write-wins.
- Expired, deleted, revoked or stale items cannot enter a new context snapshot.
- Failure to register memory cannot alter the originating project decision.
- Memory can never approve a Contract, Story, Edit/Commit or Delivery gate.
- No memory item can contain Timeline Commands, RenderGraph nodes, backend
  strings, credentials or executable code.

## Work Order implications

S3-03 同时交付项目历史检索和获准本地跨项目档案，不将跨项目延期；S3-02 提供有来源的学习观察，S3-04 消费快照产生实际作品。共享/云端 Skill catalog 仍不属于本阶段。

## Stage3 写入、删除与竞争

用户库唯一读写者由 Electron Main 组合根构造，Project Host 通过窄端口取得快照；项目库仍只由各自 Host 写入。跨库事件以 project/event/digest 幂等登记，失败保留“作品已提交、学习未完成”。索引是派生数据，不是事实或批准权威。详见 [ADR-0028](../decisions/ADR-0028-stage3-request-drafts-and-local-profile.md)。

授权记录学习目的、项目集合、数据类型、参考范围、是否可送已配置外部模型、保留期和撤销代次。用户原话、手动差异、选择、反馈和来源 ID 可自动归纳为 hypothesis；只有用户真实明确表达才记录 explicit，不把模型 confidence 升为确认。

遗忘事务先提高 deletion generation 并登记来源排除，立即禁止未来检索；随后清除可复用正文、摘要、索引、嵌入及相关缓存，未清除完标“删除处理中”且相关使用阻断。重建索引必须读取排除集，不能从旧项目/历史快照重新推断已遗忘项。已排队生成/学习任务在登记及提交前复核代次，过期失败。删除完成有范围和数量清单；失败根因保留，可显式继续清理。保留最小来源排除标记只为防重学，不含被删偏好内容。

已提交成片和项目审计不会随档案删除改写；历史快照只能用于历史审计，不能重新进入新生成。项目排除对未来学习和检索均生效；重新学习要用户明确重新授权。外部已发送数据不能承诺追回。关闭、排除、删除、历史项目删除是四种不同操作。


授权代次复核与项目提交不得留 TOCTOU 空隙：采用 ADR-0028 的用户级串行队列，固定用户授权协调 → 项目锁顺序，短临界区内验证并原子提交。删除确认后所有旧快照的未来提交均被拒绝；先于删除完成的提交只作历史。长模型调用/渲染不持锁。C6/C9 必须控制两种交错顺序验证，而非仅测试顺序调用。
