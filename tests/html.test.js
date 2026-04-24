import test from "node:test";
import assert from "node:assert/strict";

import { escapeAttribute, escapeHtml } from "../src/lib/html.js";

test("escapeHtml renders user text as inert markup", () => {
  assert.equal(
    escapeHtml(`<script>alert("x")</script> 'quoted'`),
    "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &#39;quoted&#39;"
  );
});

test("escapeAttribute also escapes template delimiters", () => {
  assert.equal(escapeAttribute("font`family"), "font&#96;family");
});
