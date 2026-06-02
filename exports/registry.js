import { exportToHtml } from "./html.js";
import { exportToPdf } from "./pdf.js";
import { exportToMarkdown } from "./markdown.js";
import { exportToDocx } from "./docx.js";
import { composite } from "../editor/compositor.js";

const formats = {
  html: {
    id: "html",
    name: "HTML",
    extension: "html",
    exportFn: exportToHtml
  },
  pdf: {
    id: "pdf",
    name: "PDF",
    extension: "pdf",
    exportFn: exportToPdf
  },
  markdown: {
    id: "markdown",
    name: "Markdown",
    extension: "md",
    exportFn: exportToMarkdown
  },
  docx: {
    id: "docx",
    name: "DOCX",
    extension: "docx",
    exportFn: exportToDocx
  }
};

export function getExportFormats() {
  return Object.values(formats);
}

export async function projectStep(step, compositeFn, deps) {
  const blob = step.annotation ? await compositeFn(step) : step.screenshotBlob;
  const imageDataUrl = await deps.blobToDataUrl(blob);
  const imageBytes = await blob.arrayBuffer();
  const { width, height } = await getImageDimensions(blob, deps);
  return { ...step, imageDataUrl, imageBytes, width, height };
}

function getImageDimensions(blob, deps) {
  return new Promise((resolve) => {
    const url = deps.URL.createObjectURL(blob);
    const img = new deps.Image();
    img.onload = () => { deps.URL.revokeObjectURL(url); resolve({ width: img.width, height: img.height }); };
    img.onerror = () => { deps.URL.revokeObjectURL(url); resolve({ width: 600, height: 400 }); };
    img.src = url;
  });
}

export async function exportGuide(formatId, guide, steps) {
  const format = formats[formatId];
  if (!format) {
    throw new Error(`Unknown export format: ${formatId}`);
  }

  const deps = {
    blobToDataUrl: globalThis.blobToDataUrl,
    escapeHtml: globalThis.escapeHtml,
    html2pdf: globalThis.html2pdf,
    docx: globalThis.docx,
    document: globalThis.document,
    URL: globalThis.URL,
    Image: globalThis.Image,
  };

  const renderedSteps = await Promise.all(steps.map(step => projectStep(step, composite, deps)));
  const blob = await format.exportFn(guide, renderedSteps, deps);

  // Download the blob
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(guide.title || "Untitled").replace(/\s+/g, "-")}.${format.extension}`;
  a.click();
  URL.revokeObjectURL(url);
}
