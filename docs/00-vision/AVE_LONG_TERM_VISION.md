# AVE Long-Term Vision

## Positioning

AVE is a local-first, conversational **AI Creative Operating System for Vlog
creation**. It helps a creator turn intent and real media into an explainable,
reversible, versioned creative result while the creator retains authority over
identity, story, sensitive representation, approval, and publication.

“Operating System” describes coordinated creative knowledge, project state,
execution, trust, and learning policies. It does not mean AVE is a general
computer operating system or an unconstrained multi-agent platform.

## Difference from adjacent products

| System | Primary control surface | Typical strength | AVE boundary |
| --- | --- | --- | --- |
| Traditional NLE | manual Timeline and tools | precise direct manipulation | AVE may expose a Timeline, but normal work begins with intent, evidence, alternatives, and review |
| One-click AI editor | prompt or fixed template | rapid first output | AVE does not trade away provenance, reversibility, explicit blockers, or creator approval for speed |
| AVE | conversation plus inspectable creative artifacts | evidence-bound co-editing | AI proposes; Project Host validates and commits; the user approves consequential outcomes |

AVE is not differentiated by producing more effects. It is differentiated by
making creative judgment inspectable and by preserving the same authority path
from proposal to encoded Master.

## Long-term world model

```text
Creator World
  -> Creative World
  -> Timeline World
  -> Render World
  -> Outcome Learning
```

- **Creator World** holds current intent, explicit preferences, rights,
  constraints, approvals, and protected identity.
- **Creative World** turns media observations into interpretations, candidate
  stories, decisions, alternatives, and semantic Edit Intent.
- **Timeline World** turns approved Edit Intent through a Host adapter into
  versioned `CommandEditIntent` / `CommandEditIR`, ordinary
  Timeline Commands, and an atomic CommitPlan.
- **Render World** resolves committed semantics into target-specific Preview and
  Master RenderGraphs that share one target-neutral semantic payload/hash,
  their ExecutionPlans, encoded output, and QC.
- **Outcome Learning** records consented feedback and outcome evidence for
  future retrieval; it never silently trains or rewrites authority.

## Development directions

1. Preserve the accepted reliable-media foundation and complete blocked
   editing families with real encoded and human-reviewed evidence.
2. Add creative intelligence as typed, evidence-bound proposal layers above
   Project Host rather than as a second execution path.
3. Build a creator-controlled memory and learning loop with consent,
   provenance, deletion, and version invalidation.
4. Improve collaboration quality: fewer avoidable revision cycles, clearer
   alternatives, more local patches, and stronger trust.
5. Expand distribution or shared knowledge only after local privacy,
   licensing, security, and authority rules are enforceable.

## Long-term success

AVE is stronger when a creator can reach a result that matches their intent
with fewer corrective rounds, no unexplained omission, clear decision traces,
recoverable project state, and a Master whose media identity and semantics are
verified. Model size, effect count, or benchmark score alone is not success.

## Explicit non-goals

- autonomous publication or approval;
- direct model writes to Timeline, SQLite, or RenderGraph;
- style copying, engagement maximization, or trend compliance as a default;
- an executable Skill marketplace before trust and licensing controls exist;
- hidden cross-project learning from private media;
- replacing professional editors or forcing every creator into one aesthetic;
- claiming future designs as implemented capability.

## Current boundary

The P0 reliable-media loop is accepted. The editing-execution-v1 programme is
specified but many advanced families remain blocked. Current truth is generated
in [`docs/current/STATUS.md`](../current/STATUS.md); this vision cannot change
that status.
