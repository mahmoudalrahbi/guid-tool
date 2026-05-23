export async function exportToDocx(guide, steps) {
  const { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel } = window.docx;

  const children = [];

  // Cover Page: Title
  children.push(
    new Paragraph({
      text: guide.title || "Untitled Guide",
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
    })
  );

  // Cover Page: Description
  if (guide.description) {
    children.push(
      new Paragraph({
        text: guide.description,
        spacing: { after: 400 },
      })
    );
  }

  // Cover Page: Footer
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Made with LocalGuide",
          italics: true,
          color: "A1A1AA",
        })
      ],
      spacing: { before: 800 },
    })
  );

  // Steps
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];

    // Heading for the step
    const headingOpts = {
      text: `STEP ${step.order.toString().padStart(2, '0')}`,
      heading: HeadingLevel.HEADING_2,
      keepNext: true, // Keep heading with image
    };
    
    // Start steps on a new page
    if (i === 0) {
      headingOpts.pageBreakBefore = true;
    }

    children.push(new Paragraph(headingOpts));

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
        keepNext: !!step.description, // Keep image with description if it exists
        spacing: { after: 200 },
      })
    );

    if (step.description) {
      children.push(
        new Paragraph({
          text: step.description,
          spacing: { after: 400 },
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
