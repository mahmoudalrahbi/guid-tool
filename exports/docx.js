export async function exportToDocx(guide, steps) {
  const { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel } = window.docx;

  const children = [];

  children.push(
    new Paragraph({
      text: guide.title || "Untitled Guide",
      heading: HeadingLevel.HEADING_1,
    })
  );

  if (guide.description) {
    children.push(
      new Paragraph({
        text: guide.description,
      })
    );
  }

  for (const step of steps) {
    children.push(
      new Paragraph({
        text: `Step ${step.order}`,
        heading: HeadingLevel.HEADING_2,
      })
    );

    const arrayBuffer = await step.screenshotBlob.arrayBuffer();
    const dims = await getImageDimensions(step.screenshotBlob);
    
    const maxWidth = 600;
    let width = dims.width;
    let height = dims.height;
    if (width > maxWidth) {
      height = Math.round((height * maxWidth) / width);
      width = maxWidth;
    }

    children.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: arrayBuffer,
            transformation: {
              width: width,
              height: height,
            },
          }),
        ],
      })
    );

    if (step.description) {
      children.push(
        new Paragraph({
          text: step.description,
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: children,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

function getImageDimensions(blob) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: 600, height: 400 }); // fallback
    };
    img.src = url;
  });
}
