const { openDB, saveGuide, getGuide, saveStep, getStepsForGuide, deleteStep, getAllGuides, deleteGuide, getAllGuidesWithStepCounts } = window;

if (!saveGuide || !getAllGuidesWithStepCounts) {
  throw new Error("db-core.js is required but missing or outdated. Reload the extension.");
}

export { openDB, saveGuide, getGuide, saveStep, getStepsForGuide, deleteStep, getAllGuides, deleteGuide, getAllGuidesWithStepCounts };
