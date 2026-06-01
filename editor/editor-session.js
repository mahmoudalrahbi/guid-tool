export function createEditorSession(db, { debounceMs = 300 } = {}) {
  let guide = null;
  let steps = [];
  let saveTimeout = null;

  function scheduleSave() {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      saveTimeout = null;
      await db.saveGuide(guide);
      await Promise.all(steps.map(s => db.saveStep(s)));
    }, debounceMs);
  }

  return {
    async load(guideId) {
      [guide, steps] = await Promise.all([
        db.getGuide(guideId),
        db.getStepsForGuide(guideId),
      ]);
    },
    updateTitle(text) {
      guide.title = text;
      scheduleSave();
    },
    updateDescription(text) {
      guide.description = text;
      scheduleSave();
    },
    updateStepDescription(stepId, text) {
      const step = steps.find(s => s.id === stepId);
      if (step) {
        step.description = text;
        scheduleSave();
      }
    },
    getGuide() {
      return { ...guide };
    },
    getSteps() {
      return [...steps];
    },
  };
}
