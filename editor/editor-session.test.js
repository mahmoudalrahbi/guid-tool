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

test('EditorSession: getGuide returns a shallow copy (mutations do not affect internal state)', async () => {
  const { createEditorSession } = await import('./editor-session.js');
  const db = makeDb({ id: 'g1', title: 'Original' }, []);
  const session = createEditorSession(db);
  await session.load('g1');
  const g = session.getGuide();
  g.title = 'Mutated externally';
  assert.equal(session.getGuide().title, 'Original');
});
