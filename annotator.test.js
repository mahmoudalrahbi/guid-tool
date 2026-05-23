const test = require('node:test');
const assert = require('node:assert/strict');
const annotator = require('./annotator.js');

global.CONFIG = require('./config.js');
global.blobToDataUrl = async (blob) => `data:${blob.type};base64,mock`;

global.fetch = async () => ({
  blob: async () => new Blob(['mock'], { type: 'image/png' })
});

global.createImageBitmap = async () => ({ width: 100, height: 100 });

global.OffscreenCanvas = class {
  constructor(w, h) { this.width = w; this.height = h; }
  getContext() {
    return {
      drawImage: () => {},
      beginPath: () => {},
      arc: () => {},
      stroke: () => {}
    };
  }
  async convertToBlob(opts) {
    return new Blob(['mock-out'], { type: opts.type });
  }
};

test('annotate: returns a JPEG data URL', async () => {
  const result = await annotator.annotate('data:image/png;base64,mock', 10, 10, 1);
  assert.ok(result.startsWith('data:image/jpeg;base64'));
});
