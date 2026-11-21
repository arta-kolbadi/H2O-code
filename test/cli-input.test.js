import test from 'node:test';
import assert from 'node:assert/strict';
import { layoutMultilineInput } from '../src/cli-input.js';

test('keeps short text and cursor visible', () => {
  const result = layoutMultilineInput('hello', 5, 20, 5);
  assert.equal(result.lines[0].chars.join(''), 'hello');
  assert.equal(result.cursorLine, 0);
  assert.equal(result.cursorColumn, 5);
});

test('wraps long lines and moves cursor to next visual row at boundary', () => {
  const result = layoutMultilineInput('abcdefghij', 10, 5, 5);
  assert.equal(result.totalLines, 3);
  assert.equal(result.cursorLine, 2);
  assert.equal(result.cursorColumn, 0);
});

test('supports explicit newlines and preserves empty trailing line', () => {
  const result = layoutMultilineInput('first\nsecond\n', 13, 20, 5);
  assert.equal(result.totalLines, 3);
  assert.equal(result.lines[2].chars.join(''), '');
  assert.equal(result.cursorLine, 2);
});

test('vertically scrolls to keep the cursor in the visible prompt window', () => {
  const value = ['one','two','three','four','five','six','seven'].join('\n');
  const result = layoutMultilineInput(value, Array.from(value).length, 20, 5);
  assert.equal(result.totalLines, 7);
  assert.equal(result.lines.length, 5);
  assert.equal(result.scrollTop, 2);
  assert.equal(result.cursorLine, 4);
  assert.equal(result.lines[0].chars.join(''), 'three');
});

test('counts wide characters as two terminal cells', () => {
  const result = layoutMultilineInput('abسلام', 6, 6, 5);
  assert.equal(result.totalLines, 2);
  assert.equal(result.cursorLine, 1);
});
