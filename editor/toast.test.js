const test = require('node:test');
const assert = require('node:assert/strict');

// Mock DOM
global.document = {
  createElement: (tag) => {
    return {
      tagName: tag,
      className: '',
      innerHTML: '',
      children: [],
      appendChild: function(child) { this.children.push(child); },
      remove: function() { this.removed = true; },
      style: {}
    };
  }
};

// Mock setTimeout
let pendingTimeouts = [];
const originalSetTimeout = global.setTimeout;

test.beforeEach(() => {
  pendingTimeouts = [];
  global.setTimeout = (cb, ms) => {
    pendingTimeouts.push(cb);
    return 123;
  };
});

test.afterEach(() => {
  global.setTimeout = originalSetTimeout;
});

function flushTimeouts() {
  const current = pendingTimeouts;
  pendingTimeouts = [];
  current.forEach(cb => cb());
}

test('showToast: undo callback fires when the undo button is clicked', async () => {

  const { showToast } = await import('./toast.js');
  
  const host = { children: [], appendChild: function(child) { this.children.push(child); } };
  const config = { UI_TOAST_ANIMATION_MS: 0, UI_TOAST_FADEOUT_MS: 0, EDITOR: { UNDO_TIMEOUT_MS: 0 } };
  
  let undoCalled = false;
  showToast(host, 'Test message', config, () => { undoCalled = true; });
  
  const toast = host.children[0];
  const btn = toast.children[0]; // the undo button
  btn.onclick();
  
  assert.equal(undoCalled, true);
  assert.equal(toast.removed, true);
});

test('showToast: no undo button is rendered when undoFn is not provided', async () => {

  const { showToast } = await import('./toast.js');
  
  const host = { children: [], appendChild: function(child) { this.children.push(child); } };
  const config = { UI_TOAST_ANIMATION_MS: 0, UI_TOAST_FADEOUT_MS: 0, EDITOR: { UNDO_TIMEOUT_MS: 0 } };
  
  showToast(host, 'Test message', config);
  
  const toast = host.children[0];
  assert.equal(toast.children.length, 0);
});

test('showToast: toast element is removed from the host after the configured timeout elapses', async () => {

  const { showToast } = await import('./toast.js');
  
  const host = { children: [], appendChild: function(child) { this.children.push(child); } };
  const config = { UI_TOAST_ANIMATION_MS: 0, UI_TOAST_FADEOUT_MS: 0, EDITOR: { UNDO_TIMEOUT_MS: 0 } };
  
  showToast(host, 'Test message', config, () => {});
  
  const toast = host.children[0];
  assert.notEqual(toast.removed, true);
  
  flushTimeouts(); // fires the UNDO_TIMEOUT_MS callback
  flushTimeouts(); // fires the UI_TOAST_FADEOUT_MS callback
  
  assert.equal(toast.removed, true);
});

test('showToast: toast with no undo is still removed after timeout', async () => {
  pendingTimeouts = [];
  const { showToast } = await import('./toast.js');
  
  const host = { children: [], appendChild: function(child) { this.children.push(child); } };
  const config = { UI_TOAST_ANIMATION_MS: 0, UI_TOAST_FADEOUT_MS: 0, EDITOR: { UNDO_TIMEOUT_MS: 0 } };
  
  showToast(host, 'Test message', config);
  
  const toast = host.children[0];
  assert.notEqual(toast.removed, true);
  
  flushTimeouts(); // fires the UNDO_TIMEOUT_MS callback
  flushTimeouts(); // fires the UI_TOAST_FADEOUT_MS callback
  
  assert.equal(toast.removed, true);
});
