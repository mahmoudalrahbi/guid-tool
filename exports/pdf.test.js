import test from "node:test";
import assert from "node:assert";
import { exportToPdf } from "./pdf.js";

test("exportToPdf uses injected html2pdf and formatting options", async () => {
  const guide = {
    title: "Test PDF Guide",
    description: "PDF Desc",
  };
  const steps = [
    {
      order: 1,
      description: "Step 1 text",
      screenshotBlob: new Blob(["fake"]),
    }
  ];



  let calledOpts = null;
  let pdfTextCalled = false;
  let passedElement = null;
  let compositeCount = 0;

  const deps = {
    document: {
      createElement: (tag) => {
        const el = {
          style: {},
          appendChild: () => {},
        };
        if (tag === 'img') {
          setTimeout(() => {
            if (el.onload) el.onload();
          }, 0);
        }
        return el;
      }
    },
    blobToDataUrl: async (b) => "data:image/png;base64,fake",
    composite: async (step) => {
      compositeCount++;
      return step.screenshotBlob;
    },
    html2pdf: () => {
      const worker = {
        set: (opt) => { calledOpts = opt; return worker; },
        from: (el) => { passedElement = el; return worker; },
        toPdf: () => worker,
        get: (prop) => worker,
        then: (cb) => {
          cb({
            internal: { getNumberOfPages: () => 1, pageSize: { getHeight: () => 11 } },
            setPage: () => {}, 
            setFont: () => {}, 
            setFontSize: () => {}, 
            setTextColor: () => {}, 
            text: (str) => { if (str === "Made with LocalGuide") pdfTextCalled = true; }
          });
          return worker;
        },
        output: (type) => Promise.resolve(new Blob(["fake pdf blob"], { type: "application/pdf" }))
      };
      return worker;
    }
  };

  const blob = await exportToPdf(guide, steps, deps);
  
  assert.strictEqual(blob.type, "application/pdf");
  assert.strictEqual(compositeCount, 1, "composite() was not called for the step");
  assert.ok(calledOpts, "html2pdf.set() was not called");
  assert.strictEqual(calledOpts.margin, 0.5);
  assert.strictEqual(calledOpts.filename, "Test-PDF-Guide.pdf");
  assert.strictEqual(calledOpts.jsPDF.format, "letter", "Expected page-size 'letter'");
  assert.strictEqual(calledOpts.jsPDF.orientation, "portrait", "Expected orientation 'portrait'");
  assert.ok(passedElement, "html2pdf.from() was not called with an element");
  assert.ok(pdfTextCalled, "PDF footer text was not injected");
});
