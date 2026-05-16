/**
 * Tests for background.js message handlers.
 *
 * Strategy: mock chrome APIs before requiring the module so the
 * onInstalled / onMessage listeners are captured, then invoke them directly.
 */

let messageHandler;
let installedHandler;

beforeAll(() => {
  // Capture the registered listeners when background.js loads
  chrome.runtime.onInstalled.addListener.mockImplementation(fn => { installedHandler = fn; });
  chrome.runtime.onMessage.addListener.mockImplementation(fn => { messageHandler = fn; });

  require('../background');
});

beforeEach(() => {
  jest.clearAllMocks();
  // Reset lastError between tests
  global.chrome.runtime.lastError = null;
});

// ── onInstalled ───────────────────────────────────────────────────────────────

describe('onInstalled', () => {
  test('resets storage to not-recording with empty steps', () => {
    installedHandler();
    expect(chrome.storage.local.set).toHaveBeenCalledWith({ isRecording: false, steps: [] });
  });
});

// ── start_recording ───────────────────────────────────────────────────────────

describe('start_recording', () => {
  test('sets isRecording to true and responds success', () => {
    chrome.storage.local.set.mockImplementation((_, cb) => cb && cb());
    const sendResponse = jest.fn();

    messageHandler({ action: 'start_recording' }, {}, sendResponse);

    expect(chrome.storage.local.set).toHaveBeenCalledWith({ isRecording: true }, expect.any(Function));
    expect(sendResponse).toHaveBeenCalledWith({ success: true });
  });

  test('returns true to signal async response', () => {
    chrome.storage.local.set.mockImplementation(() => {});
    const result = messageHandler({ action: 'start_recording' }, {}, jest.fn());
    expect(result).toBe(true);
  });

  test('responds with error when storage write fails', () => {
    chrome.storage.local.set.mockImplementation((_, cb) => {
      global.chrome.runtime.lastError = { message: 'QUOTA_BYTES exceeded' };
      cb && cb();
    });
    const sendResponse = jest.fn();

    messageHandler({ action: 'start_recording' }, {}, sendResponse);

    expect(sendResponse).toHaveBeenCalledWith({ success: false, error: 'QUOTA_BYTES exceeded' });
  });
});

// ── stop_recording ────────────────────────────────────────────────────────────

describe('stop_recording', () => {
  test('sets isRecording to false and responds success', () => {
    chrome.storage.local.set.mockImplementation((_, cb) => cb && cb());
    const sendResponse = jest.fn();

    messageHandler({ action: 'stop_recording' }, {}, sendResponse);

    expect(chrome.storage.local.set).toHaveBeenCalledWith({ isRecording: false }, expect.any(Function));
    expect(sendResponse).toHaveBeenCalledWith({ success: true });
  });
});

// ── clear_steps ───────────────────────────────────────────────────────────────

describe('clear_steps', () => {
  test('resets steps to empty array and responds success', () => {
    chrome.storage.local.set.mockImplementation((_, cb) => cb && cb());
    const sendResponse = jest.fn();

    messageHandler({ action: 'clear_steps' }, {}, sendResponse);

    expect(chrome.storage.local.set).toHaveBeenCalledWith({ steps: [] }, expect.any(Function));
    expect(sendResponse).toHaveBeenCalledWith({ success: true });
  });
});

// ── capture_click ─────────────────────────────────────────────────────────────

