import { exportToHtml } from "./html.js";
import { exportToPdf } from "./pdf.js";

const formats = {
  html: {
    id: "html",
    name: "Export as HTML",
    extension: "html",
    exportFn: exportToHtml
  },
  pdf: {
    id: "pdf",
    name: "Export as PDF",
    extension: "pdf",
    exportFn: exportToPdf
  }
};

export function getExportFormats() {
  return Object.values(formats);
}

export async function exportGuide(formatId, guide, steps) {
  const format = formats[formatId];
  if (!format) {
    throw new Error(`Unknown export format: ${formatId}`);
  }
  
  const blob = await format.exportFn(guide, steps);
  
  // Download the blob
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(guide.title || "Untitled").replace(/\s+/g, "-")}.${format.extension}`;
  a.click();
  URL.revokeObjectURL(url);
}
