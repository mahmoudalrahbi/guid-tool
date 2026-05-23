export async function exportToPdf(guide, steps) {
  // We need to construct a DOM element specifically for PDF generation
  const container = document.createElement("div");
  container.style.width = "800px";
  container.style.padding = "40px";
  container.style.fontFamily = "system-ui, sans-serif";
  container.style.color = "#111";
  container.style.backgroundColor = "#fff";
  
  // Title
  const titleEl = document.createElement("h1");
  titleEl.textContent = guide.title || "Untitled Guide";
  titleEl.style.fontSize = "28px";
  titleEl.style.marginBottom = "8px";
  container.appendChild(titleEl);

  // Description
  if (guide.description) {
    const descEl = document.createElement("p");
    descEl.textContent = guide.description;
    descEl.style.fontSize = "16px";
    descEl.style.color = "#4b5563";
    descEl.style.marginBottom = "32px";
    container.appendChild(descEl);
  }

  // Steps
  for (const step of steps) {
    const stepEl = document.createElement("div");
    stepEl.style.display = "flex";
    stepEl.style.gap = "20px";
    stepEl.style.marginBottom = "32px";
    stepEl.style.paddingBottom = "32px";
    stepEl.style.borderBottom = "1px solid #e5e7eb";
    // Prevent page breaks inside a step if possible
    stepEl.style.pageBreakInside = "avoid";

    // Number
    const numEl = document.createElement("div");
    numEl.textContent = step.order;
    numEl.style.fontSize = "14px";
    numEl.style.fontWeight = "600";
    numEl.style.color = "#fff";
    numEl.style.backgroundColor = "#3b82f6";
    numEl.style.width = "28px";
    numEl.style.height = "28px";
    numEl.style.display = "flex";
    numEl.style.alignItems = "center";
    numEl.style.justifyContent = "center";
    numEl.style.borderRadius = "14px";
    numEl.style.flexShrink = "0";
    stepEl.appendChild(numEl);

    // Image
    const imgUrl = await blobToDataUrl(step.screenshotBlob);
    const imgEl = document.createElement("img");
    imgEl.src = imgUrl;
    imgEl.style.width = "300px";
    imgEl.style.borderRadius = "6px";
    imgEl.style.border = "1px solid #e5e7eb";
    imgEl.style.flexShrink = "0";
    imgEl.style.objectFit = "contain";
    stepEl.appendChild(imgEl);

    // Wait for image to load so html2canvas can capture it
    await new Promise((resolve) => {
      imgEl.onload = resolve;
      imgEl.onerror = resolve;
    });

    // Description text
    const textEl = document.createElement("p");
    textEl.textContent = step.description;
    textEl.style.margin = "0";
    textEl.style.color = "#374151";
    textEl.style.fontSize = "15px";
    textEl.style.lineHeight = "1.5";
    stepEl.appendChild(textEl);

    container.appendChild(stepEl);
  }

  const opt = {
    margin:       0.5,
    filename:     `${(guide.title || "Untitled").replace(/\s+/g, "-")}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true },
    jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
  };

  // Generate PDF as a blob (html2pdf works perfectly with detached nodes)
  const pdfBlob = await html2pdf().set(opt).from(container).output('blob');
  return pdfBlob;
}

function blobToDataUrl(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}
