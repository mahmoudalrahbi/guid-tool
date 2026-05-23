const test = require('node:test');
const assert = require('node:assert/strict');

test('auto-save: schedule triggers save function after debounce', async () => {
  const { createAutoSave } = await import('./auto-save.js');
  
  let saveCalls = 0;
  let savingCalls = 0;
  let savedCalls = 0;
  
  const schedule = createAutoSave(
    async () => { saveCalls++; },
    {
      debounceMs: 50,
      onSaving: () => { savingCalls++; },
      onSaved: () => { savedCalls++; }
    }
  );

  // Trigger multiple times rapidly
  schedule();
  schedule();
  schedule();

  // saving should be called 3 times synchronously
  assert.equal(savingCalls, 3);
  // save shouldn't be called yet
  assert.equal(saveCalls, 0);

  // Wait for debounce
  await new Promise(r => setTimeout(r, 60));

  // Should only be called once
  assert.equal(saveCalls, 1);
  assert.equal(savedCalls, 1);
});
