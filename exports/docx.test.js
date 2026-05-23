import test from "node:test";
import assert from "node:assert";
import { exportToDocx } from "./docx.js";



test("exportToDocx uses injected docx and formats correctly", async () => {
  const guide = {
    title: "Test DOCX Guide",
    description: "DOCX Desc",
  };
  const steps = [
    {
      order: 1,
      description: "Step 1 text",
      screenshotBlob: new Blob(["fake-img"]),
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
    URL: {
      createObjectURL: () => "fake-url",
      revokeObjectURL: () => {}
    },
    Image: class {
      constructor() {
        setTimeout(() => {
          this.width = 800;
          this.height = 600;
          if (this.onload) this.onload();
        }, 0);
      }
    }
  };

  const blob = await exportToDocx(guide, steps, deps);
  assert.strictEqual(blob.type, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");

  const docOptsText = await blob.text();
  const docOpts = JSON.parse(docOptsText);
  
  const children = docOpts.sections[0].children;
  
  // Find title paragraph
  const titlePara = children.find(c => c.opts.text === "Test DOCX Guide" && c.opts.heading === "HEADING_1");
  assert.ok(titlePara, "Missing title paragraph");

  // Find step 1 heading
  const stepHeading = children.find(c => c.opts.text === "STEP 01" && c.opts.heading === "HEADING_2");
  assert.ok(stepHeading, "Missing step 1 heading");

  // Find image
  const imagePara = children.find(c => 
    c.opts.children && 
    c.opts.children[0] && 
    c.opts.children[0].type === "ImageRun"
  );
  assert.ok(imagePara, "Missing image paragraph");

  // Find step 1 description
  const descPara = children.find(c => c.opts.text === "Step 1 text");
  assert.ok(descPara, "Missing step 1 description paragraph");
});
