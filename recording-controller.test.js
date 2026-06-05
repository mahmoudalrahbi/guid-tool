const test = require('node:test');
const assert = require('node:assert/strict');

const messages = require('./messages.js');
const { createRecordingController } = require('./recording-controller.js');

function makeDeps(overrides = {}) {
  const session = { guideId: 'g-1', tabId: 1, stepCount: 0, active: true, lastUrl: 'https://example.com', paused: false };
  let stored = { session };
  return {
    storage: {
      get: async (key) => ({ [key]: stored[key] }),
      set: async (obj) => { Object.assign(stored, obj); },
    },
    tabs: {
      get: async (tabId) => ({ id: tabId, url: 'https://example.com', windowId: 99 }),
      sendMessage: async () => {},
      create: async () => {},
    },
    sidePanel: { open: async () => {}, setOptions: async () => {} },
    runtime: { getURL: (p) => `chrome-extension://fake/${p}`, sendMessage: async () => {} },
    buildStepCapture: () => ({
      captureClick: async () => ({ step: { order: 1 } }),
      captureNavigation: async () => ({ step: { order: 1 } }),
    }),
    db: { saveGuide: async () => {} },
    config: { UI_NAV_DELAY_MS: 500 },
    _stored: stored,
    ...overrides,
  };
}

// ── handleStartRecording ──────────────────────────────────────────────────────

test('handleStartRecording writes a session to storage with active: true', async () => {
  const deps = makeDeps();
  deps._stored.session = undefined;
  const ctrl = createRecordingController(deps);
  await ctrl.handleStartRecording(42);
  const { session } = await deps.storage.get('session');
  assert.ok(session, 'session must be written to storage');
  assert.equal(session.active, true);
  assert.equal(session.tabId, 42);
});

test('handleStartRecording calls deps.db.saveGuide with an untitled Guide', async () => {
  const saved = [];
  const deps = makeDeps({ db: { saveGuide: async (g) => { saved.push(g); } } });
  deps._stored.session = undefined;
  const ctrl = createRecordingController(deps);
  await ctrl.handleStartRecording(1);
  assert.equal(saved.length, 1);
  assert.equal(saved[0].title, 'Untitled Guide');
  assert.ok(saved[0].id, 'id must be set');
  assert.ok(saved[0].createdAt > 0, 'createdAt must be set');
});

test('handleStartRecording opens the side panel before writing to storage', async () => {
  const order = [];
  let storageWritten = false;
  const deps = makeDeps({
    sidePanel: {
      open: async () => { order.push('sidePanel.open'); },
      setOptions: async () => {},
    },
    storage: {
      get: async (key) => ({ [key]: deps._stored[key] }),
      set: async (obj) => {
        if (obj.session) order.push('storage.set');
        Object.assign(deps._stored, obj);
      },
    },
  });
  deps._stored.session = undefined;
  const ctrl = createRecordingController(deps);
  await ctrl.handleStartRecording(1);
  assert.equal(order[0], 'sidePanel.open', 'sidePanel.open must be called before storage.set');
  assert.ok(order.includes('storage.set'), 'storage must eventually be written');
});

test('handleStartRecording sends MSG_RECORDING_STARTED to the content script', async () => {
  const sent = [];
  const deps = makeDeps({
    tabs: {
      get: async (tabId) => ({ id: tabId, url: 'https://example.com' }),
      sendMessage: async (tabId, msg) => { sent.push({ tabId, msg }); },
      create: async () => {},
    },
  });
  deps._stored.session = undefined;
  const ctrl = createRecordingController(deps);
  await ctrl.handleStartRecording(7);
  const recordingStarted = sent.find(m => m.msg.type === messages.MSG_RECORDING_STARTED);
  assert.ok(recordingStarted, 'MSG_RECORDING_STARTED must be sent');
  assert.equal(recordingStarted.tabId, 7);
});

// ── handleClickCaptured ───────────────────────────────────────────────────────

test('handleClickCaptured calls stepCapture.captureClick with metadata', async () => {
  const clicks = [];
  const deps = makeDeps({
    buildStepCapture: () => ({
      captureClick: async (meta) => { clicks.push(meta); return { step: { order: 1 } }; },
      captureNavigation: async () => ({ step: { order: 1 } }),
    }),
  });
  const ctrl = createRecordingController(deps);
  await ctrl.handleClickCaptured({ label: 'Submit', role: 'button' });
  assert.equal(clicks.length, 1);
  assert.equal(clicks[0].label, 'Submit');
});

test('handleClickCaptured skips capture when session is paused', async () => {
  const clicks = [];
  const deps = makeDeps({
    buildStepCapture: () => ({
      captureClick: async (meta) => { clicks.push(meta); return { step: { order: 1 } }; },
      captureNavigation: async () => ({ step: { order: 1 } }),
    }),
  });
  deps._stored.session = { ...deps._stored.session, paused: true };
  const ctrl = createRecordingController(deps);
  await ctrl.handleClickCaptured({ label: 'Submit' });
  assert.equal(clicks.length, 0, 'captureClick must not be called when paused');
});

