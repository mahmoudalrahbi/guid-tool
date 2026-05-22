# LocalGuide v1 — Vertical Slices

Breakdown of [PRD #1](https://github.com/mahmoudalrahbi/guid-tool/issues/1) into tracer-bullet vertical slices. Published as GitHub issues on 2026-05-22.

## Design artifacts

| Surface | File | Informs slices |
|---------|------|----------------|
| Side Panel (Waiting, Recording Active, Paused) + Popup | [`LocalGuide.html`](LocalGuide.html) | 2, 4, 8 |
| Editor (Default, Drag-reorder, Export menu, Empty) | [`Editor.html`](Editor.html) | 1, 5 |

Key decisions extracted from the designs:
- Side Panel + Popup → [`docs/adr/0003-ui-design-decisions.md`](../adr/0003-ui-design-decisions.md)
- Editor → [`docs/adr/0004-editor-design-decisions.md`](../adr/0004-editor-design-decisions.md)

## Slices

| # | Issue | Title | Type | Blocked by | User stories |
|---|-------|-------|------|------------|--------------|
| 1 | [#2](https://github.com/mahmoudalrahbi/guid-tool/issues/2) | Editor UI prototype | HITL | none | 16–22 (informs the Editor build) |
| 2 | [#3](https://github.com/mahmoudalrahbi/guid-tool/issues/3) | **Tracer**: single-click Recording Session → Editor → HTML export | AFK | none | 1, 2, 6, 8, 9, 10, 11, 17, 23 (subset), 25, 27, 33 |
| 3 | [#4](https://github.com/mahmoudalrahbi/guid-tool/issues/4) | Multi-step recording + URL navigation capture | AFK | #3 | 3, 4, 7 |
| 4 | [#5](https://github.com/mahmoudalrahbi/guid-tool/issues/5) | Pause / Resume / Complete Capture controls | AFK | #4 | 5, 6 |
| 5 | [#6](https://github.com/mahmoudalrahbi/guid-tool/issues/6) | Editor: edit description, delete, reorder, set Title/Description, auto-save | AFK | #3, #2 | 18, 19, 20, 21, 22 |
| 6 | [#7](https://github.com/mahmoudalrahbi/guid-tool/issues/7) | Export format registry + PDF format module | AFK | #3 | 23, 27 |
| 7 | [#8](https://github.com/mahmoudalrahbi/guid-tool/issues/8) | DOCX + Markdown export modules | AFK | #7 | 24, 26, 27 |
| 8 | [#9](https://github.com/mahmoudalrahbi/guid-tool/issues/9) | Guide History in Popup (list, re-open, delete) | AFK | #3, #6 | 29, 30, 31, 32 |
| 9 | [#10](https://github.com/mahmoudalrahbi/guid-tool/issues/10) | AI descriptions: BYOK path + Settings UI + provider registry | AFK | #3 | 13, 14, 15 |
| 10 | [#11](https://github.com/mahmoudalrahbi/guid-tool/issues/11) | AI descriptions: Google Gemini OAuth integration | HITL | #10 | 12, 14 |

## Rationale

- **Slice 2 is an intentionally throwaway tracer** — hardcoded title, no editing, one click, ugly UI. It proves all five surfaces talk to each other and IndexedDB persists across service-worker restarts. Everything else layers on top.
- **Slice 1 (HITL)** is the Editor design prototype to complete before slice 5. The tracer (2) is not gated on it; it uses a minimal Editor stub.
- **Slice 10 (HITL)** because Google OAuth requires Google Cloud Console client-ID setup, which can't be done by an agent.
- **Export registry** lives inside slice 6 rather than its own slice — the registry interface only matters once a second format consumes it, and shipping it with PDF gives it real usage immediately.
- **DOCX + Markdown merged** into one slice (was slices 7 + 8) — both follow the same module interface and can be built together without meaningful extra complexity.
- **Guide History depends on the full Editor** (slice 5 / #6) so re-opened Guides land in the real Editor, not the tracer stub.
