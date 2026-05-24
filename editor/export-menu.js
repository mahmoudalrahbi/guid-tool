export function setupExportMenu(exportMenu, exportDropdown, exportBtn, formats, onExport) {
  // Setup toggling
  exportBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    exportDropdown.classList.toggle("open");
  });
  document.addEventListener("click", (e) => {
    if (!exportDropdown.contains(e.target)) exportDropdown.classList.remove("open");
  });

  exportMenu.innerHTML = "";
  
  formats.forEach(format => {
    const item = document.createElement("div");
    item.className = "item";
    item.dataset.fmt = format.id;
    
    let svgPath = "";
    if (format.id === "html") svgPath = `<path d="M2 3l1.5 6h6L11 3M4 6h5"/>`;
    else if (format.id === "pdf") svgPath = `<rect x="2.5" y="1.5" width="8" height="10" rx="1"/><path d="M4.5 4.5h4M4.5 6.5h4M4.5 8.5h2.5"/>`;
    else if (format.id === "docx") svgPath = `<rect x="2.5" y="1.5" width="8" height="10" rx="1"/><path d="M4 5l1 3.5L6.5 5l1.5 3.5L9 5"/>`;
    else if (format.id === "markdown") svgPath = `<rect x="1" y="3" width="11" height="7" rx="1"/><path d="M3 8V5l1.5 2L6 5v3M9 5v3M7.5 6.5L9 8l1.5-1.5"/>`;
    else svgPath = `<path d="M2.5 9V2a1 1 0 0 1 1-1h6"/>`;

    item.innerHTML = `
      <div class="ico">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">${svgPath}</svg>
      </div>
      <div>
        <div>Export as ${format.name}</div>
      </div>
      <div class="meta">.${format.id}</div>
    `;
    
    item.addEventListener("click", () => {
      exportDropdown.classList.remove("open");
      onExport(format.id);
    });
    
    exportMenu.appendChild(item);
  });
}
