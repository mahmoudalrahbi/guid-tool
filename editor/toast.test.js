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

test('showToast: appends toast to host and handles undo', async () => {
  const { showToast } = await import('./toast.js');
  
  const host = {
    children: [],
    appendChild: function(child) { this.children.push(child); }
  };
  const config = {
    UI_TOAST_ANIMATION_MS: 0,
    UI_TOAST_FADEOUT_MS: 0,
    EDITOR: { UNDO_TIMEOUT_MS: 0 }
  };
  
  let undoCalled = false;
  showToast(host, 'Test message', config, () => { undoCalled = true; });
  
  assert.equal(host.children.length, 1);
  const toast = host.children[0];
  assert.equal(toast.className, 'toast');
  assert.ok(toast.innerHTML.includes('Test message'));
  
  // Call undo
  const btn = toast.children[0]; // the undo button
  btn.onclick();
  
  assert.equal(undoCalled, true);
  assert.equal(toast.removed, true);
});
