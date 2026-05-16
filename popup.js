document.addEventListener('DOMContentLoaded', () => {
  const startBtn   = document.getElementById('startBtn');
  const stopBtn    = document.getElementById('stopBtn');
  const galleryBtn = document.getElementById('galleryBtn');
  const statusText = document.getElementById('statusText');
  const stepCount  = document.getElementById('stepCount');

  function updateUI(isRecording, count) {
    if (isRecording) {
      startBtn.classList.add('hidden');
      stopBtn.classList.remove('hidden');
      statusText.textContent = 'Recording in progress…';
      statusText.style.color = '#cf6679';
    } else {
      startBtn.classList.remove('hidden');
      stopBtn.classList.add('hidden');
      statusText.textContent = 'Ready to record.';
      statusText.style.color = '#a0a0a0';
    }

    stepCount.textContent = LocalGuide.formatStepCount(count, isRecording);
  }

  // Load initial state
  chrome.storage.local.get(['isRecording', 'steps'], (data) => {
    updateUI(data.isRecording, (data.steps || []).length);
  });

  // Keep popup in sync while it's open (e.g. steps accumulate mid-recording)
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if ('isRecording' in changes || 'steps' in changes) {
      chrome.storage.local.get(['isRecording', 'steps'], (data) => {
        updateUI(data.isRecording, (data.steps || []).length);
      });
    }
  });

  startBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'start_recording' }, (response) => {
      if (chrome.runtime.lastError || !response || !response.success) return;
      chrome.storage.local.get(['steps'], (data) => {
        updateUI(true, (data.steps || []).length);
      });
    });
  });

  stopBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'stop_recording' }, (response) => {
      if (chrome.runtime.lastError || !response || !response.success) return;
      chrome.storage.local.get(['steps'], (data) => {
        updateUI(false, (data.steps || []).length);
      });
    });
  });

  galleryBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('gallery.html') });
  });
});
