import test from "node:test";
import assert from "node:assert";
import { exportToMarkdown } from "./markdown.js";

test("exportToMarkdown uses injected deps and formats correctly", async () => {
  const guide = {
    title: "My Markdown Guide",
    description: "Guide description here",
  };
  const steps = [
    {
      order: 1,
      description: "First step description",
      screenshotBlob: new Blob(["fake1"]),
    },
    {
      order: 2,
      description: "Second step description",
      screenshotBlob: new Blob(["fake2"]),
    }
  ];

  let blobCount = 0;
  let compositeCount = 0;

  const deps = {
    blobToDataUrl: async (blob) => {
      blobCount++;
      const text = await blob.text();
      return `data:image/png;base64,${text}`;
    },
    composite: async (step) => {
      compositeCount++;
      return step.screenshotBlob;
    }
  };

  const blob = await exportToMarkdown(guide, steps, deps);
  const mdContent = await blob.text();

  assert.strictEqual(blob.type, "text/markdown");
  
  // Verify deps were used
  assert.strictEqual(compositeCount, 2);
  assert.strictEqual(blobCount, 2);

  // Verify content formatting
  assert.match(mdContent, /# My Markdown Guide/);
  assert.match(mdContent, /> Guide description here/);
  assert.match(mdContent, /### STEP 01/);
  assert.match(mdContent, /!\[Step 1\]\(data:image\/png;base64,fake1\)/);
  assert.match(mdContent, /First step description/);
  assert.match(mdContent, /### STEP 02/);
  assert.match(mdContent, /!\[Step 2\]\(data:image\/png;base64,fake2\)/);
  assert.match(mdContent, /Second step description/);
  
  // Verify order
  const step1Index = mdContent.indexOf("### STEP 01");
  const step2Index = mdContent.indexOf("### STEP 02");
  assert.ok(step1Index !== -1);
  assert.ok(step2Index !== -1);
  assert.ok(step1Index < step2Index);
});
