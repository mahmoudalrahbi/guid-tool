const test = require('node:test');
const assert = require('node:assert/strict');

// ---------- DOM mock helpers ----------

function makeInputEl(opts = {}) {
  return {
    value: opts.value || 'text',
    scrollHeight: 100,
    textContent: '',
    style: {},
    listeners: {},
    _attrs: {},
    getAttribute: function (k) { return this._attrs[k]; },
    setAttribute: function (k, v) { this._attrs[k] = v; },
    addEventListener: function (evt, cb) { this.listeners[evt] = cb; },
    dispatchEvent: function (evt, data) {
      const cb = this.listeners[evt];
      if (cb) cb(data || {});
    },
    setPointerCapture: function () {}
  };
}

function makeImgEl(opts = {}) {
  return {
    complete: true,
    naturalWidth: opts.naturalWidth || 1280,
    naturalHeight: opts.naturalHeight || 720,
    width: opts.naturalWidth || 1280,
    height: opts.naturalHeight || 720,
    style: {},
    _attrs: {},
    listeners: {},
    getAttribute: function (k) { return this._attrs[k]; },
    setAttribute: function (k, v) { this._attrs[k] = v; },
    addEventListener: function (evt, cb) { this.listeners[evt] = cb; }
  };
}

function makeSvgEl() {
  return {
    _attrs: {},
    listeners: {},
    getAttribute: function (k) { return this._attrs[k]; },
    setAttribute: function (k, v) { this._attrs[k] = v; },
    getBoundingClientRect: function () { return { width: 640, height: 360 }; },
    appendChild: function () {},
    addEventListener: function (evt, cb) { this.listeners[evt] = cb; }
  };
}

function makeElement(tag) {
  return {
    tagName: tag,
    className: '',
    dataset: {},
    innerHTML: '',
    children: [],
    listeners: {},
    style: {},
    _desc: null,
    _del: null,
    _img: null,
    _annotSvg: null,
    querySelector: function (sel) {
      if (sel === '.step-desc')      return this._desc;
      if (sel === '.del-btn')        return this._del;
      if (sel === '.shot-img')       return this._img;
      if (sel === '.annotation-svg') return this._annotSvg;
      if (sel === '.step-num') {
        const el = makeInputEl();
        el.textContent = '';
        return el;
      }
      return makeInputEl();
    },
    querySelectorAll: function () { return []; },
    setAttribute: function (attr, val) { this[attr] = val; },
    addEventListener: function (evt, cb) { this.listeners[evt] = cb; },
    dispatchEvent: function (evt, data) {
      const cb = this.listeners[evt];
      if (cb) cb(data || {});
    }
  };
}

// ---------- Global-level tracker for createElementNS ----------
// step-card.js calls document.createElementNS to create the SVG circle element.
// We capture the last created NS element here so drag tests can access it.
let lastCreatedNsElement = null;

// ---------- Global mocks ----------

global.document = {
  createElement: (tag) => {
    const el = makeElement(tag);
    el._desc     = makeInputEl();
    el._del      = makeInputEl();
    el._img      = makeImgEl();
    el._annotSvg = makeSvgEl();
    return el;
  },
  createElementNS: (_ns, _tag) => {
    const el = makeInputEl(); // has addEventListener / dispatchEvent / getAttribute / setAttribute
    lastCreatedNsElement = el;
    return el;
  },
  body: { dataset: {} }
};

global.URL = { createObjectURL: () => 'blob:url' };
global.window = { escapeHtml: (str) => str || '' };
global.escapeHtml = global.window.escapeHtml;

// ---------- Tests ----------

test('createStepElement: delete button click fires onDelete callback', async () => {
  const { createStepElement } = await import('./step-card.js');

  const step = { id: 's1', order: 1, description: 'Test', screenshotBlob: new Blob([]), stepType: 'legacy' };
  let deletedCard = null;

  const card = createStepElement(step, {
    onDescChange: () => {},
    onDelete: (c) => { deletedCard = c; },
    onAnnotationChange: () => {}
  });

  card._del.dispatchEvent('click');
  assert.equal(deletedCard, card);
});

