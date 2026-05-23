# Handoff — LocalGuide Structural Refactor

**Date:** 2026-05-23  
**Repo:** https://github.com/mahmoudalrahbi/guid-tool  
**Branch:** `guid-tool-v3`  
**Working directory:** `/Users/macbook/Desktop/guid-tool`

---

## What happened this session

1. Ran a full architecture review of the LocalGuide Chrome extension — found six structural friction points (duplicated code, implicit message contracts, god modules, scattered magic values).
2. Produced an HTML architecture report (saved to OS temp dir, already read by the user).
3. Saved findings to project memory and created ADR-0004 for the export registry pattern.
4. Published PRD issue #13 on GitHub.
5. Broke the PRD into six independently-grabbable implementation issues (#14–#19), each with documentation requirements.

---

## What to do next

**Implement the six refactor slices in dependency order.** Each issue is self-contained with acceptance criteria. Start with #14–#17 (no blockers, can run in parallel), then #18 and #19.

### Issue map

| Issue | Title | Blocked by | Key doc output |
|-------|-------|-----------|----------------|
| [#14](https://github.com/mahmoudalrahbi/guid-tool/issues/14) | Extract `utils.js` + test runner | — | ADR-0005 |
| [#15](https://github.com/mahmoudalrahbi/guid-tool/issues/15) | Consolidate DB into `db-core.js` | — | ADR-0006 |
| [#16](https://github.com/mahmoudalrahbi/guid-tool/issues/16) | Add `messages.js` contract layer | — | — |
| [#17](https://github.com/mahmoudalrahbi/guid-tool/issues/17) | Extract `config.js` magic values | — | — |
| [#18](https://github.com/mahmoudalrahbi/guid-tool/issues/18) | Extract `annotator.js` + `describer.js` | #16, #17 | ADR-0007 |
| [#19](https://github.com/mahmoudalrahbi/guid-tool/issues/19) | Decompose `editor.js` | #14 | — |

### ADRs to create as part of implementation

- **ADR-0005** (in slice #14): Test runner choice — framework, environment, why it was chosen over alternatives for a Chrome MV3 extension context.
- **ADR-0006** (in slice #15): Chrome MV3 `importScripts` constraint — why `db-core.js` must be plain JS with no `import`/`export`.
- **ADR-0007** (in slice #18): Describer adapter seam — why the AI provider is injected as an argument to `describe()` rather than imported directly; this decision is load-bearing for the AI descriptions workstream.

---

## Key files to read before starting

- `CLAUDE.md` — architecture overview and MV3 constraints
- `CONTEXT.md` — domain glossary; use these terms precisely
- `docs/adr/` — four existing ADRs (0001–0004); don't re-litigate them
- Project memory: `/Users/macbook/.claude/projects/-Users-macbook-Desktop-guid-tool/memory/project-localguide.md` — known bugs, current state, architecture review findings

---

## Critical constraints

- **No user-visible behavior change** — all six slices are pure internal refactors. If a test or manual check shows different behavior, something is wrong.
- **`db-core.js` must have zero ES module syntax** — `importScripts()` in the background service worker cannot handle `import`/`export`. Plain JS globals only.
- **Do not collapse the export registry** — ADR-0004 records this as deliberate. Don't turn it into a switch-case.
- **Fix none of the known bugs in this work** — the known bugs (delete undo, export menu double-prefix, object URL leak, etc.) are tracked separately. Touching them here muddies the review.

---

## Suggested skills

- `/tdd` — implement each slice test-first; the acceptance criteria map directly to red-green cycles. Start with `utils.js` (slice #14) since all four functions are pure and establish the test runner pattern.
- `/verify` — after each slice, verify the extension still works end-to-end in the browser before marking done.
- `/code-review` — run on each PR before merging to catch regressions in the refactor.
