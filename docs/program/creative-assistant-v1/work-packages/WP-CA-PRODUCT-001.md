# WP-CA-PRODUCT-001 Conversation-led Stage 2 desktop workspace

## Goal

Expose the already implemented Stage 2 authority as one usable desktop journey:
same-version Goal/Contract, Material/Evidence, Story/Direction and
Review/Timeline views; comparable candidates; exact approval and execution;
execution-bound Preview/Master/QC; one scoped feedback preview and reject or
approve path; undo/redo and reopen recovery.

## Authority and compatibility

Project Host remains the only project-state authority and SQLite writer. The
Electron renderer is a text-safe view and query cache only. Approval identity,
credentials, persistence and execution stay in the main process and Host. IPC
must validate closed runtime payloads and bind every query or mutation to exact
project and version refs.

The package consumes the accepted Contract, Evidence, Story, Permission,
first-cut and Feedback paths. It may add one bounded Host workspace projection
and the minimum preload/main-process surface required to use them. It must not
create client-side project authority, bypass CommitPlan, use the legacy render
entry for Stage 2 approval, or claim that a shallow Electron smoke proves the
product journey.

Style and Trend are optional advisory inputs. They are not dependencies and
their absence must not block this package.

## Acceptance

`ACC-CA-PRODUCT-001` requires an actual Electron/Chromium interaction over
authorized real media. The reviewer must be able to inspect four same-version
workspace views, compare candidates, reject safely, approve exact effects,
review execution-bound Preview/Master/QC, submit and decide one scoped feedback
revision, and recover through undo/redo and reopen.

Stale or rebound refs, invalid IPC payloads, renderer-forged authority,
rejected actions, execution mismatch and injected storage failure must expose a
closed visible state and publish no false success or authoritative mutation.

## Scope boundaries

Allowed and forbidden paths are machine-readable in
`docs/program/creative-assistant-v1/EXECUTION_MANIFEST.yaml`. Worker, Timeline
Core, Edit IR, RenderGraph, Preset Core, Worker Client and Model Gateway are
frozen; the package consumes their accepted behavior only through Project Host.
