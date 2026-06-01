const test = require('node:test');
const assert = require('node:assert/strict');
const describer = require('./describer.js');

test('describe: falls back to rule-based description if no aiProvider provided', async () => {
  const metadata = { label: 'Submit', role: 'button' };
  const result = await describer.describe(metadata);
  assert.equal(result, 'Click "Submit" (button)');
});

test('describe: falls back to rule-based description if aiProvider fails', async () => {
  const metadata = { label: 'Submit', role: 'button' };
  const mockProvider = {
    generateDescription: async () => { throw new Error('AI failed'); }
  };
  const result = await describer.describe(metadata, mockProvider);
  assert.equal(result, 'Click "Submit" (button)');
});

test('describe: uses aiProvider if provided and successful', async () => {
  const metadata = { label: 'Submit', role: 'button' };
  const mockProvider = {
    generateDescription: async (meta) => `AI description for ${meta.label}`
  };
  const result = await describer.describe(metadata, mockProvider);
  assert.equal(result, 'AI description for Submit');
});

test('describe: falls back to rule-based description if aiProvider returns falsy value', async () => {
  const metadata = { label: 'Submit', role: 'button' };
  const mockProvider = {
    generateDescription: async () => null
  };
  const result = await describer.describe(metadata, mockProvider);
  assert.equal(result, 'Click "Submit" (button)');
});

test('describer exports exactly the expected functions', () => {
  const exportsKeys = Object.keys(describer).sort();
  assert.deepEqual(exportsKeys, ['describe', 'loadActiveProvider', 'ruleBasedDescription'].sort());
});

// --- loadActiveProvider ---

test('loadActiveProvider: returns null when storage has no aiSettings', async () => {
  const mockStorage = { get: async () => ({}) };
  const result = await describer.loadActiveProvider(mockStorage);
  assert.equal(result, null);
});

test('loadActiveProvider: returns null when aiSettings is missing apiKey', async () => {
  const mockStorage = { get: async () => ({ aiSettings: { providerId: 'openai' } }) };
  const result = await describer.loadActiveProvider(mockStorage);
  assert.equal(result, null);
});

test('loadActiveProvider: returns adapter with generateDescription when settings are valid', async () => {
  const mockStorage = {
    get: async () => ({ aiSettings: { providerId: 'openai', apiKey: 'sk-test' } })
  };
  const provider = await describer.loadActiveProvider(mockStorage);
  assert.ok(provider !== null, 'provider should not be null');
  assert.equal(typeof provider.generateDescription, 'function');
});

test('loadActiveProvider: returned adapter passes metadata to provider and returns description', async () => {
  const mockStorage = {
    get: async () => ({ aiSettings: { providerId: 'openai', apiKey: 'sk-test' } })
  };

  // Intercept fetch so no real network call is made
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({ choices: [{ message: { content: 'Click the save button' } }] }),
  });

  try {
    const provider = await describer.loadActiveProvider(mockStorage);
    const result = await provider.generateDescription({ label: 'Save', role: 'button' });
    assert.equal(result, 'Click the save button');
  } finally {
    global.fetch = originalFetch;
  }
});

test('ruleBasedDescription: handles various metadata combinations', () => {
  assert.equal(describer.ruleBasedDescription({ label: 'Save', role: 'button' }), 'Click "Save" (button)');
  assert.equal(describer.ruleBasedDescription({ text: 'Link', role: 'link' }), 'Click "Link" (link)');
  assert.equal(describer.ruleBasedDescription({ tag: 'DIV' }), 'Click "DIV"');
});
