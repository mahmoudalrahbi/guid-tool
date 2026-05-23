# Export formats are isolated modules behind a registry seam

Each export format (PDF, DOCX, HTML, Markdown) is a separate module exporting a single async function with the signature `(guide, steps) => Promise<Blob>`. A central `exports/registry.js` holds the format list and dispatches the download. Adding a new format means adding one module and one entry in the registry — nothing else changes.

This was chosen over inline dispatch (a switch-case in editor.js) because the format list is likely to grow, and isolating each handler means format-specific bugs, dependencies, and rendering quirks stay contained to one file. The registry seam also makes it straightforward to add per-format options (e.g. page size for PDF, heading style for DOCX) without touching the orchestration layer.

## Considered options

- **Inline dispatch in editor.js** — rejected: format-specific logic would accumulate in the editor, mixing export concerns with editing concerns
- **Dynamic imports** — considered but skipped for now: all four formats are always available, so lazy loading adds complexity for no user-visible benefit
- **Registry pattern (chosen)** — one module per format, one registry, one seam for the download trigger
