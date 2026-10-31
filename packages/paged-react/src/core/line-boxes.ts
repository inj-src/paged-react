import { measureRange } from "./measure-range.js";

export type LineBox = {
  top: number;
  bottom: number;
};

/**
 * Line boxes of a block that holds only inline content (text, spans, inline-blocks),
 * in viewport coordinates. Returns null for blocks with block-level children, whose
 * fragmentation is decided by those children instead.
 */
export function inlineLineBoxes(element: HTMLElement, view: Window): LineBox[] | null {
  for (const child of Array.from(element.children)) {
    if (!view.getComputedStyle(child).display.startsWith("inline")) return null;
  }

  if (!element.textContent?.trim()) return null;

  const range = measureRange(element.ownerDocument);
  // Layout-less DOMs (jsdom) have no Range geometry; skip the adjustment there.
  if (typeof range.getClientRects !== "function") return null;
  range.selectNodeContents(element);
  return groupLineBoxes(
    Array.from(range.getClientRects()).filter((rect) => rect.width > 0 && rect.height > 0),
  );
}

/**
 * Groups fragment rects into line boxes, top to bottom. Rects on the same line are merged: for
 * `white-space: pre` text Chrome reports a zero-width rect for each newline next to the line's text.
 * A zero-height rect on a line of its own stays a separate line.
 */
export function groupLineBoxes(fragments: Iterable<{ top: number; bottom: number }>): LineBox[] {
  const rects = Array.from(fragments).sort((a, b) => a.top - b.top);
  const lines: LineBox[] = [];
  for (const rect of rects) {
    const line = lines.at(-1);
    const overlapNeeded = Math.min(rect.bottom - rect.top, line ? line.bottom - line.top : 0) / 2;

    // Fragments that overlap the previous line by more than half belong to it.
    if (line && rect.top < line.bottom - overlapNeeded) {
      line.top = Math.min(line.top, rect.top);
      line.bottom = Math.max(line.bottom, rect.bottom);
    } else {
      lines.push({ top: rect.top, bottom: rect.bottom });
    }
  }

  return lines;
}

/** Parses a computed `orphans` / `widows` value; CSS's initial value is 2. */
export function lineCount(value: string): number {
  const count = Number.parseInt(value, 10);
  return Number.isFinite(count) && count > 0 ? count : 2;
}
