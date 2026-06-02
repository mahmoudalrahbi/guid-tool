import test from "node:test";
import assert from "node:assert";
import { exportToDocx } from "./docx.js";

test("exportToDocx renders Rendered Steps using imageBytes and dimensions", async () => {
  const guide = {
    title: "Test DOCX Guide",
    description: "DOCX Desc",
  };
  const imageBytes = new ArrayBuffer(8);
  const steps = [
    {
      order: 1,
      description: "Step 1 text",
      imageBytes,
      width: 800,
      height: 600,
    }
  ];

  const deps = {
    docx: {
      Document: class Document {
        constructor(opts) { this.opts = opts; }
      },
      Packer: {
        toBlob: async (doc) => {
          return new Blob([JSON.stringify(doc.opts)], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
        }
      },
      Paragraph: class Paragraph {
        constructor(opts) { this.type = 'Paragraph'; this.opts = opts; }
      },
      TextRun: class TextRun {
        constructor(opts) { this.type = 'TextRun'; this.opts = opts; }
      },
      ImageRun: class ImageRun {
        constructor(opts) { this.type = 'ImageRun'; this.opts = opts; }
      },
      HeadingLevel: {
        HEADING_1: 'HEADING_1',
        HEADING_2: 'HEADING_2'
      }
    },
  };

  const blob = await exportToDocx(guide, steps, deps);
  assert.strictEqual(blob.type, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");

  const docOpts = JSON.parse(await blob.text());
  const children = docOpts.sections[0].children;

  const titlePara = children.find(c => c.opts.text === "Test DOCX Guide" && c.opts.heading === "HEADING_1");
  assert.ok(titlePara, "Missing title paragraph");

  const stepHeading = children.find(c => c.opts.text === "STEP 01" && c.opts.heading === "HEADING_2");
  assert.ok(stepHeading, "Missing step 1 heading");

  const imagePara = children.find(c =>
    c.opts.children &&
    c.opts.children[0] &&
    c.opts.children[0].type === "ImageRun"
  );
  assert.ok(imagePara, "Missing image paragraph");

  const descPara = children.find(c => c.opts.text === "Step 1 text");
  assert.ok(descPara, "Missing step 1 description paragraph");
});

test("exportToDocx scales image when width exceeds 600px", async () => {
  const guide = { title: "G" };
  const steps = [{ order: 1, description: "", imageBytes: new ArrayBuffer(4), width: 1200, height: 900 }];

  const captured = [];
  const deps = {
    docx: {
      Document: class { constructor(opts) { this.opts = opts; } },
      Packer: { toBlob: async (doc) => new Blob([JSON.stringify(doc.opts)]) },
      Paragraph: class { constructor(opts) { this.type = 'Paragraph'; this.opts = opts; } },
      TextRun: class { constructor(opts) { this.type = 'TextRun'; this.opts = opts; } },
      ImageRun: class { constructor(opts) { captured.push(opts); this.type = 'ImageRun'; this.opts = opts; } },
      HeadingLevel: { HEADING_1: 'H1', HEADING_2: 'H2' },
    },
  };

  await exportToDocx(guide, steps, deps);
  assert.equal(captured[0].transformation.width, 600);
  assert.equal(captured[0].transformation.height, 450);
});
