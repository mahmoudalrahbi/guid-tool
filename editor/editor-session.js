export function createEditorSession(db, { debounceMs = 300, onSaving, onSaved } = {}) {
  let guide = null;
  let steps = [];
  let saveTimeout = null;

  function scheduleSave() {
    if (onSaving) onSaving();
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      saveTimeout = null;
      try {
        await db.saveGuide(guide);
        await Promise.all(steps.map(s => db.saveStep(s)));
        if (onSaved) onSaved(true);
      } catch (err) {
        if (onSaved) onSaved(false, err);
      }
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
    updateStepAnnotation(stepId) {
      const step = steps.find(s => s.id === stepId);
      if (step) scheduleSave();
    },
    reorder(fromIndex, toIndex) {
      const [item] = steps.splice(fromIndex, 1);
      steps.splice(toIndex, 0, item);
      steps.forEach((s, i) => { s.order = i + 1; });
      scheduleSave();
    },
    undoDelete(token) {
      steps.splice(token.originalIndex, 0, token.step);
      steps.forEach((s, i) => { s.order = i + 1; });
      scheduleSave();
    },
    deleteStep(stepId) {
      const originalIndex = steps.findIndex(s => s.id === stepId);
      if (originalIndex === -1) return null;
      const [step] = steps.splice(originalIndex, 1);
      steps.forEach((s, i) => { s.order = i + 1; });
      scheduleSave();
      return { step, originalIndex };
    },
    isPending() {
      return saveTimeout !== null;
    },
    cancel() {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
        saveTimeout = null;
      }
    },
    async flush() {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
        saveTimeout = null;
      }
      try {
        await db.saveGuide(guide);
        await Promise.all(steps.map(s => db.saveStep(s)));
        if (onSaved) onSaved(true);
      } catch (err) {
        if (onSaved) onSaved(false, err);
        throw err;
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
