const { openDB, saveGuide, getGuide, saveStep, getStepsForGuide, deleteStep, getAllGuides, deleteGuide } = window;

if (!saveGuide) {
  throw new Error("db-core.js is required but missing. Ensure it is loaded before db.js.");
}

export { openDB, saveGuide, getGuide, saveStep, getStepsForGuide, deleteStep, getAllGuides, deleteGuide };
