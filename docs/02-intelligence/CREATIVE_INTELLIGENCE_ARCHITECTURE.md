# Creative Intelligence Architecture

## Purpose

Creative Intelligence converts creator intent and media evidence into ranked,
explainable, reversible proposals. It owns no Timeline, database, render, or
approval authority.

## Reasoning chain

```text
Media Understanding
  -> Evidence Graph
  -> Narrative Understanding
  -> Creative Decision
  -> semantic Edit Intent
  -> future Project Host adapter
  -> current CommandEditIntent
  -> current CommandEditIR
```

Project Host then applies the existing `Resolve/Preconditions -> CommandEditIR
-> Simulate -> Validate -> CommitPlan -> Commit` path. The semantic-to-command
adapter is a future implementation boundary, not a current capability claim.
Target-specific Preview/Master RenderGraphs are derived only from the committed
Timeline and must share the same target-neutral semantic payload/hash.

## Observation, interpretation, and decision

| Layer | Meaning | Example | May do | Must not do |
| --- | --- | --- | --- | --- |
| Observation | time/source-bound media fact or uncertain detection | “speaker pauses from t1 to t2” | cite source, confidence, method | assert story meaning |
| Interpretation | a contestable explanation built from observations | “the pause may signal hesitation” | list alternatives and uncertainty | become approval or Timeline change |
| Decision | a chosen creative action serving an approved goal | “hold the pause before the reveal” | cite intent, evidence, trade-off | bypass user/policy approval or execution checks |

Mixing these layers is a correctness defect. User corrections to observations
invalidate dependent interpretations and decisions. A high-confidence
interpretation is still not a fact or permission.

## Outputs

The intelligence layer produces versioned Creative Contracts, Material
Evidence Packs, Skill Evaluations, Direction Cards, Story Plans, Decision
Records, and semantic Edit Intent candidates. Contract names and fields become
authoritative only through a governed Work Order and schema promotion.

## Failure closure

Creative uncertainty and recoverable model or optional-resource failures should
lead to a bounded correction, a visible missing item, or an editable partial
draft when one can be produced safely. Do not require a separate proof object
for each inferred creative intent, or infer natural-language sound requirements
with keyword rules. An explanatory caption may describe observed pictures;
verbatim captions still need a real transcript and audible source. A partial
result must identify what failed and must not claim that omitted user requests
were fulfilled. These are product requirements, not proof every recovery path
is implemented.

An inapplicable Skill may report either `none` or `no_change` in a new
planning run. Neither disposition authorizes a Skill effect; any actual effect
still requires its selected definition, evidence, supported capability and
decision binding. A failed advisory Skill is retained in the model record and
shown in the saved version's details so the user can review the missing advice;
it does not block other independently valid edits. An omitted or empty optional
Skill evaluation does not prevent an otherwise valid measured plan. Historical runs keep their
original validation policy. This describes the implementation boundary, not
proof that every possible Skill failure or creative request can be recovered.

For new runs, a separately selected ambient-sound request is sent as an
authorized request to the planner. If source-bound sound observations cannot
confirm that the result includes the requested ambient sound, a valid draft is
retained and its version details ask the owner to check the sound. The warning
is reconstructed from the bound input, revision and committed Timeline; it is
not a claim that sound was retained or a permission to transmit audio. Invalid
claimed evidence remains an error. Manual edits preserve the selected complete
source track's execution checks and similarly disclose that ambient content was
not verified. Historical model and manual records keep their original rules.

For current creation planning, the model interprets the whole-work duration in
the user's context and returns a typed tick range or an explicit exact, upper,
or lower bound. A plain duration goal may be approximate; source-clip or local
edit durations are not automatically whole-work limits. The first interpretation
is bound across a planning run and checked against each measured target. Exact
Timeline arithmetic enforces those interpreted bounds, but cannot establish that
the model understood the request correctly; real-model evaluation remains
necessary. Historical runs retain their original projection and constraints.

For new planning runs, ordinary feedback and annotation language is interpreted
by the model using the versioned `creation-feedback.v1` prompt and, when
available, the viewed Timeline's video clip IDs, positions, durations and grid.
The historical projection does not include captions or audio. Local regular-expression matches do not create
hard shot-count, pacing, grayscale, ordering or preservation obligations. The
model's interpretation and change summary are shown to the request owner so
uncertainty or an unmet creative request can be reviewed; they are model claims,
not proof that the result satisfies the request. Explicit protected references
remain enforced by the compiler and commit path. Older saved planning runs
retain the input and proof by which they were created.

Authorization, source identity, exact time bounds, protected edits, resource
integrity, transaction atomicity and stale or cancelled operations remain hard
execution boundaries. Unsupported semantics must be visible and cannot be
silently discarded or published as completed work. A valid committed draft can
remain editable when a later render or optional learning step fails; a video is
playable or exportable only when its actual render and QC allow it.
Local silence, black or frozen intervals and a full-scale audio peak are QC
findings for the user to review; they do not alone prove a broken render. Unparseable detection and
unplanned intervals covering nearly the whole output remain blocking, as do
independent decode, required-stream and other execution checks.

### 可选建议的局部恢复

新创作运行将 Skill 建议视为可选的模型输出：格式、依据或能力无效的条目保留原始审计记录，排除其效果授权，并向请求人提示；其他有效建议及可执行的直接编辑继续处理。知识目录身份、素材权限、时间和实际效果绑定仍须通过校验；历史运行按其绑定的原有策略重放。资源下载的短暂故障允许有界恢复并说明，权限、完整性和取消等错误不伪装为成功。

同一轮选择多项音频时，Host 逐项尝试资源，记录所有可恢复的下载失败及根因，再排除这些失败资源进行有界的模型重新规划；已成功获取的资源可再次选择。失败资源必须与该轮真实选择和已授权候选绑定。此机制不保证重规划一定成功，也不会把缺失的资源伪装成已测量或已使用；权限、完整性、取消和独立清理错误仍立即中止。

若资源恢复后又出现可纠正的输出错误，可在同一制作操作的五次物理规划调用总预算内继续重新规划；每次至少保留测量和最终决定所需的两次调用。已记录的资源故障继续排除并在结果中提示，较新的可纠正错误单独提供其绑定诊断。预算耗尽时保留失败根因和先前作品，不提交不完整 Timeline。

已授权并测量的可选音频若未进入最终作品，新运行可保留其他有效内容，并在草稿详情中明确提示缺失；被使用的音频仍须匹配已测量身份、真实范围与角色。旧运行按其原有策略重放。

可选 Skill 建议即使声明可能产生编辑，也不应仅因缺少效果归因而阻止其他有效编辑；未归因的建议须明确提示，已提交的效果归因仍须逐项校验身份、依据和实际执行字段。

新运行可绑定 `image_source_choice_policy=static-placeholder-v1`：模型已明确选择静态图和 still 时长，但附带无类型的 0–0 或 0–1 秒占位范围时，仅在素材与片段唯一匹配获准且有视觉观测的静态图后，解析为图片身份。原始模型输出保留审计，实际时长仍由 still 指定；其他范围、身份或时长类型仍按原校验处理，旧运行保持原有解释。
