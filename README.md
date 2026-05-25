# LocalGuide

A Chrome extension (Manifest V3) that records browser workflows and exports them as annotated, step-by-step guides — with no server, no subscription, and no external storage.

LocalGuide is a self-hosted alternative to Scribe, built for teams that need to document internal workflows without sending sensitive data to a third-party service.

## Features

- Records clicks and navigations in any browser tab
- Annotates screenshots with click position highlights
- Edit, reorder, and delete steps in the built-in Editor
- Export as **PDF**, **DOCX**, **HTML**, or **Markdown**
- Opt-in AI-generated step descriptions (Google Gemini via OAuth, or any provider via BYOK)
- All data stays on your machine — no backend, no accounts

## Install (development)

1. Clone the repository
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** and select this directory

## Usage

1. Click the **LocalGuide** extension icon to open the Popup
2. Click **Start Recording** — the Side Panel opens
3. Perform your workflow in any tab; each click is captured as a Step
4. Click **Complete Capture** in the Side Panel
5. The **Editor** opens in a new tab — review, edit, and reorder Steps
6. Click **Export** and choose a format

## Architecture

| Surface | File(s) | Role |
|---|---|---|
| Popup | `popup.html/js` | Start recording; view Guide History |
| Content Script | `content.js` | Capture clicks and navigations in tabs |
| Background SW | `background.js` | Screenshot capture; Step persistence to IndexedDB |
| Side Panel | `sidepanel.html/js` | Live step view during Recording Session |
| Editor | `editor.html/js` | Review, edit, and export the completed Guide |
| Exports | `exports/` | One module per format (PDF, DOCX, HTML, Markdown) |

See [`CONTEXT.md`](CONTEXT.md) for the canonical domain glossary and [`docs/adr/`](docs/adr/) for key architectural decisions.

## Development

### Prerequisites

- Node.js ≥ 18
- Chrome ≥ 114

### Run tests

```bash
npm test
```

Tests use Node's built-in test runner (`node --test`). No additional test framework needed.

### Project structure

```
background.js         # Background service worker
content.js            # Tab content script
sidepanel.html/js     # Side Panel UI
editor.html/js        # Editor UI
popup.html/js         # Popup UI
exports/              # Export format modules
db-core.js            # IndexedDB layer
annotator.js          # Annotation overlay logic
describer.js          # Step description generation
docs/adr/             # Architecture decision records
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT — see [LICENSE](LICENSE).
