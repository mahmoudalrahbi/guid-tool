import test from "node:test";
import assert from "node:assert";
import { exportToMarkdown } from "./markdown.js";

test("exportToMarkdown renders Rendered Steps with imageDataUrl inline", async () => {
  const guide = {
    title: "My Markdown Guide",
    description: "Guide description here",
  };
  const steps = [
    { order: 1, description: "First step description",  imageDataUrl: "data:image/jpeg;base64,step1" },
    { order: 2, description: "Second step description", imageDataUrl: "data:image/jpeg;base64,step2" },
  ];

  const blob = await exportToMarkdown(guide, steps, {});
  const md = await blob.text();

  assert.strictEqual(blob.type, "text/markdown");
  assert.match(md, /# My Markdown Guide/);
  assert.match(md, /> Guide description here/);
  assert.match(md, /### STEP 01/);
  assert.match(md, /!\[Step 1\]\(data:image\/jpeg;base64,step1\)/);
  assert.match(md, /First step description/);
  assert.match(md, /### STEP 02/);
  assert.match(md, /!\[Step 2\]\(data:image\/jpeg;base64,step2\)/);
  assert.match(md, /Second step description/);

  const step1Index = md.indexOf("### STEP 01");
  const step2Index = md.indexOf("### STEP 02");
  assert.ok(step1Index < step2Index, 'steps must appear in order');
});
