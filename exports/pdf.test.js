import test from "node:test";
import assert from "node:assert";
import { exportToPdf } from "./pdf.js";

test("exportToPdf renders Rendered Steps using imageDataUrl", async () => {
  const guide = {
    title: "Test PDF Guide",
    description: "PDF Desc",
  };
  const steps = [
    {
      order: 1,
      description: "Step 1 text",
      imageDataUrl: "data:image/jpeg;base64,step1",
    }
  ];

  let calledOpts = null;
  let pdfTextCalled = false;
  let passedElement = null;
  let imgSrcSet = null;

  const deps = {
    document: {
      createElement: (tag) => {
        const el = {
          style: {},
          appendChild: () => {},
          textContent: '',
          set src(v) { imgSrcSet = v; setTimeout(() => { if (el.onload) el.onload(); }, 0); },
        };
        return el;
      }
    },
    html2pdf: () => {
      const worker = {
        set: (opt) => { calledOpts = opt; return worker; },
        from: (el) => { passedElement = el; return worker; },
        toPdf: () => worker,
        get: () => worker,
        then: (cb) => {
          cb({
            internal: { getNumberOfPages: () => 1, pageSize: { getHeight: () => 11 } },
            setPage: () => {}, setFont: () => {}, setFontSize: () => {}, setTextColor: () => {},
            text: (str) => { if (str === "Made with LocalGuide") pdfTextCalled = true; }
          });
          return worker;
        },
        output: () => Promise.resolve(new Blob(["pdf"], { type: "application/pdf" }))
      };
      return worker;
    }
  };

  const blob = await exportToPdf(guide, steps, deps);

  assert.strictEqual(blob.type, "application/pdf");
  assert.strictEqual(imgSrcSet, "data:image/jpeg;base64,step1", "img.src must use step.imageDataUrl");
  assert.ok(calledOpts, "html2pdf.set() was not called");
  assert.strictEqual(calledOpts.margin, 0.5);
  assert.strictEqual(calledOpts.filename, "Test-PDF-Guide.pdf");
  assert.strictEqual(calledOpts.jsPDF.format, "letter");
  assert.strictEqual(calledOpts.jsPDF.orientation, "portrait");
  assert.ok(passedElement, "html2pdf.from() was not called with an element");
  assert.ok(pdfTextCalled, "PDF footer text was not injected");
});
