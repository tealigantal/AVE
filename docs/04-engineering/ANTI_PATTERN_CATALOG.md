# Anti-Pattern Catalog

| Anti-pattern | Why forbidden | Required alternative |
| --- | --- | --- |
| God Object | collapses ownership and makes failure atomicity unverifiable | bounded domain objects and Host-owned orchestration |
| Common Utils | hides dependency direction and domain meaning | place pure logic in the owning Core package with typed names |
| Generic Manager | erases lifecycle, authority, and stable error semantics | explicit use case or service named for one responsibility |
| Direct Database Access | creates multiple writers and bypasses transactions | Project Host through Project Storage only |
| Hidden State | breaks replay, audit, and recovery | versioned artifacts and explicit dependencies |
| Timeline Bypass | produces unversioned or partial edits | current CommandEditIntent -> CommandEditIR -> CommitPlan; future semantic Intent must adapt into it |
| Model Writes Business State | turns untrusted candidates into authority | contract-validated candidate plus Host approval path |
| Fake Implementation | markers, stubs, or approximate media masquerade as capability | bounded truthful name, encoded observable test, or blocker |
| Silent Fallback | user cannot know semantics changed | declared execute/fallback/bake/block decision |
| Proxy-as-Master | violates source provenance | Host-verified Original for Original-backed Master |
| Float Time | introduces cross-layer timing drift | RationalTime and explicit rounding policy |
| Stringly Backend Escape | allows arbitrary execution and contract drift | registered typed capability and adapter |
| Parallel Source of Truth | creates contradictory product/status/architecture claims | canonical owner plus links or compatibility pointer |
| Test-as-Capability | confuses harness existence with user behavior | Evidence for encoded output, persistence, failure, and review |

## Review question

If a design cannot identify the owner, input version, validation point, failure
result, audit artifact, and rollback boundary, it is not ready for implementation.
