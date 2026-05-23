export async function exportToPdf(guide, steps, deps) {
  // We need to construct a DOM element specifically for PDF generation
  const container = deps.document.createElement("div");
  container.style.width = "800px";
  container.style.padding = "40px";
  container.style.fontFamily = "system-ui, sans-serif";
  container.style.color = "#111";
  container.style.backgroundColor = "#fff";
  
  // HEADER (No page break)
  const headerSection = deps.document.createElement("div");
  headerSection.style.marginBottom = "40px";
  headerSection.style.display = "flex";
  headerSection.style.flexDirection = "column";

  // Title
  const titleEl = deps.document.createElement("h1");
  titleEl.textContent = guide.title || "Untitled Guide";
  titleEl.style.fontFamily = "Georgia, serif";
  titleEl.style.fontSize = "36px";
  titleEl.style.fontWeight = "600";
  titleEl.style.lineHeight = "1.12";
  titleEl.style.letterSpacing = "-0.02em";
  titleEl.style.marginBottom = "24px";
  titleEl.style.color = "#18181b";
  headerSection.appendChild(titleEl);

  // Description
  if (guide.description) {
    const descEl = deps.document.createElement("p");
    descEl.textContent = guide.description;
    descEl.style.fontFamily = "system-ui, sans-serif";
    descEl.style.fontSize = "16px";
    descEl.style.lineHeight = "1.55";
    descEl.style.color = "#3f3f46";
    descEl.style.maxWidth = "600px";
    headerSection.appendChild(descEl);
  }

  container.appendChild(headerSection);

  // Steps
  for (const step of steps) {
    const stepEl = deps.document.createElement("div");
    stepEl.style.display = "flex";
    stepEl.style.flexDirection = "column";
    stepEl.style.marginBottom = "48px";
    // Prevent page breaks inside a step so header and image stay together
    stepEl.style.pageBreakInside = "avoid";

    // Step Header (Inline Number + Description)
    const stepHeader = deps.document.createElement("div");
    stepHeader.style.display = "flex";
    stepHeader.style.alignItems = "baseline";
    stepHeader.style.marginBottom = "16px";

    // Eyebrow Number
    const numEl = deps.document.createElement("div");
    numEl.textContent = `STEP ${step.order.toString().padStart(2, '0')}`;
    numEl.style.fontFamily = "ui-monospace, monospace";
    numEl.style.fontSize = "11px";
    numEl.style.color = "#F59E0B";
    numEl.style.fontWeight = "600";
    numEl.style.letterSpacing = "0.04em";
    numEl.style.flexShrink = "0";
    numEl.style.marginRight = "16px";
    stepHeader.appendChild(numEl);

    // Description text next to number
    if (step.description) {
      const textEl = deps.document.createElement("div");
      textEl.textContent = step.description;
      textEl.style.fontFamily = "Georgia, serif";
      textEl.style.fontSize = "16px";
      textEl.style.fontWeight = "600";
      textEl.style.color = "#18181b";
      textEl.style.lineHeight = "1.35";
      stepHeader.appendChild(textEl);
    } else {
      const textEl = deps.document.createElement("div");
      textEl.textContent = `Step ${step.order}`;
      textEl.style.fontFamily = "Georgia, serif";
      textEl.style.fontSize = "16px";
      textEl.style.fontWeight = "600";
      textEl.style.color = "#18181b";
      stepHeader.appendChild(textEl);
    }

    stepEl.appendChild(stepHeader);

    // Image
    const imgUrl = await deps.blobToDataUrl(step.screenshotBlob);
    const imgEl = deps.document.createElement("img");
    imgEl.src = imgUrl;
    imgEl.style.width = "100%";
    imgEl.style.maxWidth = "720px";
    imgEl.style.borderRadius = "4px";
    imgEl.style.border = "1px solid #e4e4e7";
    imgEl.style.backgroundColor = "#fafafa";
    imgEl.style.objectFit = "contain";
    stepEl.appendChild(imgEl);

    // Wait for image to load so html2canvas can capture it
    await new Promise((resolve) => {
      imgEl.onload = resolve;
      imgEl.onerror = resolve;
    });

    container.appendChild(stepEl);
  }

  const opt = {
    margin:       0.5,
    filename:     `${(guide.title || "Untitled").replace(/\s+/g, "-")}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true },
    jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
  };

  // Generate PDF as a blob, injecting footers onto every page using jsPDF
  const pdfBlob = await deps.html2pdf().set(opt).from(container).toPdf().get('pdf').then((pdf) => {
    const totalPages = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(161, 161, 170); // #a1a1aa
      const pageHeight = pdf.internal.pageSize.getHeight();
      // Place text 0.25 inches from the bottom (margin is 0.5 in)
      pdf.text("Made with LocalGuide", 0.5, pageHeight - 0.25);
    }
  }).output('blob');
  
  return pdfBlob;
}


