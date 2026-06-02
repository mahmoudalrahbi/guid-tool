export async function exportToMarkdown(guide, steps, deps) {
  let md = `# ${guide.title || "Untitled Guide"}\n\n`;
  if (guide.description) {
    md += `> ${guide.description}\n\n`;
  }

  md += `*Made with LocalGuide*\n\n`;
  md += `---\n\n`;

  steps.forEach((step) => {
    md += `### STEP ${step.order.toString().padStart(2, '0')}\n\n`;
    md += `![Step ${step.order}](${step.imageDataUrl})\n\n`;
    if (step.description) {
      md += `${step.description}\n\n`;
    }
    md += `---\n\n`;
  });

  return new Blob([md], { type: "text/markdown" });
}
