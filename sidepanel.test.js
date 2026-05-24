const test = require('node:test');
const assert = require('node:assert/strict');

// Minimal browser globals required by sidepanel.js in Node context
global.CONFIG = require('./config.js');

// Track canvas 2d context calls
let ctxCalls = [];

global.document = {
  createElement: (tag) => {
    if (tag === 'canvas') {
      return {
        width: 0,
        height: 0,
        getContext: () => ({
          drawImage: (...args) => ctxCalls.push({ method: 'drawImage', args }),
          beginPath: () => ctxCalls.push({ method: 'beginPath', args: [] }),
          arc: (...args) => ctxCalls.push({ method: 'arc', args }),
          stroke: () => ctxCalls.push({ method: 'stroke', args: [] }),
          set strokeStyle(val) { ctxCalls.push({ method: 'set_strokeStyle', args: [val] }); },
          set lineWidth(val) { ctxCalls.push({ method: 'set_lineWidth', args: [val] }); },
        }),
        toDataURL: (type, quality) => `data:image/jpeg;base64,mock-${quality}`,
      };
    }
    // For Image() simulation we use a plain object; override below
    return {};
  },
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
};

// We also need a working Image constructor simulation.
// sidepanel.js calls `new Image()` — provide a global.
global.Image = class {
  constructor() {
    this.naturalWidth = 200;
    this.naturalHeight = 100;
    // Automatically trigger onload when src is set
    Object.defineProperty(this, 'src', {
      set: (_val) => {
        if (typeof this.onload === 'function') this.onload();
      },
      get: () => this._src,
    });
  }
};

// Stubs for chrome APIs and DOM elements accessed at module top level
global.chrome = {
  storage: { local: { get: (_k, cb) => cb({}) } },
  runtime: { sendMessage: () => {}, onMessage: { addListener: () => {} } },
};

// Stub all getElementById calls to return benign objects
global.document.getElementById = (_id) => ({
  textContent: '',
  style: {},
  className: '',
  disabled: false,
  innerHTML: '',
  classList: { remove: () => {}, contains: () => false },
  addEventListener: () => {},
  querySelector: () => null,
  querySelectorAll: () => [],
});

const { compositeClickThumbnail } = require('./sidepanel.js');

test.beforeEach(() => {
  ctxCalls = [];
});

test('compositeClickThumbnail: returns a JPEG data URL for a click step', async () => {
  const result = await compositeClickThumbnail('data:image/jpeg;base64,mock', {
    x: 10, y: 20, dpr: 1,
    radius: CONFIG.ANNOTATION.RADIUS_PX,
    color: CONFIG.ANNOTATION.COLOR,
    strokeWidth: CONFIG.ANNOTATION.STROKE_WIDTH_PX,
  });
  assert.ok(result.startsWith('data:image/jpeg'), 'Should return a JPEG data URL');
});

test('compositeClickThumbnail: draws arc at DPR-scaled coordinates (dpr=1)', async () => {
  await compositeClickThumbnail('data:image/jpeg;base64,mock', {
    x: 50, y: 60, dpr: 1,
    radius: CONFIG.ANNOTATION.RADIUS_PX,
    color: CONFIG.ANNOTATION.COLOR,
    strokeWidth: CONFIG.ANNOTATION.STROKE_WIDTH_PX,
  });
  const arcCall = ctxCalls.find(c => c.method === 'arc');
  assert.ok(arcCall, 'arc() should be called');
  assert.equal(arcCall.args[0], 50, 'cx = x * dpr = 50 * 1');
  assert.equal(arcCall.args[1], 60, 'cy = y * dpr = 60 * 1');
  assert.equal(arcCall.args[2], CONFIG.ANNOTATION.RADIUS_PX * 1, 'radius scaled by dpr');
});

test('compositeClickThumbnail: scales coordinates and radius by DPR (dpr=2)', async () => {
  await compositeClickThumbnail('data:image/jpeg;base64,mock', {
    x: 50, y: 60, dpr: 2,
    radius: CONFIG.ANNOTATION.RADIUS_PX,
    color: CONFIG.ANNOTATION.COLOR,
    strokeWidth: CONFIG.ANNOTATION.STROKE_WIDTH_PX,
  });
  const arcCall = ctxCalls.find(c => c.method === 'arc');
  assert.ok(arcCall, 'arc() should be called');
  assert.equal(arcCall.args[0], 100, 'cx = x * dpr = 50 * 2');
  assert.equal(arcCall.args[1], 120, 'cy = y * dpr = 60 * 2');
  assert.equal(arcCall.args[2], CONFIG.ANNOTATION.RADIUS_PX * 2, 'radius should be scaled by dpr');

  const lineWidthCall = ctxCalls.find(c => c.method === 'set_lineWidth');
  assert.ok(lineWidthCall, 'lineWidth should be set');
  assert.equal(lineWidthCall.args[0], CONFIG.ANNOTATION.STROKE_WIDTH_PX * 2, 'strokeWidth scaled by dpr');
});

test('compositeClickThumbnail: uses annotation color', async () => {
  const customColor = '#ff0000';
  await compositeClickThumbnail('data:image/jpeg;base64,mock', {
    x: 10, y: 10, dpr: 1,
    radius: CONFIG.ANNOTATION.RADIUS_PX,
    color: customColor,
    strokeWidth: CONFIG.ANNOTATION.STROKE_WIDTH_PX,
  });
  const strokeStyleCall = ctxCalls.find(c => c.method === 'set_strokeStyle');
  assert.ok(strokeStyleCall, 'strokeStyle should be set');
  assert.equal(strokeStyleCall.args[0], customColor, 'should use annotation.color');
});

test('compositeClickThumbnail: falls back to CONFIG defaults for missing radius/color/strokeWidth', async () => {
  await compositeClickThumbnail('data:image/jpeg;base64,mock', {
    x: 10, y: 10, dpr: 1,
    // radius, color, strokeWidth intentionally omitted
  });
  const arcCall = ctxCalls.find(c => c.method === 'arc');
  assert.ok(arcCall, 'arc() should be called even with minimal annotation');
  assert.equal(arcCall.args[2], CONFIG.ANNOTATION.RADIUS_PX, 'radius falls back to CONFIG.ANNOTATION.RADIUS_PX');

  const strokeStyleCall = ctxCalls.find(c => c.method === 'set_strokeStyle');
  assert.equal(strokeStyleCall.args[0], CONFIG.ANNOTATION.COLOR, 'color falls back to CONFIG.ANNOTATION.COLOR');
});

test('compositeClickThumbnail: rejects on image load error', async () => {
  // Override Image to simulate an error
  const OrigImage = global.Image;
  global.Image = class {
    constructor() {
      Object.defineProperty(this, 'src', {
        set: (_val) => {
          if (typeof this.onerror === 'function') this.onerror(new Error('load failed'));
        },
      });
    }
  };
  try {
    await assert.rejects(
      compositeClickThumbnail('data:bad', { x: 0, y: 0, dpr: 1 }),
      'Should reject when the image fails to load'
    );
  } finally {
    global.Image = OrigImage;
  }
});
