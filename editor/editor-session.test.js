const test = require('node:test');
const assert = require('node:assert/strict');

function makeDb(guide, steps) {
  const saved = { guide: null, steps: [] };
  return {
    getGuide: async () => ({ ...guide }),
    getStepsForGuide: async () => steps.map(s => ({ ...s })),
    saveGuide: async (g) => { saved.guide = g; },
    saveStep: async (s) => { saved.steps.push(s); },
    saved,
  };
}

test('EditorSession: load() populates guide from db', async () => {
  const { createEditorSession } = await import('./editor-session.js');
  const db = makeDb({ id: 'g1', title: 'My Guide' }, []);
  const session = createEditorSession(db);
  await session.load('g1');
  assert.equal(session.getGuide().title, 'My Guide');
});

test('EditorSession: getSteps() returns steps in order after load', async () => {
  const { createEditorSession } = await import('./editor-session.js');
  const db = makeDb({ id: 'g1', title: 'G' }, [
    { id: 's1', order: 1, description: 'First' },
    { id: 's2', order: 2, description: 'Second' },
  ]);
  const session = createEditorSession(db);
  await session.load('g1');
  const steps = session.getSteps();
  assert.equal(steps.length, 2);
  assert.equal(steps[0].id, 's1');
  assert.equal(steps[1].id, 's2');
});

test('EditorSession: updateTitle mutates guide title', async () => {
  const { createEditorSession } = await import('./editor-session.js');
  const db = makeDb({ id: 'g1', title: 'Old Title' }, []);
  const session = createEditorSession(db, { debounceMs: 0 });
  await session.load('g1');
  session.updateTitle('New Title');
  assert.equal(session.getGuide().title, 'New Title');
});

test('EditorSession: updateTitle schedules a save to db', async () => {
  const { createEditorSession } = await import('./editor-session.js');
  const db = makeDb({ id: 'g1', title: 'Old' }, []);
  const session = createEditorSession(db, { debounceMs: 0 });
  await session.load('g1');
  session.updateTitle('Saved Title');
  await new Promise(r => setTimeout(r, 20));
  assert.ok(db.saved.guide !== null, 'saveGuide should have been called');
  assert.equal(db.saved.guide.title, 'Saved Title');
});

test('EditorSession: updateStepDescription mutates the correct step', async () => {
  const { createEditorSession } = await import('./editor-session.js');
  const db = makeDb({ id: 'g1', title: 'G' }, [
    { id: 's1', order: 1, description: 'Old desc' },
    { id: 's2', order: 2, description: 'Other' },
  ]);
  const session = createEditorSession(db, { debounceMs: 0 });
  await session.load('g1');
  session.updateStepDescription('s1', 'New desc');
  const steps = session.getSteps();
  assert.equal(steps.find(s => s.id === 's1').description, 'New desc');
  assert.equal(steps.find(s => s.id === 's2').description, 'Other');
});

test('EditorSession: updateStepDescription schedules a save', async () => {
  const { createEditorSession } = await import('./editor-session.js');
  const db = makeDb({ id: 'g1', title: 'G' }, [
    { id: 's1', order: 1, description: 'Old' },
  ]);
  const session = createEditorSession(db, { debounceMs: 0 });
  await session.load('g1');
  session.updateStepDescription('s1', 'Updated');
  await new Promise(r => setTimeout(r, 20));
  assert.ok(db.saved.steps.length > 0, 'saveStep should have been called');
  assert.equal(db.saved.steps[0].description, 'Updated');
});

test('EditorSession: isPending() returns true after updateTitle before debounce fires', async () => {
  const { createEditorSession } = await import('./editor-session.js');
  const db = makeDb({ id: 'g1', title: 'G' }, []);
  const session = createEditorSession(db, { debounceMs: 10000 });
  await session.load('g1');
  session.updateTitle('Changed');
  assert.equal(session.isPending(), true);
  session.cancel(); // clean up timer
});

test('EditorSession: flush() persists immediately and isPending() returns false', async () => {
  const { createEditorSession } = await import('./editor-session.js');
  const db = makeDb({ id: 'g1', title: 'G' }, []);
  const session = createEditorSession(db, { debounceMs: 10000 });
  await session.load('g1');
  session.updateTitle('Flushed');
  assert.equal(session.isPending(), true);
  await session.flush();
  assert.equal(session.isPending(), false);
  assert.ok(db.saved.guide !== null, 'saveGuide should have been called by flush');
  assert.equal(db.saved.guide.title, 'Flushed');
});

