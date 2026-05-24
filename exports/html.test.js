import test from "node:test";
import assert from "node:assert";
import { exportToHtml } from "./html.js";

test("exportToHtml uses injected deps and formats correctly", async () => {
  const guide = {
    title: "My <Awesome> Guide",
    description: "A & B",
  };
  const steps = [
    {
      order: 1,
      description: "Click \"Here\"",
      screenshotBlob: new Blob(["fake1"]),
    },
    {
      order: 2,
      description: "Done",
      screenshotBlob: new Blob(["fake2"]),
    }
  ];

  let escapeCount = 0;
  let blobCount = 0;
  let compositeCount = 0;

  const deps = {
    escapeHtml: (str) => {
      escapeCount++;
      return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    },
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

  const blob = await exportToHtml(guide, steps, deps);
  const htmlContent = await blob.text();

  assert.strictEqual(blob.type, "text/html");
  
  // Verify deps were used
  assert.strictEqual(compositeCount, 2);
  assert.strictEqual(escapeCount, 4); // title, description, and 2 step descriptions
  assert.strictEqual(blobCount, 2);

  // Verify content formatting
  assert.match(htmlContent, /My &lt;Awesome&gt; Guide/);
  assert.match(htmlContent, /A &amp; B/);
  assert.match(htmlContent, /Click &quot;Here&quot;/);
  assert.match(htmlContent, /<img src="data:image\/png;base64,fake1" alt="Step 1" \/>/);
  assert.match(htmlContent, /<img src="data:image\/png;base64,fake2" alt="Step 2" \/>/);
});
