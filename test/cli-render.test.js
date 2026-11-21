import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("CLI renders a fixed-height multiline prompt with a vertical caret", () => {
  const source = fs.readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
  assert.ok(source.includes("layoutMultilineInput(input,cursor,contentWidth,promptRows)"));
  assert.ok(source.includes('paint("│",accent)'));
  assert.ok(source.includes("const promptRows=5;"));
  assert.ok(source.includes('if(k.ctrl&&k.name==="j")'));
  assert.ok(source.includes("if(k.shift)"));
});
