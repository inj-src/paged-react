import { textBreaker } from "./text-break.js";
import {
  getImageSource,
  hasVisibleBox,
  readBreakDirectives,
  readDimension,
  readNumberAttribute,
  readPaintStyle,
  toPageRect,
} from "./ir-style.js";
import {
  SOURCE_ID_ATTRIBUTE,
  type FragmentIR,
  type FragmentKind,
  type PaginatedDocumentIR,
  type PaintNode,
  type PaintStyle,
} from "./ir-types.js";

export function markSourceIds(root: HTMLElement): void {
  const elements = [root, ...Array.from(root.querySelectorAll("*"))];

  for (const [index, element] of elements.entries()) {
    element.setAttribute(SOURCE_ID_ATTRIBUTE, `source-${index}`);
  }
}

export function clearSourceIds(pages: HTMLElement[]): void {
  for (const page of pages) {
    page.removeAttribute(SOURCE_ID_ATTRIBUTE);
    for (const element of page.querySelectorAll(`[${SOURCE_ID_ATTRIBUTE}]`)) {
      element.removeAttribute(SOURCE_ID_ATTRIBUTE);
    }
  }
}

export function buildPaginatedDocumentIR(pages: HTMLElement[]): PaginatedDocumentIR {
  const sourceFragments = new Map<string, FragmentIR[]>();
  const pageIR: PaginatedDocumentIR["pages"] = [];

  for (const [pageIndex, page] of pages.entries()) {
    const pageRect = page.getBoundingClientRect();
    const fragments: FragmentIR[] = [];
    const paint: PaintNode[] = [];
    let fragmentIndex = 0;

    collectFragment(page, "segment", null);

    const segmentIndex = readNumberAttribute(page, "data-paged-react-segment-index");
    const segmentPageIndex = readNumberAttribute(page, "data-paged-react-body-segment-index");
    const width = readDimension(pageRect.width, page.style.width);
    const height = readDimension(pageRect.height, page.style.height);

    pageIR.push({
      index: pageIndex,
      segmentIndex,
      segmentPageIndex,
      width,
      height,
      fragments,
      paint,
    });

    function collectFragment(element: Element, kind: FragmentKind, parentId: string | null): string {
      const id = `page-${pageIndex}-fragment-${fragmentIndex}`;
      fragmentIndex += 1;

      const sourceId = getSourceId(element, id);
      const fragment: FragmentIR = {
        id,
        sourceId,
        kind,
        parentId,
        childIds: [],
        rect: toPageRect(element.getBoundingClientRect(), pageRect),
        breakDirectives: readBreakDirectives(element),
        repeated: kind === "header" || kind === "footer",
        continuationIndex: 0,
        continuationCount: 1,
      };

      fragments.push(fragment);
      let sameSource = sourceFragments.get(sourceId);
      if (sameSource === undefined) {
        sameSource = [];
        sourceFragments.set(sourceId, sameSource);
      }
      sameSource.push(fragment);

      appendElementPaint(element, id, sourceId, pageRect);

      for (const child of Array.from(element.children)) {
        const childKind = kind === "segment" ? getPageChildKind(child) : "element";
        if (childKind === null) {
          continue;
        }
        const childId = collectFragment(child, childKind, id);
        fragment.childIds.push(childId);
      }

      return id;
    }

    function appendElementPaint(
      element: Element,
      fragmentId: string,
      sourceId: string,
      rootRect: DOMRect,
    ): void {
      const style = readPaintStyle(element);
      const rect = toPageRect(element.getBoundingClientRect(), rootRect);

      if (hasVisibleBox(element, style)) {
        paint.push({ type: "box", sourceId, fragmentId, rect, style, zIndex: paint.length });
      }

      if (element.tagName.toUpperCase() === "IMG") {
        const source = getImageSource(element);
        if (source !== null) {
          paint.push({ type: "image", sourceId, fragmentId, rect, source, style, zIndex: paint.length });
        }
      }

      for (const node of Array.from(element.childNodes)) {
        if (node.nodeType !== 3) {
          continue;
        }

        appendTextPaint(node, fragmentId, sourceId, style, rootRect);
      }
    }

    function appendTextPaint(
      node: Node,
      fragmentId: string,
      sourceId: string,
      style: PaintStyle,
      rootRect: DOMRect,
    ): void {
      const textNode = node as Text;
      if (textNode.textContent === null || textNode.textContent.length === 0) {
        return;
      }

      const range = page.ownerDocument.createRange();
      range.selectNode(textNode);
      const rangeWithRects = range as Range & { getClientRects?: () => DOMRectList };
      if (typeof rangeWithRects.getClientRects !== "function") {
        return;
      }

      const rects = Array.from(rangeWithRects.getClientRects());
      if (rects.length === 0) {
        return;
      }

      const lines = textBreaker(textNode, rects);
      for (const line of lines) {
        paint.push({
          type: "text",
          sourceId,
          fragmentId,
          rect: toPageRect(line.rect, rootRect),
          text: line.text,
          sourceStart: line.start,
          sourceEnd: line.end,
          style,
          zIndex: paint.length,
        });
      }
    }
  }

  for (const fragments of sourceFragments.values()) {
    const continuationCount = fragments.length;
    for (const [continuationIndex, fragment] of fragments.entries()) {
      fragment.continuationIndex = continuationIndex;
      fragment.continuationCount = continuationCount;
    }
  }

  return { pages: pageIR };
}

function getPageChildKind(element: Element): FragmentKind | null {
  if (element.hasAttribute("data-paged-react-page-header")) {
    return "header";
  }
  if (element.hasAttribute("data-paged-react-page-body")) {
    return "body";
  }
  if (element.hasAttribute("data-paged-react-page-footer")) {
    return "footer";
  }
  return null;
}

function getSourceId(element: Element, generatedId: string): string {
  const sourceId = element.getAttribute(SOURCE_ID_ATTRIBUTE);
  if (sourceId === null) {
    return generatedId;
  }
  return sourceId;
}
