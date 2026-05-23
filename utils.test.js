const test = require('node:test');
const assert = require('node:assert/strict');
const utils = require('./utils.js');

test('escapeHtml: replaces HTML characters with entities', () => {
  assert.equal(
    utils.escapeHtml('<div>"test" & \'rest\'</div>'),
    '&lt;div&gt;&quot;test&quot; &amp; \'rest\'&lt;/div&gt;'
  );
});

test('formatDate: formats today correctly', () => {
  const now = new Date();
  const timeStr = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  assert.equal(utils.formatDate(now.getTime()), `Today, ${timeStr}`);
});

test('formatDate: formats past date correctly', () => {
  const past = new Date('2023-05-18T10:42:00Z');
  const timeStr = past.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const dateStr = past.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  assert.equal(utils.formatDate(past.getTime()), `${dateStr}, ${timeStr}`);
});

test('dataUrlToBlob: converts data URL to Blob', () => {
  // A tiny valid base64 gif (1x1 pixel)
  const dataUrl = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  const blob = utils.dataUrlToBlob(dataUrl);
  
  assert.ok(blob instanceof Blob);
  assert.equal(blob.type, 'image/gif');
  assert.equal(blob.size, 42); // 42 bytes
});

test('blobToDataUrl: converts Blob to data URL', async () => {
  const dataUrl = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  const blob = utils.dataUrlToBlob(dataUrl);
  
  const result = await utils.blobToDataUrl(blob);
  assert.equal(result, dataUrl);
});
