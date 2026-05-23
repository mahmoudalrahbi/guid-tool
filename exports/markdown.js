export async function exportToMarkdown(guide, steps) {
  const stepsWithDataUrls = await Promise.all(
    steps.map(async (step) => {
      const dataUrl = await blobToDataUrl(step.screenshotBlob);
      return { ...step, dataUrl };
    })
  );

  let md = `# ${guide.title || "Untitled Guide"}\n\n`;
  if (guide.description) {
    md += `${guide.description}\n\n`;
  }

  stepsWithDataUrls.forEach((step) => {
    md += `## Step ${step.order}\n\n`;
    md += `![Step ${step.order}](${step.dataUrl})\n\n`;
    if (step.description) {
      md += `${step.description}\n\n`;
    }
  });

  return new Blob([md], { type: "text/markdown" });
}

function blobToDataUrl(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}
