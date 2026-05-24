export async function exportToMarkdown(guide, steps, deps) {
  const stepsWithDataUrls = await Promise.all(
    steps.map(async (step) => {
      const compositedBlob = await deps.composite(step);
      const dataUrl = await deps.blobToDataUrl(compositedBlob);
      return { ...step, dataUrl };
    })
  );

  let md = `# ${guide.title || "Untitled Guide"}\n\n`;
  if (guide.description) {
    // Add blockquote for description
    md += `> ${guide.description}\n\n`;
  }
  
  // Footer / Attribution
  md += `*Made with LocalGuide*\n\n`;
  
  // Pseudo page break
  md += `---\n\n`;

  stepsWithDataUrls.forEach((step) => {
    md += `### STEP ${step.order.toString().padStart(2, '0')}\n\n`;
    md += `![Step ${step.order}](${step.dataUrl})\n\n`;
    if (step.description) {
      md += `${step.description}\n\n`;
    }
    md += `---\n\n`;
  });

  return new Blob([md], { type: "text/markdown" });
}


