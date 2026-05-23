const test = require('node:test');
const assert = require('node:assert/strict');

// Mock DOM
global.document = {
  createElement: (tag) => ({
    tagName: tag,
    className: '',
    dataset: {},
    innerHTML: '',
    children: [],
    listeners: {},
    querySelector: function(sel) {
      const el = {
        value: 'text',
        scrollHeight: 100,
        style: {},
        listeners: {},
        addEventListener: function(evt, cb) { this.listeners[evt] = cb; },
        dispatchEvent: function(evt) { if (this.listeners[evt]) this.listeners[evt](); }
      };
      if (sel === '.step-desc') this._desc = el;
      if (sel === '.del-btn') this._del = el;
      if (sel === '.step-num') { el.textContent = ''; return el; }
      return el;
    },
    querySelectorAll: function() { return []; },
    setAttribute: function(attr, val) { this[attr] = val; }
  }),
  body: { dataset: {} }
};

// Mock URL and escapeHtml
global.URL = { createObjectURL: () => 'blob:url' };
global.window = { escapeHtml: (str) => str || '' };
global.escapeHtml = global.window.escapeHtml;

test('createStepElement: builds card and binds events', async () => {
  const { createStepElement } = await import('./step-card.js');
  
  const step = { id: 's1', order: 1, description: 'Test', screenshotBlob: new Blob([]) };
  let descChanged = false;
  let deletedCard = null;
  
  const card = createStepElement(step, {
    onDescChange: () => { descChanged = true; },
    onDelete: (c) => { deletedCard = c; }
  });
  
  assert.equal(card.dataset.id, 's1');
  assert.equal(card.draggable, 'true');
  
  // trigger desc change
  card._desc.value = 'New desc';
  card._desc.dispatchEvent('input');
  assert.equal(step.description, 'New desc');
  assert.equal(descChanged, true);
  
  // trigger delete
  card._del.dispatchEvent('click');
  assert.equal(deletedCard, card);
});

test('renumber: updates step numbers and empty state', async () => {
  const { renumber } = await import('./step-card.js');
  
  const mockNum1 = { textContent: '' };
  const mockNum2 = { textContent: '' };
  const mockStep1 = { querySelector: () => mockNum1 };
  const mockStep2 = { querySelector: () => mockNum2 };
  
  const stepsList = {
    querySelectorAll: () => [mockStep1, mockStep2]
  };
  const stepCountBadge = { textContent: '' };
  
  renumber(stepsList, stepCountBadge);
  
  assert.equal(mockNum1.textContent, '01');
  assert.equal(mockNum2.textContent, '02');
  assert.equal(stepCountBadge.textContent, 2);
  assert.equal(global.document.body.dataset.empty, 'false');
});