test('createStepElement: textarea change fires onDescChange with the updated description string', async () => {
  const { createStepElement } = await import('./step-card.js');

  const step = { id: 's1', order: 1, description: 'Test', screenshotBlob: new Blob([]), stepType: 'legacy' };
  let descChangeArg = null;

  const card = createStepElement(step, {
    onDescChange: (val) => { descChangeArg = val; },
    onDelete: () => {},
    onAnnotationChange: () => {}
  });

  card._desc.value = 'Updated description string';
  card._desc.dispatchEvent('input');

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

  const stepsList = { querySelectorAll: () => [mockStep1, mockStep2, mockStep3] };
  const stepCountBadge = { textContent: '' };

  renumber(stepsList, stepCountBadge);

  // Correct 1-based index (01, 02, 03)
  assert.equal(mockNum1.textContent, '01');
  assert.equal(mockNum2.textContent, '02');
  assert.equal(mockNum3.textContent, '03');
  assert.equal(stepCountBadge.textContent, 3);
  assert.equal(global.document.body.dataset.empty, 'false');
});

test('createStepElement (click): pointerup after drag updates annotation.x/y and calls onAnnotationChange', async () => {
  const { createStepElement } = await import('./step-card.js');

  const annotation = { x: 100, y: 200, radius: 28, color: '#f59e0b', dpr: 1 };
  const step = {
    id: 's2',
    order: 2,
    description: '',
    screenshotBlob: new Blob([]),
    stepType: 'click',
    annotation
  };

  let annotationChangeCount = 0;

  // Reset tracker before creating the element so we capture the circle for this step
  lastCreatedNsElement = null;
  createStepElement(step, {
    onDescChange: () => {},
    onDelete: () => {},
    onAnnotationChange: () => { annotationChangeCount++; }
  });

  // The last createElementNS call inside _setupAnnotationOverlay produced the circle
  const circle = lastCreatedNsElement;
  assert.ok(circle, 'Expected a circle element to be created via createElementNS for a click step');

  // circle's cx/cy should reflect the initial annotation position (set synchronously
  // because img.complete = true and naturalWidth > 0 in the mock)
  assert.equal(circle.getAttribute('cx'), 100, 'initial cx should match annotation.x');
  assert.equal(circle.getAttribute('cy'), 200, 'initial cy should match annotation.y');

  // Simulate pointerdown → pointermove → pointerup
  // SVG getBoundingClientRect → { width: 640, height: 360 }
  // img naturalWidth = 1280, naturalHeight = 720
  // scaleX = 1280/640 = 2,  scaleY = 720/360 = 2
  // Moving 50 CSS px right → +100 SVG units → new cx = 200
  // Moving 30 CSS px down  → +60  SVG units → new cy = 260

  circle.dispatchEvent('pointerdown', {
    clientX: 0, clientY: 0, pointerId: 1,
    stopPropagation: () => {}, preventDefault: () => {}
  });
  circle.dispatchEvent('pointermove', { clientX: 50, clientY: 30, preventDefault: () => {} });
  circle.dispatchEvent('pointerup', {});

  assert.equal(annotationChangeCount, 1, 'onAnnotationChange should fire once on drag-end');
  assert.ok(step.annotation != null, 'step.annotation should exist after drag');
  assert.equal(step.annotation.x, 200, 'annotation.x should be updated to 200');
  assert.equal(step.annotation.y, 260, 'annotation.y should be updated to 260');
});

test('createStepElement (legacy): no annotation SVG rendered and no SVGElement created', async () => {
  const { createStepElement } = await import('./step-card.js');

  const step = {
    id: 's3',
    order: 3,
    description: '',
    screenshotBlob: new Blob([]),
    stepType: 'legacy'
  };

  lastCreatedNsElement = null;
  let annotationChangeFired = false;
  const card = createStepElement(step, {
    onDescChange: () => {},
    onDelete: () => {},
    onAnnotationChange: () => { annotationChangeFired = true; }
  });

  assert.ok(
    !card.innerHTML.includes('annotation-svg'),
    'legacy steps must not include an annotation-svg element'
  );
  assert.equal(lastCreatedNsElement, null, 'no SVGElement should be created for legacy steps');
  assert.equal(annotationChangeFired, false, 'onAnnotationChange must not fire for legacy steps on creation');
});

test('createStepElement (navigation): no annotation SVG rendered and no SVGElement created', async () => {
  const { createStepElement } = await import('./step-card.js');

  const step = {
    id: 's4',
    order: 4,
    description: '',
    screenshotBlob: new Blob([]),
    stepType: 'navigation'
  };

  lastCreatedNsElement = null;
  const card = createStepElement(step, {
    onDescChange: () => {},
    onDelete: () => {},
    onAnnotationChange: () => {}
  });

  assert.ok(
    !card.innerHTML.includes('annotation-svg'),
    'navigation steps must not include an annotation-svg element'
  );
  assert.equal(lastCreatedNsElement, null, 'no SVGElement should be created for navigation steps');
});
