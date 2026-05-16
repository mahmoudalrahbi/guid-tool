// Polyfill crypto.randomUUID for Node environments that don't expose Web Crypto globally
if (!global.crypto?.randomUUID) {
  const nodeCrypto = require('crypto');
  global.crypto = {
    ...global.crypto,
    randomUUID: () => nodeCrypto.randomUUID(),
  };
}

// Stub browser globals used by background.js
global.OffscreenCanvas = class OffscreenCanvas {
  constructor(w, h) { this.width = w; this.height = h; }
  getContext() { return { drawImage: jest.fn() }; }
  convertToBlob() {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]); // minimal JPEG
    return Promise.resolve(new Blob([bytes], { type: 'image/jpeg' }));
  }
};

global.createImageBitmap = jest.fn().mockResolvedValue({ width: 1280, height: 720 });

global.fetch = jest.fn().mockResolvedValue({
  blob: () => Promise.resolve(new Blob(['fake-image-data'], { type: 'image/png' })),
});

// Stub chrome extension APIs — individual tests override these per-case
global.chrome = {
  runtime: {
    onInstalled: { addListener: jest.fn() },
    onMessage:   { addListener: jest.fn() },
    lastError:   null,
    sendMessage: jest.fn(),
    getURL:      jest.fn(p => `chrome-extension://test/${p}`),
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
    },
    onChanged: { addListener: jest.fn() },
  },
  tabs: {
    captureVisibleTab: jest.fn(),
    create:            jest.fn(),
  },
};
