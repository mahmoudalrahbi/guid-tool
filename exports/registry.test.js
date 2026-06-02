import test, { describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { projectStep } from "./registry.js";

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

// ── Rendered Step projection ──────────────────────────────────────────────────

function makeProjectDeps() {
  return {
    blobToDataUrl: async () => 'data:image/jpeg;base64,fake',
    URL: { createObjectURL: () => 'blob:fake', revokeObjectURL: () => {} },
    Image: class {
      constructor() {
        setTimeout(() => { this.width = 800; this.height = 600; if (this.onload) this.onload(); }, 0);
      }
    },
  };
}

test('projectStep populates imageDataUrl for a click Step', async () => {
  const blob = new Blob(['img']);
  const step = { id: 's1', order: 1, stepType: 'click', annotation: { x: 0.5, y: 0.5 }, screenshotBlob: blob };
  const fakeComposite = async () => blob;

  const rendered = await projectStep(step, fakeComposite, makeProjectDeps());
  assert.strictEqual(rendered.imageDataUrl, 'data:image/jpeg;base64,fake');
});

test('projectStep populates imageBytes as ArrayBuffer', async () => {
  const blob = new Blob(['hello']);
  const step = { id: 's1', order: 1, stepType: 'click', annotation: { x: 0 }, screenshotBlob: blob };
  const rendered = await projectStep(step, async () => blob, makeProjectDeps());
  assert.ok(rendered.imageBytes instanceof ArrayBuffer);
});

test('projectStep populates width and height from image dimensions', async () => {
  const blob = new Blob(['img']);
  const step = { id: 's1', order: 1, stepType: 'click', annotation: { x: 0 }, screenshotBlob: blob };
  const rendered = await projectStep(step, async () => blob, makeProjectDeps());
  assert.strictEqual(rendered.width, 800);
  assert.strictEqual(rendered.height, 600);
});

test('projectStep does not call composite for a navigation Step (no annotation)', async () => {
  const blob = new Blob(['nav']);
  const step = { id: 's2', order: 2, stepType: 'navigation', screenshotBlob: blob };
  let compositeCalled = false;
  const fakeComposite = async () => { compositeCalled = true; return blob; };

  const rendered = await projectStep(step, fakeComposite, makeProjectDeps());
  assert.equal(compositeCalled, false, 'composite must not be called for navigation Steps');
  assert.ok(rendered.imageDataUrl, 'imageDataUrl must still be populated');
});

test('projectStep preserves all original step fields', async () => {
  const blob = new Blob(['img']);
  const step = { id: 's1', order: 3, stepType: 'click', description: 'Click here', annotation: { x: 0 }, screenshotBlob: blob };
  const rendered = await projectStep(step, async () => blob, makeProjectDeps());
  assert.strictEqual(rendered.id, 's1');
  assert.strictEqual(rendered.order, 3);
  assert.strictEqual(rendered.description, 'Click here');
});
