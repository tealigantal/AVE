# WP-VLOG-002 Basic Vlog real-media identity regression and review delivery

## User-visible outcome

The bounded Basic Vlog toolkit renders authorized local real media through the Project Host and Worker identity boundary, produces Preview and original-backed Master outputs, passes QC, survives close/reopen, and leaves a local review project without copying user media into the repository.

## Scope

- Reproduce and fix the TypeScript/Python semantic manifest mismatch exposed by multi-source real media, proxy maps and captions.
- Add a synthetic cross-language regression that requires no user media and runs in the normal repository check.
- Re-run the four bounded Basic Vlog encoded-media assertions, including stable Dialogue/Music recovery.
- Produce a local `AVE-final-*` review directory containing the project, Preview, Master, QC evidence and review notes.

## Boundaries

Project Host remains the sole project-state authority and SQLite writer. Worker validation remains fail-closed. User media stays in its original local directory and is neither copied into the repository nor committed. Cross Dissolve, dynamic subject tracking, general automation and advanced transition families remain blocked.

## Definition of done

The minimized regression fails before the fix and passes after it; all required synthetic and repository checks pass; authorized real media renders through the Host with matching semantic identity and original/proxy provenance; project integrity, close/reopen and QC pass; and the user receives stable Preview/Master paths for manual review before any PR is created.