test('EditorSession: cancel() clears pending flag and no db write occurs', async () => {
  const { createEditorSession } = await import('./editor-session.js');
  const db = makeDb({ id: 'g1', title: 'G' }, []);
  const session = createEditorSession(db, { debounceMs: 10000 });
  await session.load('g1');
  session.updateTitle('Will be cancelled');
  session.cancel();
  assert.equal(session.isPending(), false);
  await new Promise(r => setTimeout(r, 20));
  assert.equal(db.saved.guide, null, 'no db write should occur after cancel');
});

test('EditorSession: flush() rejects if db.saveGuide throws', async () => {
  const { createEditorSession } = await import('./editor-session.js');
  const db = {
    getGuide: async () => ({ id: 'g1', title: 'G' }),
    getStepsForGuide: async () => [],
    saveGuide: async () => { throw new Error('disk full'); },
    saveStep: async () => {},
    saved: { guide: null, steps: [] },
  };
  const session = createEditorSession(db, { debounceMs: 10000 });
  await session.load('g1');
  session.updateTitle('Fail');
  await assert.rejects(() => session.flush(), /disk full/);
});

test('EditorSession: reorder(0, 2) moves first step to last', async () => {
  const { createEditorSession } = await import('./editor-session.js');
  const db = makeDb({ id: 'g1', title: 'G' }, [
    { id: 's1', order: 1, description: 'A' },
    { id: 's2', order: 2, description: 'B' },
    { id: 's3', order: 3, description: 'C' },
  ]);
  const session = createEditorSession(db);
  await session.load('g1');
  session.reorder(0, 2);
  const steps = session.getSteps();
  assert.deepEqual(steps.map(s => s.id), ['s2', 's3', 's1']);
});

test('EditorSession: reorder(2, 0) moves last step to first', async () => {
  const { createEditorSession } = await import('./editor-session.js');
  const db = makeDb({ id: 'g1', title: 'G' }, [
    { id: 's1', order: 1, description: 'A' },
    { id: 's2', order: 2, description: 'B' },
    { id: 's3', order: 3, description: 'C' },
  ]);
  const session = createEditorSession(db);
  await session.load('g1');
  session.reorder(2, 0);
  const steps = session.getSteps();
  assert.deepEqual(steps.map(s => s.id), ['s3', 's1', 's2']);
});

test('EditorSession: reorder(1, 3) moves middle step to last in a 4-step list', async () => {
  const { createEditorSession } = await import('./editor-session.js');
  const db = makeDb({ id: 'g1', title: 'G' }, [
    { id: 's1', order: 1, description: 'A' },
    { id: 's2', order: 2, description: 'B' },
    { id: 's3', order: 3, description: 'C' },
    { id: 's4', order: 4, description: 'D' },
  ]);
  const session = createEditorSession(db);
  await session.load('g1');
  session.reorder(1, 3);
  const steps = session.getSteps();
  assert.deepEqual(steps.map(s => s.id), ['s1', 's3', 's4', 's2']);
});

test('EditorSession: order values are contiguous after reorder', async () => {
  const { createEditorSession } = await import('./editor-session.js');
  const db = makeDb({ id: 'g1', title: 'G' }, [
    { id: 's1', order: 1, description: 'A' },
    { id: 's2', order: 2, description: 'B' },
    { id: 's3', order: 3, description: 'C' },
  ]);
  const session = createEditorSession(db);
  await session.load('g1');
  session.reorder(0, 2);
  const steps = session.getSteps();
  assert.deepEqual(steps.map(s => s.order), [1, 2, 3]);
});

test('EditorSession: reorder schedules a save', async () => {
  const { createEditorSession } = await import('./editor-session.js');
  const db = makeDb({ id: 'g1', title: 'G' }, [
    { id: 's1', order: 1, description: 'A' },
    { id: 's2', order: 2, description: 'B' },
  ]);
  const session = createEditorSession(db, { debounceMs: 0 });
  await session.load('g1');
  session.reorder(0, 1);
  await new Promise(r => setTimeout(r, 20));
  assert.ok(db.saved.guide !== null, 'saveGuide should have been called after reorder');
});

