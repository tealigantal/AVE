# WP-CA-PRODUCT-003 Canonical desktop Stage 2 product path

## Outcome

Make the ordinary desktop journey use one Stage 2 topology and one set of
Project Host routes from project creation through current Preview review.

## Required behavior

- Desktop project create/open establishes or requires one disabled reference
  source track and one enabled neutral output track.
- Imported media is added to the reference source track; ordinary Timeline
  controls never target the generated output track accidentally.
- Desktop Timeline IPC exposes only reference-track add/move/trim; generic
  topology mutation and generic undo/redo are not product routes.
- Renderer reads review, Render, QC and current Preview only through the Stage
  2 workspace/current-preview authority.
- Renderer never infers a current Material Pack from historical rows when the
  Host omits an exact current authority reference.
- Remove direct Assembly, legacy Render/Preview, Compare/Reaction, Delivery and
  Export desktop routes and every Renderer fallback or state field that exists
  only for those routes.
- A non-canonical current project fails explicitly; it is not converted.
- Open delays Job recovery until topology and current execution-owned output
  validation pass. Feedback is independently restricted to output clips owned
  by the selected base execution lineage.
- Production lifecycle test hooks are not moved in this package; the dedicated
  E2E harness package owns their removal.

## Non-goals

No project-format conversion, production-free Electron harness, real-media
human acceptance or merge.

## Validation

Run Renderer/IPC/desktop boundaries, Host workbench, Electron runtime, Stage 2
workspace/product actions, type, architecture and documentation gates. Close
with exact fingerprint Evidence and independent read-only review.
