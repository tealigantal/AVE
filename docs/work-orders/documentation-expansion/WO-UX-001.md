# WO-UX-001 Human review and product evaluation

Status: promoted as `WP-CA-UX-001`; dependency-ready after Product completion.

- Goal: validate the complete import-to-delivery journey with real user-visible evidence.
- Motivation: synthetic tests cannot prove creative usefulness or interaction quality.
- Input: accepted workspace, acceptance rubric, authorized real media and a representative creator review.
- Output: exact journey Evidence, usability findings, unresolved debt and prioritized governed follow-up.
- Dependencies: completed `WP-CA-PRODUCT-001`, which already depends on the accepted first-cut and scoped-feedback packages.
- Non-goals: merging or publishing without explicit approval.
- Acceptance: reviewer can inspect evidence, compare revisions, reject safely, recover, and approve only a QC-passing delivery.

The package is evaluation-only. It may run the retained real Electron journey
and inspect repository-external review artifacts, but it may modify only
governance and Evidence documents. Any runtime defect blocks the package and
must be assigned to a separately governed repair package; evaluation must not
silently rewrite the accepted Product implementation.
