# WP-CA-SEC-001: patched fast-uri dependency

Authority: security repair work package for Issue #23, registered in the programme. This dedicated scope is needed because STAB-005 excludes dependency files.

## Outcome and authorization

Restore the mandatory security gate with the patched current-major URI parser. User explicitly authorized this repair on 2026-09-07. Issue #14 and PR #22 remain parked, unchanged; only this branch is being written. Security is a prerequisite to their integration.

## Scope

Inputs: existing fast-uri 3.1.5 override, lockfile and current Contracts. Outputs: pinned patched 3.1.6, regenerated lockfile and repository-generated validators if affected. Allowed paths are registered in the manifest. No application behavior, schema major, SQLite ownership, media time, CI bypass, private media, Stage 3 or release changes.

## Steps and tests

1. Record failing dependency audit before repair.
2. Update the existing override and regenerate lockfile using pnpm.
3. Verify frozen install, audit, contract generation/check/identity/roundtrip/clean.
4. Run full check and final synthetic acceptance; record exact executed results and scope fingerprint.
5. Complete package, independent PR, exact-head remote check/security, automatic merge and branch cleanup. Resume #14 by normal merge from origin/main.

## Stop and completion

Stop for data or authority risks, out-of-scope failures or unavailable patched dependency. Completion requires audit and local/remote gates passing, truthful Evidence, independent merged PR and branch cleanup. No real-media or human acceptance is claimed.
