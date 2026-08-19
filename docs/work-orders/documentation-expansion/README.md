# Documentation Expansion Work Orders

These are future implementation packages derived from the product blueprint.
They are not part of the active `editing-execution-v1` manifest and do not
claim implementation. Before coding, each package needs an explicit governed
work-package entry, allowed paths, contracts, acceptance IDs and Evidence plan.
Before promotion, every candidate must satisfy
[`IMPLEMENTATION_WORK_ORDER_SPEC.md`](../IMPLEMENTATION_WORK_ORDER_SPEC.md).
Files explicitly marked `draft` are dependency placeholders, not ready work.

## Dependency order

```text
WO-DOC-001
  -> WO-INT-000 -> WO-INT-001 -> WO-INT-002 -> WO-INT-003 ----+-> WO-PRODUCT-001
  -> WO-RESEARCH-001 -> WO-STYLE-001 ------------+
                     -> WO-TREND-001 ------------+
WO-INT-003 + required execution capabilities -> WO-PIPE-001
WO-PRODUCT-001 + WO-PIPE-001 -> WO-UX-001
```

See the individual work orders in this directory. The execution foundation,
Project Host, `CommandEditIR`, Timeline Core, Semantic Render Manifest,
target-specific RenderGraphs and ExecutionPlans, versioning, and QC remain
prerequisites, not bypasses.
