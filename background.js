chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ isRecording: false, steps: [] });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'capture_click') {
    chrome.storage.local.get(['isRecording', 'steps'], (data) => {
      if (data.isRecording) {
        chrome.tabs.captureVisibleTab(null, { format: 'png' }, async (dataUrl) => {
          if (chrome.runtime.lastError) {
            console.error('Capture error:', chrome.runtime.lastError);
            sendResponse({ success: false, error: chrome.runtime.lastError.message });
            return;
          }

          if (!dataUrl) {
            sendResponse({ success: false, error: 'empty_dataUrl' });
            return;
          }

          let finalImage = dataUrl;
          try {
            finalImage = await compressImage(dataUrl);
          } catch (e) {
            console.error('Compression failed, using original', e);
          }

          const newStep = {
            id: crypto.randomUUID(),
            elementInfo: request.elementInfo,
            image: finalImage,
            timestamp: new Date().toISOString()
          };

          // Re-read steps immediately before writing to avoid overwriting
          // a step saved by a concurrent capture from another tab.
          chrome.storage.local.get(['steps'], (latest) => {
            const updatedSteps = [...(latest.steps || []), newStep];
            chrome.storage.local.set({ steps: updatedSteps }, () => {
              if (chrome.runtime.lastError) {
                console.error('Storage write failed:', chrome.runtime.lastError.message);
                sendResponse({ success: false, error: 'storage_full' });
                return;
              }
              sendResponse({ success: true, saved: true });
            });
          });
        });
      } else {
        sendResponse({ success: true, saved: false });
      }
    });
    return true;
  }

  if (request.action === 'start_recording') {
    chrome.storage.local.set({ isRecording: true }, () => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
        return;
      }
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'stop_recording') {
    chrome.storage.local.set({ isRecording: false }, () => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
        return;
      }
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'clear_steps') {
    chrome.storage.local.set({ steps: [] }, () => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
        return;
      }
      sendResponse({ success: true });
    });
    return true;
  }
});

async function compressImage(dataUrl) {
  try {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const imgBitmap = await createImageBitmap(blob);

    const MAX_WIDTH = 1280;
    const MAX_HEIGHT = 720;

    let width = imgBitmap.width;
    let height = imgBitmap.height;

    if (width > MAX_WIDTH || height > MAX_HEIGHT) {
      const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    const offscreen = new OffscreenCanvas(width, height);
    const ctx = offscreen.getContext('2d');
    ctx.drawImage(imgBitmap, 0, 0, width, height);

    const compressedBlob = await offscreen.convertToBlob({ type: 'image/jpeg', quality: 0.8 });

    const buffer = await compressedBlob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunk = 8192;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return 'data:image/jpeg;base64,' + btoa(binary);
  } catch (e) {
    console.error('Compression error:', e);
    return dataUrl;
  }
}
