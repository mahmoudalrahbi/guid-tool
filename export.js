document.addEventListener('DOMContentLoaded', () => {
  const exportPdfBtn  = document.getElementById('exportPdfBtn');
  const exportHtmlBtn = document.getElementById('exportHtmlBtn');
  const exportWordBtn = document.getElementById('exportWordBtn');

  function showToast(message) {
    const t = document.createElement('div');
    t.className = 'export-toast';
    t.textContent = message;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  async function withLoading(btn, loadingLabel, successMsg, fn) {
    btn.disabled = true;
    const original = btn.textContent;
    btn.textContent = loadingLabel;
    let succeeded = false;
    try {
      await fn();
      succeeded = true;
    } catch (e) {
      console.error(e);
      alert('Export failed. See console for details.');
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
    if (succeeded) showToast(successMsg);
  }

  exportPdfBtn.addEventListener('click', () =>
    withLoading(exportPdfBtn, 'Generating…', 'PDF downloaded', generatePDF)
  );

  exportHtmlBtn.addEventListener('click', () =>
    withLoading(exportHtmlBtn, 'Generating…', 'HTML file downloaded', generateHTML)
  );

  exportWordBtn.addEventListener('click', () =>
    withLoading(exportWordBtn, 'Generating…', 'Word document downloaded', generateWord)
  );

  // ── Helpers ────────────────────────────────────────────────────────────────

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function getSteps() {
    const data = await chrome.storage.local.get(['steps']);
    const steps = data.steps || [];
    if (steps.length === 0) {
      alert('No steps to export!');
      return null;
    }
    return steps;
  }

  // Renders any text (including Arabic/RTL) onto a canvas → PNG data URL.
  // Used by PDF export so jsPDF doesn't mangle non-Latin scripts.
  function renderTextAsImage(text, { width, height, fontSize, color, bgColor }) {
    const DPR = 2;
    const canvas = document.createElement('canvas');
    canvas.width = width * DPR;
    canvas.height = height * DPR;
    const ctx = canvas.getContext('2d');
    ctx.scale(DPR, DPR);

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    ctx.font = `500 ${fontSize}px system-ui, -apple-system, "Segoe UI", Arial, sans-serif`;
    ctx.fillStyle = color;
    ctx.textBaseline = 'middle';

    const isRTL = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/.test(text);
    ctx.direction = isRTL ? 'rtl' : 'ltr';
    ctx.textAlign = isRTL ? 'right' : 'left';

    const xPos = isRTL ? width - 10 : 10;
    ctx.fillText(text, xPos, height / 2, width - 20);

    return canvas.toDataURL('image/png');
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  // ── PDF Export ─────────────────────────────────────────────────────────────

  async function generatePDF() {
    const steps = await getSteps();
    if (!steps) return;

    const { jsPDF } = window.jspdf;
    const W = 1280;
    const H = 720;

    const doc = new jsPDF({ orientation: 'landscape', unit: 'px', format: [W, H] });

    const HEADER_H = 75;
    const FOOTER_H = 44;
    const PAD = 36;
    const BADGE_CX = PAD + 18;
    const TITLE_X = PAD + 52;
    const BRANDING_W = 140;
    const TITLE_W = W - TITLE_X - BRANDING_W - PAD;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (i > 0) doc.addPage();

      doc.setFillColor(245, 245, 247);
      doc.rect(0, 0, W, H, 'F');

      doc.setFillColor(187, 134, 252);
      doc.rect(0, 0, 4, H, 'F');

      doc.setFillColor(26, 26, 29);
      doc.rect(0, 0, W, HEADER_H, 'F');

      doc.setFillColor(187, 134, 252);
      doc.circle(BADGE_CX, HEADER_H / 2, 20, 'F');
      doc.setFontSize(18);
      doc.setTextColor(0, 0, 0);
      doc.text(String(i + 1), BADGE_CX, HEADER_H / 2 + 6, { align: 'center' });

      const rawTitle = `Clicked ${step.elementInfo}`;
      const titleDataUrl = renderTextAsImage(rawTitle, {
        width: TITLE_W, height: HEADER_H,
        fontSize: 22, color: '#ffffff', bgColor: '#1a1a1d',
      });
      doc.addImage(await loadImage(titleDataUrl), 'PNG', TITLE_X, 0, TITLE_W, HEADER_H);

      doc.setFontSize(14);
      doc.setTextColor(100, 100, 110);
      doc.text('LocalGuide', W - PAD, HEADER_H / 2 + 5, { align: 'right' });

      doc.setFillColor(255, 255, 255);
      doc.rect(0, H - FOOTER_H, W, FOOTER_H, 'F');
      doc.setDrawColor(210, 210, 215);
      doc.setLineWidth(1);
      doc.line(0, H - FOOTER_H, W, H - FOOTER_H);

      const tsDataUrl = renderTextAsImage(new Date(step.timestamp).toLocaleString(), {
        width: 500, height: FOOTER_H,
        fontSize: 13, color: '#8c8c96', bgColor: '#ffffff',
      });
      doc.addImage(await loadImage(tsDataUrl), 'PNG', PAD, H - FOOTER_H, 500, FOOTER_H);

      doc.setFontSize(13);
      doc.setTextColor(140, 140, 150);
      doc.text(`Step ${i + 1} of ${steps.length}`, W - PAD, H - FOOTER_H + 28, { align: 'right' });

      const areaX = PAD + 4;
      const areaY = HEADER_H + PAD;
      const areaW = W - PAD * 2;
      const areaH = H - HEADER_H - FOOTER_H - PAD * 2;

      const img = await loadImage(step.image);
      const scale = Math.min(areaW / img.width, areaH / img.height, 1);
      const renderW = img.width * scale;
      const renderH = img.height * scale;
      const imgX = areaX + (areaW - renderW) / 2;
      const imgY = areaY + (areaH - renderH) / 2;

      doc.setFillColor(180, 180, 185);
      doc.rect(imgX + 4, imgY + 4, renderW, renderH, 'F');
      doc.setFillColor(255, 255, 255);
      doc.rect(imgX, imgY, renderW, renderH, 'F');

      const imgFormat = step.image.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';
      doc.addImage(img, imgFormat, imgX, imgY, renderW, renderH);

      doc.setDrawColor(210, 210, 215);
      doc.setLineWidth(1);
      doc.rect(imgX, imgY, renderW, renderH, 'S');
    }

    doc.save('LocalGuide_Workflow.pdf');
  }

  // ── HTML Export ────────────────────────────────────────────────────────────

  async function generateHTML() {
    const steps = await getSteps();
    if (!steps) return;
    downloadBlob(new Blob([LocalGuide.buildHTMLString(steps)], { type: 'text/html' }), 'LocalGuide_Workflow.html');
  }

  // ── Word Export ────────────────────────────────────────────────────────────

  async function generateWord() {
    const steps = await getSteps();
    if (!steps) return;
    // BOM ensures Word reads UTF-8 correctly (important for Arabic text)
    downloadBlob(new Blob(['﻿' + LocalGuide.buildWordString(steps)], { type: 'application/msword' }), 'LocalGuide_Workflow.doc');
  }
});
