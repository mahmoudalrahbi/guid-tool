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

test('createStepElement: delete button click fires onDelete callback', async () => {
  const { createStepElement } = await import('./step-card.js');
  
  const step = { id: 's1', order: 1, description: 'Test', screenshotBlob: new Blob([]) };
  let deletedCard = null;
  
  const card = createStepElement(step, {
    onDescChange: () => {},
    onDelete: (c) => { deletedCard = c; }
  });
  
  // trigger delete
  card._del.dispatchEvent('click');
  
  // Assert on callback invocation
  assert.equal(deletedCard, card);
});

test('createStepElement: textarea change fires onDescChange with the updated description string', async () => {
  const { createStepElement } = await import('./step-card.js');
  
  const step = { id: 's1', order: 1, description: 'Test', screenshotBlob: new Blob([]) };
  let descChangeArg = null;
  
  const card = createStepElement(step, {
    onDescChange: (val) => { descChangeArg = val; },
    onDelete: () => {}
  });
  
  // trigger desc change
  card._desc.value = 'Updated description string';
  card._desc.dispatchEvent('input');
  
  // Assert that step is updated and callback fired with the right string
  assert.equal(step.description, 'Updated description string');
  assert.equal(descChangeArg, 'Updated description string');
});

test('renumber: updates every Step number element to reflect the correct 1-based index after reorder', async () => {
  const { renumber } = await import('./step-card.js');
  
  const mockNum1 = { textContent: '' };
  const mockNum2 = { textContent: '' };
  const mockNum3 = { textContent: '' };
  
  const mockStep1 = { querySelector: () => mockNum1 };
  const mockStep2 = { querySelector: () => mockNum2 };
  const mockStep3 = { querySelector: () => mockNum3 };
  
  const stepsList = {
    querySelectorAll: () => [mockStep1, mockStep2, mockStep3]
  };
  const stepCountBadge = { textContent: '' };
  
  renumber(stepsList, stepCountBadge);
  
  // Assert on output values, correct 1-based index (01, 02, 03)
  assert.equal(mockNum1.textContent, '01');
  assert.equal(mockNum2.textContent, '02');
  assert.equal(mockNum3.textContent, '03');
  
  assert.equal(stepCountBadge.textContent, 3);
  assert.equal(global.document.body.dataset.empty, 'false');
});
