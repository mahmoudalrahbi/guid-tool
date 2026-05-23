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
  assert.deepEqual(exportsKeys, ['describe', 'ruleBasedDescription'].sort());
});

test('ruleBasedDescription: handles various metadata combinations', () => {
  assert.equal(describer.ruleBasedDescription({ label: 'Save', role: 'button' }), 'Click "Save" (button)');
  assert.equal(describer.ruleBasedDescription({ text: 'Link', role: 'link' }), 'Click "Link" (link)');
  assert.equal(describer.ruleBasedDescription({ tag: 'DIV' }), 'Click "DIV"');
});
