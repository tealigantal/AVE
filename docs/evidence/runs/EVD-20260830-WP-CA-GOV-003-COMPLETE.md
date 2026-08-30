---
evidence_id: EVD-20260830-WP-CA-GOV-003-COMPLETE
date: 2026-08-30
work_package_id: WP-CA-GOV-003
repository_commit: codex/issue-12-scoped-evidence-fingerprints-uncommitted
code_fingerprint: 81db3907e76d0f33f5d8c4b05e6c1e38834822b6cd574eb07bd73054deb85802
scope_fingerprint: aaaa7b17a5887aa03d626ce916333d54e4a7afe4602fd68085b8749d6ca623b7
capability_ids: [CAP-CA-GOV-003]
acceptance_ids: [ACC-CA-GOV-003]
result: passed
---

# Issue #12 scoped Evidence governance completion

The pre-change failure was reproduced by importing the missing scope module: the regression test failed with `ERR_MODULE_NOT_FOUND`. The completed implementation now proves that an unrelated governance file does not change a feature scope fingerprint, an owned implementation change does, empty and broad scopes fail closed, and Windows/POSIX path spelling produces the same scope identity.

`assertCurrentInterfaces` proves that two majors in one Contract family fail, distinct families remain valid, a current authority reference to a removed Contract fails, and an archive reference remains allowed. The real repository scan detected and removed two current deleted-v1 references before this completion.

Executed: `node tests/architecture/docs-fingerprint.test.mjs`; `pnpm run docs:sync`; `node scripts/docs/migrate-evidence-scope-index.mjs`; `pnpm run docs:check`; `git diff --check`.

No real media, Stage Exit, or Release claim is made. Historical Evidence remains immutable and is represented only by the applicability index.
