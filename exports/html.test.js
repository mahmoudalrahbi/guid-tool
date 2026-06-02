import test from "node:test";
import assert from "node:assert";
import { exportToHtml } from "./html.js";

test("exportToHtml renders Rendered Steps with imageDataUrl inline", async () => {
  const guide = {
    title: "My <Awesome> Guide",
    description: "A & B",
  };
  const steps = [
    { order: 1, description: 'Click "Here"', imageDataUrl: 'data:image/jpeg;base64,step1' },
    { order: 2, description: 'Done',         imageDataUrl: 'data:image/jpeg;base64,step2' },
  ];

  let escapeCount = 0;
  const deps = {
    escapeHtml: (str) => {
      escapeCount++;
      return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    },
  };

  const blob = await exportToHtml(guide, steps, deps);
  const html = await blob.text();

  assert.strictEqual(blob.type, "text/html");
  assert.match(html, /My &lt;Awesome&gt; Guide/);
  assert.match(html, /A &amp; B/);
  assert.match(html, /Click &quot;Here&quot;/);
  assert.match(html, /src="data:image\/jpeg;base64,step1"/);
  assert.match(html, /src="data:image\/jpeg;base64,step2"/);
  assert.ok(escapeCount >= 4, 'escapeHtml must be called for title, description, and step descriptions');
});