describe('capture_click', () => {
  test('returns true (async) regardless of recording state', () => {
    chrome.storage.local.get.mockImplementation((_, cb) => cb({ isRecording: false, steps: [] }));
    const result = messageHandler({ action: 'capture_click', elementInfo: 'button' }, {}, jest.fn());
    expect(result).toBe(true);
  });

  test('responds not-saved when not recording', () => {
    chrome.storage.local.get.mockImplementation((_, cb) => cb({ isRecording: false, steps: [] }));
    const sendResponse = jest.fn();

    messageHandler({ action: 'capture_click', elementInfo: 'button' }, {}, sendResponse);

    expect(sendResponse).toHaveBeenCalledWith({ success: true, saved: false });
    expect(chrome.tabs.captureVisibleTab).not.toHaveBeenCalled();
  });

  test('responds with error when captureVisibleTab returns null dataUrl', () => {
    chrome.storage.local.get.mockImplementation((_, cb) => cb({ isRecording: true, steps: [] }));
    chrome.tabs.captureVisibleTab.mockImplementation((_, __, cb) => cb(null));
    const sendResponse = jest.fn();

    messageHandler({ action: 'capture_click', elementInfo: 'button' }, {}, sendResponse);

    expect(sendResponse).toHaveBeenCalledWith({ success: false, error: 'empty_dataUrl' });
  });

  test('responds with error when captureVisibleTab fails (lastError set)', () => {
    chrome.storage.local.get.mockImplementation((_, cb) => cb({ isRecording: true, steps: [] }));
    chrome.tabs.captureVisibleTab.mockImplementation((_, __, cb) => {
      global.chrome.runtime.lastError = { message: 'Cannot access tab' };
      cb(undefined);
    });
    const sendResponse = jest.fn();

    messageHandler({ action: 'capture_click', elementInfo: 'button' }, {}, sendResponse);

    expect(sendResponse).toHaveBeenCalledWith({ success: false, error: 'Cannot access tab' });
  });

  test('captures, compresses, and saves step when recording', async () => {
    const fakeDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const existingSteps = [{ id: 'existing', elementInfo: 'div', image: 'data:image/jpeg;base64,old', timestamp: '2026-01-01T00:00:00.000Z' }];

    chrome.storage.local.get.mockImplementation((_, cb) => cb({ isRecording: true, steps: existingSteps }));
    chrome.tabs.captureVisibleTab.mockImplementation((_, __, cb) => cb(fakeDataUrl));
    chrome.storage.local.set.mockImplementation((_, cb) => cb && cb());

    const sendResponse = jest.fn();
    messageHandler({ action: 'capture_click', elementInfo: "'Login'" }, {}, sendResponse);

    // Compression is async — wait for the promise chain to settle
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(chrome.tabs.captureVisibleTab).toHaveBeenCalled();
    expect(chrome.storage.local.set).toHaveBeenCalled();

    const savedData = chrome.storage.local.set.mock.calls[0][0];
    expect(savedData.steps).toHaveLength(2);
    expect(savedData.steps[1].elementInfo).toBe("'Login'");
    expect(sendResponse).toHaveBeenCalledWith({ success: true, saved: true });
  });

  test('assigns a UUID to each new step', async () => {
    const fakeDataUrl = 'data:image/png;base64,abc';

    chrome.storage.local.get.mockImplementation((_, cb) => cb({ isRecording: true, steps: [] }));
    chrome.tabs.captureVisibleTab.mockImplementation((_, __, cb) => cb(fakeDataUrl));
    chrome.storage.local.set.mockImplementation((_, cb) => cb && cb());

    messageHandler({ action: 'capture_click', elementInfo: 'button' }, {}, jest.fn());
    await new Promise(resolve => setTimeout(resolve, 50));

    const savedSteps = chrome.storage.local.set.mock.calls[0][0].steps;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(savedSteps[0].id).toMatch(uuidRegex);
  });

  test('responds storage_full when quota exceeded on save', async () => {
    const fakeDataUrl = 'data:image/png;base64,abc';

    chrome.storage.local.get.mockImplementation((_, cb) => cb({ isRecording: true, steps: [] }));
    chrome.tabs.captureVisibleTab.mockImplementation((_, __, cb) => cb(fakeDataUrl));
    chrome.storage.local.set.mockImplementation((_, cb) => {
      global.chrome.runtime.lastError = { message: 'QUOTA_BYTES_PER_ITEM exceeded' };
      cb && cb();
    });

    const sendResponse = jest.fn();
    messageHandler({ action: 'capture_click', elementInfo: 'button' }, {}, sendResponse);
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(sendResponse).toHaveBeenCalledWith({ success: false, error: 'storage_full' });
  });

  test('includes a timestamp in ISO format on new steps', async () => {
    const fakeDataUrl = 'data:image/png;base64,abc';
    const before = new Date().toISOString();

    chrome.storage.local.get.mockImplementation((_, cb) => cb({ isRecording: true, steps: [] }));
    chrome.tabs.captureVisibleTab.mockImplementation((_, __, cb) => cb(fakeDataUrl));
    chrome.storage.local.set.mockImplementation((_, cb) => cb && cb());

    messageHandler({ action: 'capture_click', elementInfo: 'div' }, {}, jest.fn());
    await new Promise(resolve => setTimeout(resolve, 50));

    const after = new Date().toISOString();
    const ts = chrome.storage.local.set.mock.calls[0][0].steps[0].timestamp;
    expect(ts >= before).toBe(true);
    expect(ts <= after).toBe(true);
  });
});
