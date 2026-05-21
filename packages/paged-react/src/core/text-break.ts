export function textBreaker(textNode: Text, lineRects: DOMRect[]) {
  const text = textNode.textContent || "";
  if (!text) return [];

  const rectCache = new Map<number, DOMRect>();
  const rectAt = (index: number) => {
    const cachedRect = rectCache.get(index);

    if (cachedRect) {
      return cachedRect;
    }

    const charRange = document.createRange();
    charRange.setStart(textNode, index);
    charRange.setEnd(textNode, index + 1);

    const rect = charRange.getBoundingClientRect();
    rectCache.set(index, rect);
    return rect;
  };

  const firstIndexOnLine = (lineRect: DOMRect) => {
    let low = 0;
    let high = text.length - 1;
    let result = text.length;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const rect = rectAt(mid);

      if (rect.bottom >= lineRect.top) {
        result = mid;
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }

    return result;
  };

  const firstIndexAfterLine = (lineRect: DOMRect, startIndex: number) => {
    let low = startIndex;
    let high = text.length - 1;
    let result = text.length;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const rect = rectAt(mid);

      if (rect.top > lineRect.bottom) {
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