test('handleClickCaptured skips capture when session is not active', async () => {
  const clicks = [];
  const deps = makeDeps({
    buildStepCapture: () => ({
      captureClick: async (meta) => { clicks.push(meta); return { step: { order: 1 } }; },
      captureNavigation: async () => ({ step: { order: 1 } }),
    }),
  });
  deps._stored.session = { ...deps._stored.session, active: false };
  const ctrl = createRecordingController(deps);
  await ctrl.handleClickCaptured({ label: 'Submit' });
  assert.equal(clicks.length, 0, 'captureClick must not be called when session is inactive');
});

test('handleClickCaptured updates stepCount in storage after a successful capture', async () => {
  const deps = makeDeps({
    buildStepCapture: () => ({
      captureClick: async () => ({ step: { order: 3 } }),
      captureNavigation: async () => ({ step: { order: 1 } }),
    }),
  });
  deps._stored.session = { ...deps._stored.session, stepCount: 2 };
  const ctrl = createRecordingController(deps);
  await ctrl.handleClickCaptured({ label: 'Next' });
  const { session } = await deps.storage.get('session');
  assert.equal(session.stepCount, 3);
});

test('handleClickCaptured swallows errors from captureClick without throwing', async () => {
  const deps = makeDeps({
    buildStepCapture: () => ({
      captureClick: async () => { throw new Error('capture failed'); },
      captureNavigation: async () => ({ step: { order: 1 } }),
    }),
  });
  const ctrl = createRecordingController(deps);
  // Must resolve, not reject
  await assert.doesNotReject(() => ctrl.handleClickCaptured({ label: 'Boom' }));
});

test('buildStepCapture is called exactly once across multiple handleClickCaptured calls (lazy init)', async () => {
  let buildCallCount = 0;
  const deps = makeDeps({
    buildStepCapture: () => {
      buildCallCount++;
      return {
        captureClick: async () => ({ step: { order: buildCallCount } }),
        captureNavigation: async () => ({ step: { order: 1 } }),
      };
    },
  });
  const ctrl = createRecordingController(deps);
  await ctrl.handleClickCaptured({ label: 'A' });
  await ctrl.handleClickCaptured({ label: 'B' });
  await ctrl.handleClickCaptured({ label: 'C' });
  assert.equal(buildCallCount, 1, 'buildStepCapture must be called exactly once');
});

// ── handleCompleteCapture ─────────────────────────────────────────────────────

test('handleCompleteCapture marks the session as inactive in storage', async () => {
  const deps = makeDeps();
  const ctrl = createRecordingController(deps);
  await ctrl.handleCompleteCapture();
  const { session } = await deps.storage.get('session');
  assert.equal(session.active, false);
});

test('handleCompleteCapture sends MSG_RECORDING_STOPPED to the content script', async () => {
  const sent = [];
  const deps = makeDeps({
    tabs: {
      get: async (tabId) => ({ id: tabId, url: 'https://example.com' }),
      sendMessage: async (tabId, msg) => { sent.push({ tabId, msg }); },
      create: async () => {},
    },
  });
  const ctrl = createRecordingController(deps);
  await ctrl.handleCompleteCapture();
  const stopped = sent.find(m => m.msg.type === messages.MSG_RECORDING_STOPPED);
  assert.ok(stopped, 'MSG_RECORDING_STOPPED must be sent');
});

test('handleCompleteCapture opens the Editor tab with the correct URL', async () => {
  const created = [];
  const deps = makeDeps({
    tabs: {
      get: async (tabId) => ({ id: tabId, url: 'https://example.com' }),
      sendMessage: async () => {},
      create: async (opts) => { created.push(opts); },
    },
  });
  deps._stored.session = { ...deps._stored.session, guideId: 'g-1' };
  const ctrl = createRecordingController(deps);
  await ctrl.handleCompleteCapture();
  assert.equal(created.length, 1);
  assert.ok(created[0].url.includes('editor.html'), 'editor.html must be in the URL');
  assert.ok(created[0].url.includes('g-1'), 'guideId must be in the URL');
});


test('handleCompleteCapture returns {ok: true}', async () => {
  const deps = makeDeps();
  const ctrl = createRecordingController(deps);
  const result = await ctrl.handleCompleteCapture();
  assert.deepEqual(result, { ok: true });
});

// ── handlePauseRecording ──────────────────────────────────────────────────────

test('handlePauseRecording sets paused: true in storage', async () => {
  const deps = makeDeps();
  deps._stored.session = { ...deps._stored.session, paused: false };
  const ctrl = createRecordingController(deps);
  await ctrl.handlePauseRecording();
  const { session } = await deps.storage.get('session');
  assert.equal(session.paused, true);
});

test('handlePauseRecording returns {ok: false} when no active session exists', async () => {
  const deps = makeDeps();
  deps._stored.session = undefined;
  const ctrl = createRecordingController(deps);
  const result = await ctrl.handlePauseRecording();
  assert.deepEqual(result, { ok: false });
});

// ── handleResumeRecording ─────────────────────────────────────────────────────

test('handleResumeRecording sets paused: false in storage', async () => {
  const deps = makeDeps();
  deps._stored.session = { ...deps._stored.session, paused: true };
  const ctrl = createRecordingController(deps);
  await ctrl.handleResumeRecording();
  const { session } = await deps.storage.get('session');
  assert.equal(session.paused, false);
});
