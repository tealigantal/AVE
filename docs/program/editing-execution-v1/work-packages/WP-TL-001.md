# WP-TL-001 Timeline v1 model and commands

## User-visible outcome
Creators can commit the complete typed v1 timeline object set without losing version/undo safety.
## Capability IDs
CAP-TL-001. ## Specifications
TIMELINE_MODEL.md. ## Current repository gap
P0 basic timeline evidence does not prove v1 clips, nesting, track properties or commands. ## Allowed paths
Manifest allowed paths. ## Forbidden paths
Manifest forbidden paths. ## Contract changes
Versioned schemas. ## Timeline changes
Objects and atomic commands. ## Edit IR changes
Typed resolvers. ## RenderGraph changes
Graph input mapping. ## Backend changes
None required beyond graph consumption. ## Migration
Host-only versioned migration. ## Tests
timeline-core:test, commit-plan:test. ## Acceptance
ACC-011, ACC-013. ## Evidence requirements
EVD with fingerprint and reopen result. ## Failure conditions
Conflict, lock, cycle, partial commit. ## Definition of Done
Evidence-backed tests and acceptance; no API-only claim.
