import type { LineBox } from "./line-boxes.js";
import { measureRange } from "./measure-range.js";

/**
 * Offset of the first character rendered on `line` (a line box of `textNode`), found by binary
 * search over character rects. Text before it belongs to earlier lines.
 */
export function lineStartOffset(textNode: Text, line: LineBox): number {
  const text = textNode.data;
  const range = measureRange(textNode.ownerDocument);
  const lineMiddle = (line.top + line.bottom) / 2;
  let low = 0;
  let high = text.length - 1;
  let result = text.length;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    range.setStart(textNode, mid);
    range.setEnd(textNode, mid + 1);
    const rect = range.getBoundingClientRect();

    if ((rect.top + rect.bottom) / 2 >= lineMiddle) {
      result = mid;
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  return result;
}
