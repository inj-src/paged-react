export function textBreaker(textNode: Text, lineRects: DOMRect[]) {
  const text = textNode.textContent;
  if (!text) return [];

  const rectCache = new Map<number, DOMRect>();
  const rectAt = (index: number) => {
    const cachedRect = rectCache.get(index);

    if (cachedRect) {
      return cachedRect;
    }

    const charRange = textNode.ownerDocument.createRange();
    charRange.setStart(textNode, index);
    charRange.setEnd(textNode, index + 1);

    const rect = charRange.getBoundingClientRect();
    rectCache.set(index, rect);
    return rect;
  };

  const firstIndexOnLine = (lineRect: DOMRect) => {
    const lineMiddle = (lineRect.top + lineRect.bottom) / 2;
    let low = 0;
    let high = text.length - 1;
    let result = text.length;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const rect = rectAt(mid);
      const rectMiddle = (rect.top + rect.bottom) / 2;

      if (rectMiddle >= lineMiddle) {
        result = mid;
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }

    return result;
  };

  const firstIndexAfterLine = (lineRect: DOMRect, startIndex: number) => {
    const lineMiddle = (lineRect.top + lineRect.bottom) / 2;
    let low = startIndex;
    let high = text.length - 1;
    let result = text.length;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const rect = rectAt(mid);
      const rectMiddle = (rect.top + rect.bottom) / 2;

      if (rectMiddle > lineMiddle) {
        result = mid;
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }

    return result;
  };

  return lineRects.map((lineRect) => {
    const start = firstIndexOnLine(lineRect);
    const end = firstIndexAfterLine(lineRect, start);

    return {
      rect: lineRect,
      text: text.slice(start, end),
    };
  });
}