test('EditorSession: deleteStep removes step from getSteps()', async () => {
  const { createEditorSession } = await import('./editor-session.js');
  const db = makeDb({ id: 'g1', title: 'G' }, [
    { id: 's1', order: 1, description: 'A' },
    { id: 's2', order: 2, description: 'B' },
  ]);
  const session = createEditorSession(db);
  await session.load('g1');
  session.deleteStep('s1');
  const steps = session.getSteps();
  assert.equal(steps.length, 1);
  assert.equal(steps[0].id, 's2');
});

test('EditorSession: deleteStep returns token { step, originalIndex }', async () => {
  const { createEditorSession } = await import('./editor-session.js');
  const db = makeDb({ id: 'g1', title: 'G' }, [
    { id: 's1', order: 1, description: 'A' },
    { id: 's2', order: 2, description: 'B' },
  ]);
  const session = createEditorSession(db);
  await session.load('g1');
  const token = session.deleteStep('s1');
  assert.equal(token.step.id, 's1');
  assert.equal(token.originalIndex, 0);
});

test('EditorSession: order values are contiguous after deleteStep', async () => {
  const { createEditorSession } = await import('./editor-session.js');
  const db = makeDb({ id: 'g1', title: 'G' }, [
    { id: 's1', order: 1, description: 'A' },
    { id: 's2', order: 2, description: 'B' },
    { id: 's3', order: 3, description: 'C' },
  ]);
  const session = createEditorSession(db);
  await session.load('g1');
  session.deleteStep('s1');
  const steps = session.getSteps();
  assert.deepEqual(steps.map(s => s.order), [1, 2]);
  assert.equal(steps[0].id, 's2');
  assert.equal(steps[1].id, 's3');
});

test('EditorSession: undoDelete re-inserts step at original index', async () => {
  const { createEditorSession } = await import('./editor-session.js');
  const db = makeDb({ id: 'g1', title: 'G' }, [
    { id: 's1', order: 1, description: 'A' },
    { id: 's2', order: 2, description: 'B' },
    { id: 's3', order: 3, description: 'C' },
  ]);
  const session = createEditorSession(db);
  await session.load('g1');
  const token = session.deleteStep('s2');
  session.undoDelete(token);
  const steps = session.getSteps();
  assert.equal(steps.length, 3);
  assert.equal(steps[1].id, 's2');
});

test('EditorSession: order values are contiguous after undoDelete', async () => {
  const { createEditorSession } = await import('./editor-session.js');
  const db = makeDb({ id: 'g1', title: 'G' }, [
    { id: 's1', order: 1, description: 'A' },
    { id: 's2', order: 2, description: 'B' },
    { id: 's3', order: 3, description: 'C' },
  ]);
  const session = createEditorSession(db);
  await session.load('g1');
  const token = session.deleteStep('s2');
  session.undoDelete(token);
  const steps = session.getSteps();
  assert.deepEqual(steps.map(s => s.order), [1, 2, 3]);
});

test('EditorSession: deleteStep schedules a save', async () => {
  const { createEditorSession } = await import('./editor-session.js');
  const db = makeDb({ id: 'g1', title: 'G' }, [
    { id: 's1', order: 1, description: 'A' },
  ]);
  const session = createEditorSession(db, { debounceMs: 0 });
  await session.load('g1');
  session.deleteStep('s1');
  await new Promise(r => setTimeout(r, 20));
  assert.ok(db.saved.guide !== null, 'saveGuide should have been called after deleteStep');
});

test('EditorSession: getGuide returns a shallow copy (mutations do not affect internal state)', async () => {
  const { createEditorSession } = await import('./editor-session.js');
  const db = makeDb({ id: 'g1', title: 'Original' }, []);
  const session = createEditorSession(db);
  await session.load('g1');
  const g = session.getGuide();
  g.title = 'Mutated externally';
  assert.equal(session.getGuide().title, 'Original');
});

// ── Single persistence owner ──────────────────────────────────────────────────

test('EditorSession: a burst of mutations within one debounce window fires exactly one saveGuide call', async () => {
  const { createEditorSession } = await import('./editor-session.js');
  let saveGuideCallCount = 0;
  const db = {
    getGuide: async () => ({ id: 'g1', title: 'G', description: '' }),
    getStepsForGuide: async () => [],
    saveGuide: async () => { saveGuideCallCount++; },
    saveStep: async () => {},
  };
  const session = createEditorSession(db, { debounceMs: 50 });
  await session.load('g1');

  session.updateTitle('A');
  session.updateTitle('B');
  session.updateTitle('C');

  await new Promise(r => setTimeout(r, 100));
  assert.equal(saveGuideCallCount, 1, 'saveGuide must be called exactly once per idle window');
});

