# AVE Product Intelligence Blueprint

## Purpose and authority

This blueprint extends the accepted reliable-media foundation and the specified
editing-execution-v1 programme. It is a future product and implementation
blueprint, not evidence that these capabilities are implemented. Existing
authority remains unchanged: `PROJECT_GOAL.md` defines the durable objective,
`docs/product/EDITING_CAPABILITY_SCOPE_V1.md` defines execution scope,
`docs/architecture/` defines runtime boundaries, and `docs/current/` plus
Evidence define present status.

AVE is an AI creative partner. It understands creator intent, material facts,
reference styles and optional trend signals, then proposes reversible,
explainable edits. It never receives direct Timeline, SQLite, RenderGraph,
filesystem or backend authority.

## Product loop

```text
Creator goal + constraints
  -> Creative Contract
  -> material evidence and availability
  -> candidate creative directions
  -> Story Plan and beat evidence
  -> semantic Edit Intent and Decision Records
  -> future Host adapter
  -> current CommandEditIntent / CommandEditIR
  -> Timeline Command / CommitPlan
  -> target-specific Preview and Master RenderGraphs
     sharing one target-neutral semantic payload/hash
  -> one ExecutionPlan per graph
  -> QC and human review
  -> feedback diagnosis and scoped patch
```

Every arrow is versioned. A proposal may be rejected, revised or compared
without mutating the committed Timeline. Missing evidence or unsupported
semantics produce an explicit blocker, fallback or user choice.

## Document map

- Product: [user journey](product/USER_EXPERIENCE_FLOW.md), [creative workflow](product/CREATIVE_WORKFLOW.md), [metrics](product/PRODUCT_METRICS.md).
- Intelligence: [object model](intelligence/OBJECT_MODEL.md), [runtime](intelligence/CREATIVE_INTELLIGENCE_RUNTIME.md), [system](intelligence/CREATIVE_INTELLIGENCE_SYSTEM.md), [skills](intelligence/CREATIVE_SKILL_LIBRARY.md), [story](intelligence/STORY_GENERATION_SYSTEM.md), [reasoning](intelligence/EDITING_REASONING_SYSTEM.md), [style model](intelligence/STYLE_KNOWLEDGE_MODEL.md), [style system](intelligence/STYLE_INTELLIGENCE_SYSTEM.md), [trend model](intelligence/TREND_KNOWLEDGE_MODEL.md), [trend system](intelligence/TREND_INTELLIGENCE_SYSTEM.md).
- Cross-cutting product-intelligence views: [creative reasoning](product-intelligence/CREATIVE_REASONING_MODEL.md), [video understanding](product-intelligence/VIDEO_UNDERSTANDING_MODEL.md), [event causality](product-intelligence/EVENT_CAUSAL_GRAPH.md), [creative memory](product-intelligence/CREATIVE_MEMORY_ARCHITECTURE.md), [user profile](product-intelligence/USER_CREATIVE_PROFILE.md), [creative skills](product-intelligence/CREATIVE_SKILL_SYSTEM.md), [quality benchmark](product-intelligence/CREATIVE_QUALITY_BENCHMARK.md), [agent permissions](product-intelligence/AI_AGENT_PERMISSION_MODEL.md) and [future evolution](product-intelligence/FUTURE_PRODUCT_EVOLUTION.md). These are extension views over the canonical objects/runtime above, not a second protocol authority.
- Research: [video knowledge model](research/VIDEO_KNOWLEDGE_MODEL.md), [pipeline](research/VIDEO_RESEARCH_PIPELINE.md), [style analysis](research/VIDEO_STYLE_ANALYSIS.md), [pattern database](research/VIRAL_VIDEO_PATTERN_DATABASE.md), [competitor analysis](research/COMPETITOR_ANALYSIS.md).
- Pipelines: [material](pipeline/MATERIAL_UNDERSTANDING_PIPELINE.md), [plan to Timeline](pipeline/CREATIVE_PLAN_TO_TIMELINE_PIPELINE.md), [feedback](pipeline/FEEDBACK_TO_EDIT_PIPELINE.md), [quality](pipeline/QUALITY_EVALUATION_PIPELINE.md).
- UX: [interaction](ux/AI_INTERACTION_MODEL.md), [workspace](ux/WORKSPACE_DESIGN.md), [approval](ux/REVIEW_APPROVAL_MODEL.md).
- Future delivery: [implementation Work Order specification](work-orders/IMPLEMENTATION_WORK_ORDER_SPEC.md) and [documentation expansion work orders](work-orders/documentation-expansion/README.md).

## Non-goals and guardrails

This layer is not a template catalogue, an autonomous publisher, a popularity
scraper, a style copier, or a single unconstrained agent. Trend and reference
signals are optional advice; creator identity, material evidence, safety,
licensing, privacy and explicit approval dominate them. Product intelligence
must degrade to explanation and a user-editable plan when evidence is weak.
