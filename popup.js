document.getElementById('startBtn').addEventListener('click', async () => {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const response = await chrome.runtime.sendMessage({
    action: 'start_recording',
    tabId: activeTab ? activeTab.id : undefined,
    windowId: activeTab ? activeTab.windowId : undefined,
  });
  if (!response || !response.guideId) {
    console.error('LocalGuide: failed to start recording', response);
    return;
  }
  window.close();
});
