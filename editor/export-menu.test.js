const test = require('node:test');
const assert = require('node:assert/strict');

// Mock DOM
const mockDocumentListeners = [];
global.document = {
  createElement: (tag) => {
    const el = {
      tagName: tag,
      className: '',
      dataset: {},
      innerHTML: '',
      children: [],
      listeners: {},
      appendChild: function(child) { this.children.push(child); },
      addEventListener: function(event, cb) { 
        this.listeners[event] = this.listeners[event] || [];
        this.listeners[event].push(cb);
      },
      dispatchEvent: function(event, payload) {
        if (this.listeners[event]) this.listeners[event].forEach(cb => cb(payload));
      }
    };
    return el;
  },
  addEventListener: (event, cb) => mockDocumentListeners.push({event, cb}),
  dispatchEvent: (event, payload) => {
    mockDocumentListeners.filter(l => l.event === event).forEach(l => l.cb(payload));
  }
};

function createMockElement() {
  const el = global.document.createElement('div');
  el.classList = {
    classes: new Set(),
    add: function(c) { this.classes.add(c); },
    remove: function(c) { this.classes.delete(c); },
    toggle: function(c) { if (this.classes.has(c)) this.classes.delete(c); else this.classes.add(c); },
    contains: function(c) { return this.classes.has(c); }
  };
  el.contains = function(other) { return this === other; };
  return el;
}

test('setupExportMenu: renders formats and handles export clicks', async () => {
  const { setupExportMenu } = await import('./export-menu.js');
  
  const exportMenu = createMockElement();
  const exportDropdown = createMockElement();
  const exportBtn = createMockElement();
  
  const formats = [
    { id: 'html', name: 'HTML' },
    { id: 'pdf', name: 'PDF' }
  ];
  
  let exportedFormat = null;
  setupExportMenu(exportMenu, exportDropdown, exportBtn, formats, (fmt) => {
    exportedFormat = fmt;
  });
  
  assert.equal(exportMenu.children.length, 2);
  assert.equal(exportMenu.children[0].dataset.fmt, 'html');
  assert.ok(exportMenu.children[0].innerHTML.includes('Export as HTML'));
  
  // Test button toggle
  exportBtn.dispatchEvent('click', { stopPropagation: () => {} });
  assert.ok(exportDropdown.classList.contains('open'));
  
  // Test format click
  exportMenu.children[0].dispatchEvent('click');
  assert.equal(exportedFormat, 'html');
  assert.ok(!exportDropdown.classList.contains('open'));
});
