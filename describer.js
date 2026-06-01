// describer.js - Handles step description logic

function ruleBasedDescription(meta) {
  const label = meta.label || meta.text || meta.tag;
  const role = meta.role ? ` (${meta.role})` : "";
  return `Click "${label}"${role}`;
}

async function describe(metadata, aiProvider = null) {
  if (aiProvider) {
    try {
      const result = await aiProvider.generateDescription(metadata);
      if (result) return result;
      console.warn("AI provider returned empty description, falling back to rule-based.");
    } catch (err) {
      console.warn("AI provider failed to generate description, falling back to rule-based:", err);
    }
  }
  return ruleBasedDescription(metadata);
}

/**
 * Reads chrome.storage.local for a configured AI provider and returns a
 * minimal adapter satisfying { generateDescription(metadata) → Promise<string> },
 * or null when nothing is configured.
 *
 * Accepts an optional `storage` argument for testability; defaults to
 * chrome.storage.local in the browser context.
 *
 * Storage key: 'aiSettings' — shape: { providerId: string, apiKey: string }
 */
async function loadActiveProvider(storage) {
  var store = storage || (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local);
  if (!store) return null;

  var data = await store.get('aiSettings');
  var settings = data.aiSettings;
  if (!settings || !settings.providerId || !settings.apiKey) return null;

  return {
    generateDescription: async function(metadata) {
      var prompt = 'Describe this UI action in one short sentence: ' +
        'element="' + (metadata.label || metadata.text || metadata.tag || '') + '"' +
        (metadata.role ? ' role="' + metadata.role + '"' : '');

      var response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + settings.apiKey,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 60,
        }),
      });

      if (!response.ok) throw new Error('AI request failed: ' + response.status);
      var json = await response.json();
      return (json.choices[0].message.content || '').trim();
    }
  };
}

// CJS export for node:test runner. Ignored in browser context.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ruleBasedDescription,
    describe,
    loadActiveProvider,
  };
}
