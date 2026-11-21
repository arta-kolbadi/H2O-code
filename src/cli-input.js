// Multiline terminal prompt layout with a cursor-aware vertical viewport.
const isWide = ch => {
  const cp = ch.codePointAt(0);
  return (cp >= 0x1100 && (cp <= 0x115f || cp === 0x2329 || cp === 0x232a ||
    (cp >= 0x2e80 && cp <= 0xa4cf) || (cp >= 0xac00 && cp <= 0xd7a3) ||
    (cp >= 0xf900 && cp <= 0xfaff) || (cp >= 0xfe10 && cp <= 0xfe6f) ||
    (cp >= 0xff00 && cp <= 0xff60) || (cp >= 0x1f300 && cp <= 0x1faff) ||
    (cp >= 0x20000 && cp <= 0x3fffd)));
};
export const charWidth = ch => ch === "\t" ? 4 : isWide(ch) ? 2 : 1;

export function layoutMultilineInput(value, cursor, columns, rows = 5) {
  const chars = Array.from(String(value ?? ""));
  const width = Math.max(1, Math.trunc(Number(columns) || 1));
  const height = Math.max(1, Math.trunc(Number(rows) || 1));
  const caret = Math.max(0, Math.min(chars.length, Math.trunc(Number(cursor) || 0)));
  const lines = [{ chars: [], cells: 0 }];
  let line = 0, column = 0, cursorLine = 0, cursorColumn = 0, cursorOffset = 0;
  const newLine = () => { lines.push({ chars: [], cells: 0 }); line++; column = 0; };
  for (let i = 0; i <= chars.length; i++) {
    if (i === caret) {
      if (column >= width && lines[line].chars.length) newLine();
      cursorLine = line; cursorColumn = column; cursorOffset = lines[line].chars.length;
    }
    if (i === chars.length) break;
    const ch = chars[i];
    if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && chars[i + 1] === "\n") continue;
      newLine(); continue;
    }
    const shown = ch === "\t" ? "    " : ch;
    const cw = charWidth(ch);
    if (column + cw > width && lines[line].chars.length) newLine();
    lines[line].chars.push(shown);
    lines[line].cells += cw; column += cw;
  }
  const start = Math.max(0, Math.min(cursorLine - height + 1, lines.length - height));
  const visible = lines.slice(start, start + height);
  return { lines: visible, cursorLine: cursorLine - start, cursorColumn, cursorOffset, scrollTop: start, totalLines: lines.length, width, height };
}
