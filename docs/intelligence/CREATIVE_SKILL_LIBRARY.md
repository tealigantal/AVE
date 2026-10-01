# Creative Skill Library

## Skill definition

A Creative Skill is a versioned, reusable knowledge unit, not a fixed video
template. Its minimum record contains: `skill_id`, version, purpose, applicable
contexts, required evidence, decision logic, parameters, conflicts, failure
cases, evaluation criteria, provenance, license/trust status and supported
downstream capabilities.

The knowledge contract is named `CreativeSkillDefinition` to distinguish
it from the already implemented `CreativeSkillOutputV1` Preset-selection
boundary. See [Product Intelligence Object Model](OBJECT_MODEL.md) and the
authoritative execution boundary in
[`PRESET_AND_SKILL_INTERFACE.md`](../specifications/editing-execution-v1/PRESET_AND_SKILL_INTERFACE.md).

Example: **Emotional Contrast Introduction** seeks early curiosity by showing a
consequential reaction before its explanation. It requires a causal pair of
evidenced moments, rejects unrelated reactions or manufactured emotion, and
reports alternatives when the causal link is uncertain.

## Evaluation

Skills are selected only when context, evidence sufficiency and creator voice
are compatible. The evaluator records expected benefit, risks, conflicts with
other skills, confidence and a human-readable reason. A skill can recommend a
story decision without being executable; executable selections must comply with
the typed Preset/Skill interface and ordinary Timeline Commands.

## Stage3 supplied Catalog runtime

本次接入唯一内容源为内置原文
[`catalog-source.md`](../../packages/core/editorial-core/src/knowledge/skill/catalog-source.md)。
64 个内容单元以 CreativeSkillDefinitionV1 的 `catalog_content` 保留完整原文及 source/definition digest，版本 1 只读。
Platform loader 读取原文及静态 catalog.v1.json；Core 校验完整正文、digest 与显式结构，不通过正文正则推测知识字段。Stage2 消费同一 current V2 评价合同。
真实主链在固定 Request/IntentRevision、Observation、Timeline、授权 Profile、保护及能力上下文内由本地 metadata 粗筛 6–12 个候选，首轮模型读完整正文并评价/测量，第二轮确认 CreationDecision。
具体协议、旧合同冲突和边界见 [ADR-0035](../decisions/ADR-0035-stage3-skill-demand-loading.md)。
测试/真实接受状态只见当前 programme 与 Evidence；文件存在不证明完成。

## Governance

Definitions are immutable by version and content digest. New evidence can
produce a new version or retire a skill; it cannot rewrite prior decisions.
Marketplace or untrusted skills are quarantined. A skill never learns directly
from private media or user feedback without explicit consent and provenance.

SkillEvaluationV2 是唯一现行合同，全部 schema_version=2，以 context_kind 区分 Stage2/Stage3。applicable 可为 decision_only/no_change/edit_proposed；只有 edit_proposed 要求实际 effect。旧版本明确拒绝，不转换历史对象。内置 Catalog 仅获准本地运行，不代表公开发行许可证。
