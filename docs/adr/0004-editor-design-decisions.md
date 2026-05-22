# Editor design decisions

Decisions extracted from the Editor design artifact (`docs/plan/Editor.html`). These apply to slice 5 (the Editor implementation) and any later work that touches the Editor surface.

## Step row anatomy is a fixed five-column grid

Every Step row uses the grid `drag handle · step number · Annotated Screenshot · description · actions`. The Annotated Screenshot is fixed-width (280 px, 16:10) so descriptions land on a consistent left edge. Description is an inline-edit `<textarea>` — clicking the text enters edit mode without a separate "Edit" button. Hover reveals the drag handle and per-Step actions; the row is uncluttered at rest.

## Amber is reserved for three Editor roles

`#F59E0B` appears in the Editor only as: (1) the Annotated Screenshot highlight ring drawn into the captured pixels, (2) the primary Export CTA in both the toolbar and the sticky footer, and (3) the focus ring on the description being edited and the drop-target indicator while drag-reordering. No amber on save-state, breadcrumb, rail, section labels, or secondary buttons. Same rule as the Side Panel — see [`0003-ui-design-decisions.md`](./0003-ui-design-decisions.md).

## Export button is duplicated at top and bottom — intentional

The toolbar Export and the sticky footer Export are both present. The Recorder reads Steps top-down; the footer button is what's under their thumb when they finish reviewing. Removing either copy breaks one of the two common scan patterns. Keep both.

## No explicit Save button — auto-save with a visible state pip

Every keystroke debounces a write to IndexedDB. The toolbar shows a save-state pip that flips between "Saved · just now" (green) and "Saving…" (animated grey). Closing the tab mid-edit must be safe. There is no manual Save action.

## Title and Description fields are unbordered until focused

The Title is a 28 px Inter SemiBold input that reads as a heading. The Description is a two-line auto-growing textarea below it. Both show muted placeholder copy when empty — *"Untitled Guide"* and *"Add a one-line description…"* — so the empty state still teaches the affordance. Same input pattern as Notion's page title.

## Step numbers are computed, not stored

The `01 / 02 / …` labels are derived from array index on render. Each Step has a stable `id`; reorder only mutates the `order` field. The Step rail's "Insert here" indicator operates on positions, not IDs.

## Delete is single-click with a 5-second undo toast — no modal

The Recorder will typically delete several junk Steps in a row. A confirm dialog per Step is painful. Single-click delete, undo toast for 5 seconds, then the Step (including its screenshot blob) is permanently removed. The undo must restore the blob, not just the description.

## Discard Guide is the one destructive action that requires a modal

The footer Discard button trashes the in-progress Guide and returns to the Popup. Because Discard takes the whole Guide, not one Step, it warrants a confirm dialog. Already-exported files are unaffected.

## Annotated Screenshot is immutable post-capture

The Editor can delete a Step but cannot re-draw its highlight or replace its screenshot. If the Recorder wants the click in a different spot, they re-record that fragment of the Session. Do not add an "edit screenshot" affordance — it implies capabilities the extension does not provide.

## Drop-target indicator is an amber 2-px bar between rows

While drag-reordering, sibling rows fade to 55% opacity; the dragged row gets an amber outline. The drop position is shown as a 2 px amber bar between rows with a leading 8 px dot. `Esc` cancels the drag.

## Step rail collapses below 1100 px

The 240 px Step rail is hidden on viewports narrower than 1100 px. Even though the Editor opens in a new tab (not the side panel), Recorders sometimes split-screen or use narrow secondary monitors. The main column must remain usable without the rail.

## Export menu lists four formats with a "what this is good for" hint each

PDF, DOCX, HTML, Markdown — same four as the PRD. Each entry shows a one-line hint (e.g. "Opens in any browser, images embedded") so the Recorder does not need to guess what the file extension implies. The menu opens above the footer Export button and clamps into the viewport at narrow widths.

## Export disabled when Step count is zero

The only invalid state for Export is a Guide with no Steps. Render the Export button at reduced opacity with `cursor: not-allowed`, do not hide it. The Recorder must be able to see the action exists even when they cannot take it.

## No "Add Step" affordance — recording is the only Step source

Steps come exclusively from the Recording Session. Manual Step creation is out of scope for v1 and showing the affordance would imply the Editor can author screenshots. If the Recorder needs more Steps, they re-record.

## Auto-save must cancel pending writes on delete

When the Recorder deletes a Step while a debounced description-save for that Step is in flight, the late write can resurrect the Step. Cancel pending writes by Step ID on delete, and reconcile at the IndexedDB transaction layer.

## Considered options

- **Modal for every delete** — rejected: the Recorder deletes multiple junk Steps per Editor session; a modal each time is friction. Undo toast is the standard pattern for this scale of action.
- **Single Export button (only one of toolbar or footer)** — rejected: top is visible on initial open, bottom is visible after scrolling through Steps. Removing either hurts one workflow.
- **Manual Save button** — rejected: PRD user story 22 specifies auto-save. Explicit Save would imply edits are otherwise lost.
- **"Add manual Step" button in the Editor** — rejected: out of scope; would imply the Editor can synthesize screenshots, which it cannot.
- **Two-column Step layout (parallel scanning)** — rejected: Steps are sequential by definition; parallel layout encourages out-of-order reading and makes drag-reorder targets ambiguous.
- **Edit Annotated Screenshot in-place** — rejected: the highlight is baked into the captured pixels at capture time; re-drawing in the Editor diverges Editor and exported-file rendering.
