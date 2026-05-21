export function textBreaker(textNode: Text, parentOffset: number, bodyRect: DOMRect) {
  const text = textNode.textContent || "";
  if (!text) return [];

  const nodeRange = document.createRange();
  nodeRange.selectNode(textNode);
  const lineRects = Array.from(nodeRange.getClientRects());

  // 1. Calculate character positions exactly ONCE (O(N) instead of O(N*M))
  const charData: Array<{ char: string; rect: DOMRect }> = [];
  for (let i = 0; i < text.length; i++) {
    const charRange = document.createRange();
    charRange.setStart(textNode, i);
    charRange.setEnd(textNode, i + 1);
    charData.push({
      char: text[i]!,
      rect: charRange.getBoundingClientRect(),
    });
  }

  // 2. Map the characters to the pre-calculated lines
  return lineRects.map((lineRect) => {
    let textSplice = "";

    for (const { char, rect } of charData) {
      // Use a 2px tolerance for subpixel rendering discrepancies
      if (Math.abs(rect.top - lineRect.top) < 2) {
        textSplice += char;
      }
    }

    return {
      rect: lineRect,
      text: textSplice,
    };
  });
}
