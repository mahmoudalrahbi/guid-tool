export async function exportToDocx(guide, steps, deps) {
  const { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel } = deps.docx;

  const children = [];

  children.push(
    new Paragraph({
      text: guide.title || "Untitled Guide",
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
    })
  );

  if (guide.description) {
    children.push(
      new Paragraph({
        text: guide.description,
        spacing: { after: 400 },
      })
    );
  }

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

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];

    const headingOpts = {
      text: `STEP ${step.order.toString().padStart(2, '0')}`,
      heading: HeadingLevel.HEADING_2,
      keepNext: true,
    };

    if (i === 0) {
      headingOpts.pageBreakBefore = true;
    }

    children.push(new Paragraph(headingOpts));

    const maxWidth = 600;
    let width = step.width;
    let height = step.height;
    if (width > maxWidth) {
      height = Math.round((height * maxWidth) / width);
      width = maxWidth;
    }

    children.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: step.imageBytes,
            transformation: { width, height },
          }),
        ],
        keepNext: !!step.description,
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
    sections: [{ properties: {}, children }],
  });

  return await Packer.toBlob(doc);
}
