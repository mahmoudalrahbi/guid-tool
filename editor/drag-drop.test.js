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
    removeEventListener: function(event, cb) {
      if (this.listeners[event]) {
        this.listeners[event] = this.listeners[event].filter(l => l !== cb);
      }
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

const createMockDoc = () => ({
  listeners: {},
  addEventListener: function(event, cb) { 
    this.listeners[event] = this.listeners[event] || [];
    this.listeners[event].push(cb);
  },
  removeEventListener: function(event, cb) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(l => l !== cb);
    }
  },
  querySelectorAll: () => []
});

const createMockWin = () => ({
  innerHeight: 800,
  requestAnimationFrame: () => 1,
  cancelAnimationFrame: () => {}
});

test('createDragDrop: binds events and handles drop reorder', async () => {
  const { createDragDrop } = await import('./drag-drop.js');
  
  const stepsList = createMockElement();
  const mockDoc = createMockDoc();
  const mockWin = createMockWin();
  
  let reorderCalled = false;
  const instance = createDragDrop(stepsList, {
    document: mockDoc,
    window: mockWin,
    config: { UI_DRAG_THRESHOLD: 80 },
    onReorder: () => { reorderCalled = true; }
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
  
  // Verify state is clean (no leftover dragSrc)
  const stepTarget2 = createMockElement('step');
  stepsList.dispatchEvent('dragover', { target: stepTarget2, preventDefault: () => {} });
  assert.equal(stepTarget2.classList.contains('drag-over'), false);
  
  instance.destroy();
});

test('createDragDrop: two instances do not share state', async () => {
  const { createDragDrop } = await import('./drag-drop.js');
  
  const list1 = createMockElement();
  const doc1 = createMockDoc();
  const win1 = createMockWin();
  const inst1 = createDragDrop(list1, { document: doc1, window: win1, config: { UI_DRAG_THRESHOLD: 80 } });
  
  const list2 = createMockElement();
  const doc2 = createMockDoc();
  const win2 = createMockWin();
  const inst2 = createDragDrop(list2, { document: doc2, window: win2, config: { UI_DRAG_THRESHOLD: 80 } });
  
  // start drag on list1
  const step1 = createMockElement('step');
  list1.dispatchEvent('dragstart', { target: step1, dataTransfer: {} });
  
  // drag over on list2 should NOT highlight because dragSrc is not shared
  const step2 = createMockElement('step');
  list2.dispatchEvent('dragover', { target: step2, preventDefault: () => {} });
  
  // If it doesn't share state, step2 shouldn't get 'drag-over'
  assert.equal(step2.classList.contains('drag-over'), false);
  
  inst1.destroy();
  inst2.destroy();
});

