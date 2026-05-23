# Guide History query is a db-core projection, not a shared module

The Guide History list in the Popup needs a Guide's id, title, step count, and most-recent-activity timestamp (`updatedAt ?? createdAt`). The N+1 query pattern (one `getStepsForGuide()` call per Guide) was fixed by adding `getAllGuidesWithStepCounts()` to `db-core.js`, returning `{ id, title, lastActivityAt, stepCount }[]` sorted newest-first.

We considered extracting a shared `loadGuideHistory()` module, but there is only one caller (`popup.js`). A module with one caller fails the deletion test — delete it and complexity moves back into the caller unchanged. No leverage is gained. The projection lives in `db-core.js` alongside the other storage operations, and `popup.js` calls it directly via the `db.js` re-export.

## Considered options

- **Shared `loadGuideHistory()` module** — rejected: one caller, no leverage, fails deletion test. Re-evaluate if a second surface (e.g. a settings page or a search view) needs the same data.
- **Projection in `db-core.js` (chosen)** — the join and sort happen once at the storage layer; callers get a ready-to-render slice with no fallback logic to repeat.
