const test = require('node:test');
const assert = require('node:assert/strict');

global.CONFIG = require('./config.js');
const messages = require('./messages.js');
global.createStoredStep = messages.createStoredStep;
global.toStepMessage = messages.toStepMessage;
global.MSG_STEP_ADDED = messages.MSG_STEP_ADDED;
const utils = require('./utils.js');
global.dataUrlToBlob = utils.dataUrlToBlob;

const { createStepCapture } = require('./step-capture.js');

const FAKE_DATA_URL = 'data:image/jpeg;base64,AA==';
const FAKE_DESCRIPTION = 'Click the submit button';
const BASE_SESSION = { tabId: 1, guideId: 'g-1', stepCount: 0, lastUrl: 'https://example.com/page' };
const CLICK_META = { label: 'Submit', role: 'button', x: 100, y: 200, dpr: 2 };

function makeDb() {
  const saved = { steps: [] };
  return {
    saveStep: async (s) => { saved.steps.push(s); },
    saved,
  };
}

function makeDeps(overrides = {}) {
  return {
    screenshot: async () => FAKE_DATA_URL,
    describer: async () => FAKE_DESCRIPTION,
    db: makeDb(),
    broadcast: () => {},
    ...overrides,
  };
}

// ── captureClick ──────────────────────────────────────────────────────────────

test('StepCapture: captureClick saves a click Step to db', async () => {
  const deps = makeDeps();
  const capture = createStepCapture(deps);
  await capture.captureClick(CLICK_META, BASE_SESSION);
  assert.equal(deps.db.saved.steps.length, 1);
  assert.equal(deps.db.saved.steps[0].stepType, 'click');
});

test('StepCapture: captureClick uses injected describer for step description', async () => {
  const deps = makeDeps({ describer: async () => 'Custom AI description' });
  const capture = createStepCapture(deps);
  await capture.captureClick(CLICK_META, BASE_SESSION);
  assert.equal(deps.db.saved.steps[0].description, 'Custom AI description');
});

test('StepCapture: captureClick builds a step that passes createStoredStep validation', async () => {
  const deps = makeDeps();
  const capture = createStepCapture(deps);
  await capture.captureClick(CLICK_META, BASE_SESSION);
  const step = deps.db.saved.steps[0];
  assert.equal(step.id, 'step-g-1-1');
  assert.equal(step.guideId, 'g-1');
  assert.equal(step.order, 1);
  assert.equal(step.stepType, 'click');
  assert.equal(step.url, BASE_SESSION.lastUrl);
  assert.ok(step.screenshotBlob instanceof Blob, 'screenshotBlob must be a Blob');
  assert.ok(step.createdAt > 0, 'createdAt must be set');
  assert.ok(step.annotation, 'annotation required for click step');
  assert.equal(step.annotation.x, CLICK_META.x);
  assert.equal(step.annotation.y, CLICK_META.y);
  assert.equal(step.annotation.dpr, CLICK_META.dpr);
  assert.equal(step.annotation.radius, CONFIG.ANNOTATION.RADIUS_PX);
  assert.equal(step.annotation.color, CONFIG.ANNOTATION.COLOR);
  assert.equal(step.annotation.strokeWidth, CONFIG.ANNOTATION.STROKE_WIDTH_PX);
});

test('StepCapture: captureClick broadcasts MSG_STEP_ADDED with toStepMessage payload', async () => {
  const broadcasts = [];
  const deps = makeDeps({ broadcast: (msg) => broadcasts.push(msg) });
  const capture = createStepCapture(deps);
  await capture.captureClick(CLICK_META, BASE_SESSION);
  assert.equal(broadcasts.length, 1);
  const msg = broadcasts[0];
  assert.equal(msg.type, MSG_STEP_ADDED);
  assert.equal(msg.step.id, 'step-g-1-1');
  assert.equal(msg.step.screenshotDataUrl, FAKE_DATA_URL);
  assert.ok(msg.step.annotation, 'broadcast step must include annotation');
});

test('StepCapture: captureClick rejects when db.saveStep fails', async () => {
  const deps = makeDeps({
    db: { saveStep: async () => { throw new Error('IndexedDB write failed'); } },
  });
  const capture = createStepCapture(deps);
  await assert.rejects(
    () => capture.captureClick(CLICK_META, BASE_SESSION),
    /IndexedDB write failed/,
  );
});

// ── captureNavigation ─────────────────────────────────────────────────────────

test('StepCapture: captureNavigation saves a navigation Step with correct shape', async () => {
  const NAV_SESSION = { tabId: 1, guideId: 'g-1', stepCount: 2 };
  const URL = 'https://example.com/settings';
  const describerSpy = async () => { throw new Error('describer must not be called for navigation'); };
  const deps = makeDeps({ describer: describerSpy });
  const capture = createStepCapture(deps);
  await capture.captureNavigation(URL, NAV_SESSION);
  const step = deps.db.saved.steps[0];
  assert.equal(step.stepType, 'navigation');
  assert.equal(step.order, 3);
  assert.equal(step.url, URL);
  assert.equal(step.description, `Navigated to ${URL}`);
  assert.equal(step.annotation, undefined, 'navigation step must not have annotation');
  assert.ok(step.screenshotBlob instanceof Blob);
});

test('StepCapture: captureNavigation broadcasts MSG_STEP_ADDED', async () => {
  const broadcasts = [];
  const deps = makeDeps({ broadcast: (msg) => broadcasts.push(msg) });
  const capture = createStepCapture(deps);
  const URL = 'https://example.com/settings';
  await capture.captureNavigation(URL, { tabId: 1, guideId: 'g-1', stepCount: 0 });
  assert.equal(broadcasts.length, 1);
  assert.equal(broadcasts[0].type, MSG_STEP_ADDED);
  assert.equal(broadcasts[0].step.screenshotDataUrl, FAKE_DATA_URL);
});

test('StepCapture: captureNavigation rejects when db.saveStep fails', async () => {
  const deps = makeDeps({
    db: { saveStep: async () => { throw new Error('write error'); } },
  });
  const capture = createStepCapture(deps);
  await assert.rejects(
    () => capture.captureNavigation('https://example.com', { tabId: 1, guideId: 'g-1', stepCount: 0 }),
    /write error/,
  );
});
