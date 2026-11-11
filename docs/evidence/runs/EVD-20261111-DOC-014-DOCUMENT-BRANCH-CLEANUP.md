---
evidence_id: EVD-20261111-DOC-014-DOCUMENT-BRANCH-CLEANUP
work_package_id: DOC-014
date: 2026-11-11
repository_commit: 293695defc884445630b7d83e77a58c8f2031186
capability_ids: []
acceptance_ids: []
result: partial
---

# Document and local branch cleanup

This independent documentation record follows the user instructions to update documentation and branches, physically remove obsolete documents, and not run tests merely to pass documentation. It does not close an implementation package.

- Removed 97 obsolete archive documents with no specific references from current documentation; retained the P3 historical visual assertion referenced by historical Evidence. Exact paths: [deletion inventory](../assets/doc-014/deleted-archive.json). Current policy documents are updated rather than deleted while other documents/tools still reference them.
- Removed local-first direction, mandatory local fallback, GPU/local-model installation guidance and stale universal 6080 acceptance assumptions. English/Chinese README now select the existing cloud-only overlays; cloud rendering remains unimplemented. Privacy and Host authority remain enforced.
- Recorded [initial repository inventory](../assets/doc-014/repository-before.json). Created `codex/cloud-editing` at the same HEAD, preserving all dirty implementation work. Deleted seven local feature branches after confirming all commits were ancestors of HEAD. `main` remains nine commits behind HEAD. Remote heads were read and stale remote-tracking refs pruned; no remote branch was deleted, no commit/push/merge/deployment performed. Two other detached worktrees remain untouched.
- Ignored local `.playwright-cli/` and `output/` artifacts to avoid accidental inclusion of private traces and media. Their bytes were not deleted. Governed Evidence is not ignored.
- Corrected two P4 capability and acceptance entries from stale `accepted` to `blocked`, consistent with the reopened active package and existing current-UX debt. Historical evidence is retained, not rewritten or claimed as current validation.

Initial `pnpm run docs:check` reported scene request duplicate current majors and source/applicability mismatches. The production Host still submits `media.scene_scan.v1`; opt-in v2 implements a different streamed result and cannot be deleted or substituted solely to make documents green. Existing historical evidence does not prove changed code. These issues remain; no validators, runtime code or test assertions were weakened. After the user's clarification, no test suite or repeated acceptance was run for document compliance. Documentation synchronization and reference/Git inventory checks only.

Remaining product work: scene interface replacement and caller integration, current-build creation/interaction evidence, the reported creation planning failure and cloud rendering implementation. Removing documents is not evidence that these are fixed. See [owning plan](../../plans/2026-11-11-cloud-editing-benchmark.md).

Final file-only checks: `pnpm run docs:sync` completed; targeted `git diff --check` passed; all 97 inventoried files are absent, with zero specific references from scanned current domain/programme authorities. The two remaining archive files are the index and referenced P3 historical assertion. Current P4 capability statuses are both blocked. Local branches are `codex/cloud-editing` and `main`; `main...HEAD` is 0/9. Git fetch reported unreachable loose objects during housekeeping; no prune was run, preserving potential recovery objects. No test suite was run after the user's instruction.
