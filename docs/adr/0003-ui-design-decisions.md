# UI design decisions — Side Panel and Popup

Decisions extracted from the Side Panel + Popup design artifact (`docs/plan/LocalGuide.html`). These apply to all implementation slices that touch the Side Panel or Popup surfaces.

## Amber is a signal color, not a decoration

`#F59E0B` is reserved for exactly four roles: the pulsing recording dot, the highlight ring on Annotated Screenshot thumbnails, the single primary CTA on each surface, and the latest-Step number and thumbnail border. No secondary button, label, or icon may borrow amber. The moment a non-primary element uses amber, the recording indicator loses its urgency signal.

## Fonts must be bundled — no external CDN

Chrome extension CSP blocks requests to `fonts.googleapis.com` by default. Inter and JetBrains Mono (used in the design) must be either bundled as local font files or replaced with `system-ui` / `ui-monospace` fallbacks. Do not add a `font-src` CSP exception.

## Timer must store elapsed ms, not start timestamp

The status row shows elapsed recording time. Store `activeMs` (cumulative milliseconds while recording) and increment it only while recording is active. Do not store `startedAt` and compute `now - startedAt` — a long pause silently inflates the displayed duration.

## Layout must be fluid, not fixed at 360px

The side panel width is user-adjustable. All layouts must use fluid widths: Annotated Screenshot thumbnails use `aspect-ratio: 16/10` and `width: 100%`; description text uses `min-width: 0` so long URLs truncate via `text-overflow: ellipsis`. Never hard-code `360px` in component styles.

## IndexedDB storage must surface a warning before quota is hit

At ~50–150 KB per Step, storage fills faster than users expect. The Popup footer shows current usage. When total IndexedDB usage crosses ~80% of the quota, render the storage indicator in amber as a warning. Do not wait for a write failure to notify the Recorder.

## Paused state swaps primary and secondary CTA roles

In Paused state, Resume Recording is the amber primary button and Complete Capture shrinks to a secondary button. Complete Capture remains accessible — Recorders sometimes pause specifically because they are done and should not be forced to resume to finish. Never hide Complete Capture in Paused state.

## Empty Step description must render a placeholder, never collapse the row

Rule-based generation can produce an empty string (e.g. a click on an element with no accessible name, role, or label). Render a muted placeholder such as "Describe this Step" so the row remains tappable and editable. A collapsed or zero-height Step row is not acceptable.

## Considered options

- **Treat amber as a general brand accent** — rejected because it dilutes the recording-active signal, which is the most safety-critical UI state in the extension.
- **Use Google Fonts CDN** — rejected due to extension CSP constraints; bundled or system fonts only.
- **Fixed 360px panel width** — rejected because Chrome allows the user to resize the side panel; fluid layout is required.
