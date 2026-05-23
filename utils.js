// utils.js - Shared utilities for LocalGuide

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function formatDate(timestamp) {
  const guideDate = new Date(timestamp);
  const today = new Date();
  const isToday = guideDate.getDate() === today.getDate() && 
                  guideDate.getMonth() === today.getMonth() && 
                  guideDate.getFullYear() === today.getFullYear();
  
  const timeStr = guideDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (isToday) {
    return `Today, ${timeStr}`;
  }
  const dateStr = guideDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${dateStr}, ${timeStr}`;
}

function dataUrlToBlob(dataUrl) {
  const [header, data] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)[1];
  const bytes = atob(data);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

function blobToDataUrl(blob) {
  if (typeof FileReader !== 'undefined') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(blob);
    });
  }
  // Node fallback for testing
  return blob.arrayBuffer().then(buf => {
    // Buffer is global in Node
    const base64 = Buffer.from(buf).toString('base64');
    return `data:${blob.type};base64,${base64}`;
  });
}

// CJS export for node:test runner. Ignored in browser context.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    escapeHtml,
    formatDate,
    dataUrlToBlob,
    blobToDataUrl,
  };
}
