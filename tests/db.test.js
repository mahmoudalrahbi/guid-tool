const { createGuide, addStep, getGuide, getStepsForGuide, listGuides, closeDb, resetDbForTests } = require('../src/db.js');

beforeEach(async () => {
  await resetDbForTests();
});

afterAll(async () => {
  await closeDb();
});

describe('IndexedDB persistence layer', () => {
  test('createGuide returns a Guide with id, title, timestamps, and empty stepIds', async () => {
    const guide = await createGuide({ title: 'Untitled Guide' });
    expect(guide.id).toEqual(expect.any(String));
    expect(guide.id.length).toBeGreaterThan(0);
    expect(guide.title).toBe('Untitled Guide');
    expect(guide.stepIds).toEqual([]);
    expect(guide.createdAt).toEqual(expect.any(Number));
    expect(guide.updatedAt).toEqual(expect.any(Number));
  });

  test('getGuide returns a previously created Guide', async () => {
    const created = await createGuide({ title: 'Workflow A' });
    const fetched = await getGuide(created.id);
    expect(fetched).not.toBeNull();
    expect(fetched.id).toBe(created.id);
    expect(fetched.title).toBe('Workflow A');
  });

  test('getGuide returns null for an unknown id', async () => {
    expect(await getGuide('does-not-exist')).toBeNull();
  });

  test('addStep persists the Step and links it to the Guide', async () => {
    const guide = await createGuide({ title: 'Test' });
    const blob = new Blob(['fake-jpeg'], { type: 'image/jpeg' });

    const step = await addStep(guide.id, {
      description: 'Click "Sign in"',
      screenshotBlob: blob,
      elementMetadata: { tagName: 'BUTTON', text: 'Sign in' },
    });

    expect(step.id).toEqual(expect.any(String));
    expect(step.guideId).toBe(guide.id);
    expect(step.order).toBe(0);
    expect(step.description).toBe('Click "Sign in"');
    expect(step.screenshotBlob).toBeInstanceOf(Blob);

    const reloadedGuide = await getGuide(guide.id);
    expect(reloadedGuide.stepIds).toEqual([step.id]);

    const steps = await getStepsForGuide(guide.id);
    expect(steps).toHaveLength(1);
    expect(steps[0].id).toBe(step.id);
    expect(steps[0].description).toBe('Click "Sign in"');
  });

  test('multiple addStep calls preserve insertion order', async () => {
    const guide = await createGuide({ title: 'Multi-step' });
    const blob = new Blob(['x'], { type: 'image/jpeg' });

    const s1 = await addStep(guide.id, { description: 'A', screenshotBlob: blob, elementMetadata: {} });
    const s2 = await addStep(guide.id, { description: 'B', screenshotBlob: blob, elementMetadata: {} });

    const steps = await getStepsForGuide(guide.id);
    expect(steps.map(s => s.id)).toEqual([s1.id, s2.id]);
    expect(steps.map(s => s.order)).toEqual([0, 1]);
  });

  test('Steps survive a simulated service-worker restart (db close/reopen)', async () => {
    const guide = await createGuide({ title: 'Persistent' });
    const blob = new Blob(['x'], { type: 'image/jpeg' });
    const step = await addStep(guide.id, {
      description: 'Click button',
      screenshotBlob: blob,
      elementMetadata: { tagName: 'BUTTON' },
    });

    await closeDb();

    const reloadedGuide = await getGuide(guide.id);
    expect(reloadedGuide.stepIds).toEqual([step.id]);

    const steps = await getStepsForGuide(guide.id);
    expect(steps).toHaveLength(1);
    expect(steps[0].description).toBe('Click button');
  });

  test('listGuides returns all guides sorted by updatedAt descending', async () => {
    const g1 = await createGuide({ title: 'Older' });
    await new Promise(r => setTimeout(r, 5));
    const g2 = await createGuide({ title: 'Newer' });

    const list = await listGuides();
    expect(list.map(g => g.id)).toEqual([g2.id, g1.id]);
  });
});
