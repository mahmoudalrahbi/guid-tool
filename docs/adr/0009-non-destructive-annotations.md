# ADR 0009 — Non-Destructive Annotations

## Status
Proposed

## Context
Previously, `background.js` called `annotator.js` immediately after `captureVisibleTab`, drawing the highlight circle onto the screenshot pixels before saving the blob to IndexedDB. Because the annotation was baked into the image, a misaligned highlight could only be fixed by deleting the Step and re-recording it.

## Decision
Store annotation data separately from the raw screenshot blob. Each click-originated Step stores:
- `screenshotBlob` — the raw, unmodified JPEG screenshot
- `annotation: { x, y, dpr, radius, color }` — the parameters needed to reproduce the highlight circle

A `stepType` discriminator (`"click"` | `"navigation"` | `"legacy"`) identifies how the Step was captured:
- `"click"` — has annotation data; highlight is rendered as an overlay in the Editor and composited at export time
- `"navigation"` — no annotation data; screenshot is displayed as-is
- `"legacy"` — Step was saved before this ADR; has a baked-annotation blob and no annotation data; displayed as-is with no reposition affordance

### Compositing pipeline
- **Side Panel** (during Recording Session): receives raw `screenshotDataUrl` + annotation data via `MSG_STEP_ADDED`; composites the thumbnail locally using `<canvas>`
- **Editor**: renders the highlight as a draggable HTML/CSS or SVG overlay over the raw image; Recorder can reposition before export
- **Export**: a new `compositor.js` module (loaded by `editor.html`) exposes a `composite(step)` function that draws the annotation onto a `<canvas>` and returns the final image blob; all export format modules call this instead of receiving pre-composed images

### Backward compatibility
Pre-existing Steps in IndexedDB are surfaced as `stepType: "legacy"`. The Editor detects this and displays the baked image without an overlay. No migration or pixel-analysis is attempted.

## Consequences
- The Recorder can reposition a misaligned highlight in the Editor without re-recording the Step.
- `background.js` no longer calls `annotator.js` at capture time; `annotator.js` may be retired or absorbed into `compositor.js`.
- Export modules gain a dependency on `compositor.js` but lose any image-compositing logic of their own.
- The `"legacy"` branch in the Editor must be maintained until old Guides age out of Guide History.
