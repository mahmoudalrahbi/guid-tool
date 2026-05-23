const { test, beforeEach, describe } = require('node:test');
const assert = require('node:assert/strict');
const { IDBFactory } = require('fake-indexeddb');
require('fake-indexeddb/auto');

global.CONFIG = require('./config.js');
const dbCore = require('./db-core.js');

describe('db-core', { concurrency: false }, () => {
  beforeEach(() => {
    global.indexedDB = new IDBFactory();
  });

test('saves and retrieves a guide', async () => {
  const guide = {
    id: 'g-1',
    title: 'Test Guide',
    description: 'Test description',
    createdAt: Date.now()
  };

  await dbCore.saveGuide(guide);
  const retrieved = await dbCore.getGuide('g-1');
  assert.deepEqual(retrieved, guide);
});

test('saves and retrieves steps for a guide', async () => {
  const step1 = { id: 's-1', guideId: 'g-2', order: 2, text: 'Second step' };
  const step2 = { id: 's-2', guideId: 'g-2', order: 1, text: 'First step' };
  
  await dbCore.saveStep(step1);
  await dbCore.saveStep(step2);
  
  const steps = await dbCore.getStepsForGuide('g-2');
  assert.equal(steps.length, 2);
  // Should be sorted by order
  assert.equal(steps[0].id, 's-2');
  assert.equal(steps[1].id, 's-1');
});

test('deletes a step', async () => {
  const step = { id: 's-3', guideId: 'g-3', order: 1, text: 'To delete' };
  await dbCore.saveStep(step);
  await dbCore.deleteStep('s-3');
  
  const steps = await dbCore.getStepsForGuide('g-3');
  assert.equal(steps.length, 0);
});

test('gets all guides', async () => {
  const guide1 = { id: 'g-4', title: 'Guide 4' };
  const guide2 = { id: 'g-5', title: 'Guide 5' };
  await dbCore.saveGuide(guide1);
  await dbCore.saveGuide(guide2);
  
  const guides = await dbCore.getAllGuides();
  assert.ok(guides.find(g => g.id === 'g-4'));
  assert.ok(guides.find(g => g.id === 'g-5'));
});

test('deletes a guide and its associated steps', async () => {
  const guide = { id: 'g-6', title: 'To delete' };
  const step = { id: 's-4', guideId: 'g-6', order: 1, text: 'Step to delete' };
  
  await dbCore.saveGuide(guide);
  await dbCore.saveStep(step);
  
  await dbCore.deleteGuide('g-6');
  
  const retrievedGuide = await dbCore.getGuide('g-6');
  assert.equal(retrievedGuide, undefined);
  
  const retrievedSteps = await dbCore.getStepsForGuide('g-6');
  assert.equal(retrievedSteps.length, 0);
});

test('getAllGuidesWithStepCounts returns correct step count and lastActivityAt, sorted newest-first', async () => {
  const guide1 = { id: 'g-7', title: 'Guide 7', createdAt: 1000 };
  const guide2 = { id: 'g-8', title: 'Guide 8', createdAt: 2000, updatedAt: 4000 };
  const guide3 = { id: 'g-9', title: 'Guide 9', createdAt: 3000 }; // lastActivityAt = 3000
  
  await dbCore.saveGuide(guide1);
  await dbCore.saveGuide(guide2);
  await dbCore.saveGuide(guide3);
  
  // Add 1 step to guide1
  await dbCore.saveStep({ id: 's-5', guideId: 'g-7', order: 1, text: 'step' });
  // Add 2 steps to guide2
  await dbCore.saveStep({ id: 's-6', guideId: 'g-8', order: 1, text: 'step' });
  await dbCore.saveStep({ id: 's-7', guideId: 'g-8', order: 2, text: 'step' });
  // Guide 3 has 0 steps

  const results = await dbCore.getAllGuidesWithStepCounts();
  
  assert.equal(results.length, 3);
  
  // Expected order by lastActivityAt descending: guide2 (4000), guide3 (3000), guide1 (1000)
  assert.equal(results[0].id, 'g-8');
  assert.equal(results[0].stepCount, 2);
  assert.equal(results[0].lastActivityAt, 4000);
  assert.equal(results[0].title, 'Guide 8');
  
  assert.equal(results[1].id, 'g-9');
  assert.equal(results[1].stepCount, 0);
  assert.equal(results[1].lastActivityAt, 3000);
  
  assert.equal(results[2].id, 'g-7');
  assert.equal(results[2].stepCount, 1);
  assert.equal(results[2].lastActivityAt, 1000);
});
});
