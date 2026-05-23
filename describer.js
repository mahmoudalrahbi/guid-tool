// describer.js - Handles step description logic

function ruleBasedDescription(meta) {
  const label = meta.label || meta.text || meta.tag;
  const role = meta.role ? ` (${meta.role})` : "";
  return `Click "${label}"${role}`;
}

async function describe(metadata, aiProvider = null) {
  if (aiProvider) {
    try {
      return await aiProvider.generateDescription(metadata);
    } catch (err) {
      console.warn("AI provider failed to generate description, falling back to rule-based:", err);
    }
  }
  return ruleBasedDescription(metadata);
}

// CJS export for node:test runner. Ignored in browser context.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ruleBasedDescription,
    describe,
  };
}