test('EditorSession: onSaving callback is called immediately when a mutation is made', async () => {
  const { createEditorSession } = await import('./editor-session.js');
  const db = makeDb({ id: 'g1', title: 'G' }, []);
  const savingEvents = [];
  const session = createEditorSession(db, {
    debounceMs: 10000,
    onSaving: () => savingEvents.push('saving'),
  });
  await session.load('g1');
  session.updateTitle('New');
  assert.equal(savingEvents.length, 1);
  assert.equal(savingEvents[0], 'saving');
  session.cancel();
});

test('EditorSession: onSaved(true) is called once after the debounce window completes', async () => {
  const { createEditorSession } = await import('./editor-session.js');
  const db = makeDb({ id: 'g1', title: 'G' }, []);
  const savedEvents = [];
  const session = createEditorSession(db, {
    debounceMs: 0,
    onSaved: (success) => savedEvents.push(success),
  });
  await session.load('g1');
  session.updateTitle('A');
  session.updateTitle('B');
  await new Promise(r => setTimeout(r, 20));
  assert.equal(savedEvents.length, 1, 'onSaved must be called exactly once');
  assert.equal(savedEvents[0], true);
});

test('EditorSession: onSaved(false) is called when saveGuide throws', async () => {
  const { createEditorSession } = await import('./editor-session.js');
  const db = {
    getGuide: async () => ({ id: 'g1', title: 'G' }),
    getStepsForGuide: async () => [],
    saveGuide: async () => { throw new Error('disk full'); },
    saveStep: async () => {},
  };
  const savedEvents = [];
  const session = createEditorSession(db, {
    debounceMs: 0,
    onSaved: (success) => savedEvents.push(success),
  });
  await session.load('g1');
  session.updateTitle('Fail');
  await new Promise(r => setTimeout(r, 20));
  assert.equal(savedEvents.length, 1);
  assert.equal(savedEvents[0], false);
});

test('EditorSession: flush() calls onSaved after draining the pending write', async () => {
  const { createEditorSession } = await import('./editor-session.js');
  const db = makeDb({ id: 'g1', title: 'G' }, []);
  const savedEvents = [];
  const session = createEditorSession(db, {
    debounceMs: 10000,
    onSaved: (success) => savedEvents.push(success),
  });
  await session.load('g1');
  session.updateTitle('Flush me');
  await session.flush();
  assert.equal(savedEvents.length, 1);
  assert.equal(savedEvents[0], true);
});

// ── updateStepAnnotation ──────────────────────────────────────────────────────

test('EditorSession: updateStepAnnotation schedules a save with the updated annotation', async () => {
  const { createEditorSession } = await import('./editor-session.js');
  const db = makeDb({ id: 'g1', title: 'G' }, [
    { id: 's1', order: 1, description: 'Click here', annotation: { x: 100, y: 200, dpr: 1 } },
  ]);
  const session = createEditorSession(db, { debounceMs: 0 });
  await session.load('g1');

  // Simulate what step-card.js does: mutate annotation on the shared step reference
  const steps = session.getSteps();
  steps[0].annotation = { x: 300, y: 400, dpr: 2 };

  session.updateStepAnnotation('s1');
  await new Promise(r => setTimeout(r, 20));

  assert.ok(db.saved.steps.length > 0, 'saveStep should have been called');
  assert.deepEqual(db.saved.steps[0].annotation, { x: 300, y: 400, dpr: 2 });
});

test('EditorSession: updateStepAnnotation with unknown stepId is a no-op', async () => {
  const { createEditorSession } = await import('./editor-session.js');
  const db = makeDb({ id: 'g1', title: 'G' }, [
    { id: 's1', order: 1, description: 'A', annotation: { x: 10, y: 20, dpr: 1 } },
  ]);
  const session = createEditorSession(db, { debounceMs: 0 });
  await session.load('g1');

  assert.doesNotThrow(() => session.updateStepAnnotation('nonexistent'));
  await new Promise(r => setTimeout(r, 20));
  assert.equal(db.saved.steps.length, 0, 'saveStep should not be called for unknown stepId');
});
