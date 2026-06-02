const test = require('node:test');
const assert = require('node:assert/strict');

const {
  startSession,
  recordStep,
  pauseSession,
  resumeSession,
  navigate,
  completeSession,
  canCapture,
} = require('./recording-session.js');

// ── startSession ──────────────────────────────────────────────────────────────

test('startSession returns a fresh active unpaused session', () => {
  const session = startSession({ guideId: 'g-1', tabId: 7, url: 'https://example.com' });
  assert.equal(session.guideId, 'g-1');
  assert.equal(session.tabId, 7);
  assert.equal(session.lastUrl, 'https://example.com');
  assert.equal(session.stepCount, 0);
  assert.equal(session.active, true);
  assert.equal(session.paused, false);
});

// ── recordStep ────────────────────────────────────────────────────────────────

test('recordStep increments stepCount by one', () => {
  const s0 = startSession({ guideId: 'g-1', tabId: 1, url: 'https://a.com' });
  const s1 = recordStep(s0);
  assert.equal(s1.stepCount, 1);
  const s2 = recordStep(s1);
  assert.equal(s2.stepCount, 2);
});

// ── pauseSession / resumeSession ──────────────────────────────────────────────

test('pauseSession sets paused to true', () => {
  const s = startSession({ guideId: 'g-1', tabId: 1, url: 'https://a.com' });
  const paused = pauseSession(s);
  assert.equal(paused.paused, true);
});

test('resumeSession sets paused to false', () => {
  const s = pauseSession(startSession({ guideId: 'g-1', tabId: 1, url: 'https://a.com' }));
  const resumed = resumeSession(s);
  assert.equal(resumed.paused, false);
});

// ── navigate ──────────────────────────────────────────────────────────────────

test('navigate updates lastUrl', () => {
  const s = startSession({ guideId: 'g-1', tabId: 1, url: 'https://a.com' });
  const navigated = navigate(s, 'https://b.com');
  assert.equal(navigated.lastUrl, 'https://b.com');
});

// ── completeSession ───────────────────────────────────────────────────────────

test('completeSession sets active to false', () => {
  const s = startSession({ guideId: 'g-1', tabId: 1, url: 'https://a.com' });
  const completed = completeSession(s);
  assert.equal(completed.active, false);
});

// ── canCapture ────────────────────────────────────────────────────────────────

test('canCapture is true when active and not paused', () => {
  const s = startSession({ guideId: 'g-1', tabId: 1, url: 'https://a.com' });
  assert.equal(canCapture(s), true);
});

test('canCapture is false when paused', () => {
  const s = pauseSession(startSession({ guideId: 'g-1', tabId: 1, url: 'https://a.com' }));
  assert.equal(canCapture(s), false);
});

test('canCapture is false when session is not active', () => {
  const s = completeSession(startSession({ guideId: 'g-1', tabId: 1, url: 'https://a.com' }));
  assert.equal(canCapture(s), false);
});

// ── illegal moves return session unchanged ────────────────────────────────────

test('recordStep returns session unchanged when not capturable (paused)', () => {
  const s = pauseSession(startSession({ guideId: 'g-1', tabId: 1, url: 'https://a.com' }));
  const result = recordStep(s);
  assert.equal(result.stepCount, 0);
  assert.equal(result.paused, true);
});

test('recordStep returns session unchanged when not capturable (completed)', () => {
  const s = completeSession(startSession({ guideId: 'g-1', tabId: 1, url: 'https://a.com' }));
  const result = recordStep(s);
  assert.equal(result.stepCount, 0);
  assert.equal(result.active, false);
});

test('pauseSession returns session unchanged when already completed', () => {
  const s = completeSession(startSession({ guideId: 'g-1', tabId: 1, url: 'https://a.com' }));
  const result = pauseSession(s);
  assert.equal(result.active, false);
  assert.equal(result.paused, false);
});
