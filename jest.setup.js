if (typeof globalThis.structuredClone !== 'function') {
  if (typeof global !== 'undefined' && typeof global.structuredClone === 'function') {
    globalThis.structuredClone = global.structuredClone;
  } else {
    globalThis.structuredClone = (value) => {
      if (value === undefined) return undefined;
      return JSON.parse(JSON.stringify(value));
    };
  }
}

// jsdom's Blob does not implement arrayBuffer() or text(); polyfill them via FileReader.
if (typeof Blob !== 'undefined') {
  if (!Blob.prototype.arrayBuffer) {
    Blob.prototype.arrayBuffer = function arrayBuffer() {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(this);
      });
    };
  }
  if (!Blob.prototype.text) {
    Blob.prototype.text = function text() {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(this);
      });
    };
  }
}

if (typeof globalThis.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('node:util');
  globalThis.TextEncoder = TextEncoder;
  globalThis.TextDecoder = TextDecoder;
}
