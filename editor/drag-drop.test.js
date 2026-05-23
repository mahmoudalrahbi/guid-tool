const test = require('node:test');
const assert = require('node:assert/strict');

function createMockElement(className = '') {
  return {
    className,
    classList: {
      classes: new Set(className ? className.split(' ') : []),
      add: function(c) { this.classes.add(c); },
      remove: function(c) { this.classes.delete(c); },
      contains: function(c) { return this.classes.has(c); }
    },
    dataset: {},
    children: [],
    listeners: {},
    addEventListener: function(event, cb) { 
      this.listeners[event] = this.listeners[event] || [];
      this.listeners[event].push(cb);
    },
    dispatchEvent: function(event, payload) {
      if (this.listeners[event]) this.listeners[event].forEach(cb => cb(payload));
    },
    closest: function(sel) {
      if (sel === '.step' && this.classList.contains('step')) return this;
      return null;
    },
    parentNode: {
      insertBefore: function(newNode, referenceNode) {
        // Simple mock
      }
    }
  };
}

const mockDoc = {
  listeners: {},
  addEventListener: function(event, cb) { 
    this.listeners[event] = this.listeners[event] || [];
    this.listeners[event].push(cb);
  },
  querySelectorAll: () => []
};

const mockWin = {
  innerHeight: 800,
  requestAnimationFrame: () => 1,
  cancelAnimationFrame: () => {}
};

test('attachDragAndDrop: binds events and handles drop reorder', async () => {
  const { attachDragAndDrop } = await import('./drag-drop.js');
  
  const stepsList = createMockElement();
  
  let reorderCalled = false;
  attachDragAndDrop(stepsList, mockDoc, mockWin, { UI_DRAG_THRESHOLD: 80 }, () => {
    reorderCalled = true;
  });
  
  // Test dragstart
  const stepEl = createMockElement('step');
  stepsList.dispatchEvent('dragstart', { target: stepEl, dataTransfer: {} });
  assert.ok(stepEl.classList.contains('dragging'));
  
  // Test drop on another step
  const stepTarget = createMockElement('step');
  stepsList.children = [stepTarget, stepEl]; // mock children array
  stepsList.dispatchEvent('drop', { target: stepTarget, preventDefault: () => {} });
  
  assert.equal(reorderCalled, true);
  
  // Test dragend
  stepsList.dispatchEvent('dragend', { target: stepEl });
  assert.ok(!stepEl.classList.contains('dragging'));
});
