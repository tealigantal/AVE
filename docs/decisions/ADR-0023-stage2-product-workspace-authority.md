# ADR-0023 Stage 2 Product workspace authority

- Status: Accepted
- Date: 2026-08-24

## Context

Stage 2 Contract, Evidence, Direction, Story, Edit Intent, permission,
execution, render and feedback objects already belong to Project Host and
Project Storage. The desktop renderer previously exposed unrelated legacy
queries and JSON prompts, so adding a Product workspace risked creating a
second client-side project model, leaking original paths, or letting renderer
input masquerade as human approval.

The workspace also needs to close visibly when Timeline recovery makes an
earlier render or feedback proposal stale. A collection of independently timed
queries cannot prove that all four Product views describe one project version.

## Considered Options

1. Let the renderer assemble Stage 2 state from existing object queries and
   perform confirmation with renderer dialogs.
2. Add a renderer-owned workspace store synchronized with Project Host.
3. Add one bounded atomic Project Host projection, keep renderer state as a
   query cache, and require native main-process confirmation before the
   existing Host-owned human channel can issue an exact credential.

## Decision

Use option 3.

Project Host reads one Stage 2 workspace snapshot inside its storage authority
and returns only a versioned whitelist projection for Goal/Contract,
Material/Evidence, Story/Direction and Review/Timeline. The projection carries
a deterministic workspace digest and exact object/version/digest references;
it excludes original locations, storage rows, approval credentials and
executable commands. Preload and main-process IPC accept only closed payload
shapes. The renderer renders text with safe DOM APIs and may cache query results
only.

Every consequential Product action is re-resolved against the current
workspace digest in the main process. Electron displays a native modal naming
the exact action, expected effect, targets, workspace and reason. Cancellation
is the default and creates no Host approval. Only confirmation lets the main
process use its non-exported object-capability credential to register the exact
human approval and invoke Project Host. The renderer cannot provide an actor,
credential or approval record.

Render review is current only when the Render bundle Timeline equals the
current Timeline, a committed execution binds that version, and both Preview
and Master results exist. Feedback Intent is actionable only while its exact
diagnosis, base Timeline and target source still match. Undo, redo or another
Timeline change marks those views stale and clears any renderer-only local
effect preview. Reopen recomputes the same closure from Host state.

## Rationale

One Host projection gives the user a coherent same-version workspace without
moving project authority into Electron. Native main-process confirmation keeps
human consent outside untrusted renderer content, while reuse of the existing
exact-human permission channel avoids a second authorization model. Explicit
version binding prevents an old successful render or local preview from being
presented as current after recovery.

## Consequences

The desktop gains a narrow Stage 2 query/action surface and a real Electron
acceptance journey. Legacy desktop panels may coexist below it, but they do not
become Stage 2 authority and their raw JSON interactions are not the primary
Product path. Product tests must cover the Host snapshot, IPC denial, actual
Preview playback, feedback preview, undo/redo, stale closure and reopen; human
acceptance still reviews native consequential-action confirmation.

No Contract, permission-policy schema, Timeline Core, Edit IR, RenderGraph,
Worker or storage-ownership change is introduced by this decision.

## Migration and rollback

The projection and IPC surface are additive and require no data migration.
Rollback removes or disables the Stage 2 desktop surface and its IPC handlers;
all persisted Contract, Evidence, Story, Intent, execution, render, feedback and
Timeline state remains owned and readable by Project Host. Renderer caches may
always be discarded.
