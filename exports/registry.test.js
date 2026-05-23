import test, { describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert";

describe("Export Registry", () => {
  const calls = { html: 0, pdf: 0, markdown: 0, docx: 0 };
  const downloads = [];
  let originalURL;
  let originalDocument;
  let registry;

  beforeEach(async () => {
    // Reset state
    calls.html = 0;
    calls.pdf = 0;
    calls.markdown = 0;
    calls.docx = 0;
    downloads.length = 0;

    // Backup globals
    originalURL = globalThis.URL;
    originalDocument = globalThis.document;

    // Mock globals
    globalThis.URL = {
      ...originalURL,
      createObjectURL: () => "blob:fake-url",
      revokeObjectURL: () => {}
    };

    globalThis.document = {
      createElement: (tag) => {
        if (tag === "a") {
          const a = {
            href: "",
            download: "",
            click: () => {
              downloads.push({ href: a.href, download: a.download });
            }
          };
          return a;
        }
        return {};
      }
    };

    // Load registry and intercept export functions
    registry = await import("./registry.js");
    const formats = registry.getExportFormats();
    
    const htmlFmt = formats.find(f => f.id === "html");
    if (htmlFmt) htmlFmt.exportFn = async () => { calls.html++; return new Blob(["html"]); };
    
    const pdfFmt = formats.find(f => f.id === "pdf");
    if (pdfFmt) pdfFmt.exportFn = async () => { calls.pdf++; return new Blob(["pdf"]); };
    
    const mdFmt = formats.find(f => f.id === "markdown");
    if (mdFmt) mdFmt.exportFn = async () => { calls.markdown++; return new Blob(["md"]); };
    
    const docxFmt = formats.find(f => f.id === "docx");
    if (docxFmt) docxFmt.exportFn = async () => { calls.docx++; return new Blob(["docx"]); };
  });

  afterEach(() => {
    globalThis.URL = originalURL;
    globalThis.document = originalDocument;
  });

  test("getExportFormats returns an entry for each of the four registered formats", () => {
    const formats = registry.getExportFormats();
    assert.strictEqual(formats.length, 4);
    const ids = formats.map(f => f.id);
    assert.ok(ids.includes("html"));
    assert.ok(ids.includes("pdf"));
    assert.ok(ids.includes("markdown"));
    assert.ok(ids.includes("docx"));
  });

  test("exportGuide('html') calls the HTML format function and not others", async () => {
    await registry.exportGuide("html", { title: "Test Guide" }, []);
    assert.strictEqual(calls.html, 1);
    assert.strictEqual(calls.pdf, 0);
    assert.strictEqual(calls.markdown, 0);
    assert.strictEqual(calls.docx, 0);
  });

  test("exportGuide('pdf') calls the PDF format function and not others", async () => {
    await registry.exportGuide("pdf", { title: "Test Guide" }, []);
    assert.strictEqual(calls.html, 0);
    assert.strictEqual(calls.pdf, 1);
    assert.strictEqual(calls.markdown, 0);
    assert.strictEqual(calls.docx, 0);
  });

  test("exportGuide('markdown') calls the Markdown format function and not others", async () => {
    await registry.exportGuide("markdown", { title: "Test Guide" }, []);
    assert.strictEqual(calls.html, 0);
    assert.strictEqual(calls.pdf, 0);
    assert.strictEqual(calls.markdown, 1);
    assert.strictEqual(calls.docx, 0);
  });

  test("exportGuide('docx') calls the DOCX format function and not others", async () => {
    await registry.exportGuide("docx", { title: "Test Guide" }, []);
    assert.strictEqual(calls.html, 0);
    assert.strictEqual(calls.pdf, 0);
    assert.strictEqual(calls.markdown, 0);
    assert.strictEqual(calls.docx, 1);
  });

  test("download is triggered with a filename derived from the Guide title (spaces replaced, correct extension)", async () => {
    await registry.exportGuide("html", { title: "My Awesome Guide" }, []);
    assert.strictEqual(downloads.length, 1);
    assert.strictEqual(downloads[0].download, "My-Awesome-Guide.html");
    assert.strictEqual(downloads[0].href, "blob:fake-url");
  });

  test("download uses 'Untitled' if Guide title is missing", async () => {
    await registry.exportGuide("pdf", {}, []);
    assert.strictEqual(downloads.length, 1);
    assert.strictEqual(downloads[0].download, "Untitled.pdf");
  });
  
  test("exportGuide throws an error for unknown formats", async () => {
    await assert.rejects(
      async () => await registry.exportGuide("unknown", { title: "Test" }, []),
      { message: "Unknown export format: unknown" }
    );
  });
});




