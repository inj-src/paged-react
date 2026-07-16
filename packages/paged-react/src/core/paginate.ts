import { textBreaker } from "./text-break.js";
import { canBreakElement } from "./avoid-break.js";
import { createComputedStyleCache } from "./computed-style.js";
import { waitForLayoutReady } from "./layout-ready.js";
import { connectedClone, getBoxStyle } from "./utils.js";
import { resolvePageSize } from "../utils/page-size.js";
import type { PaginateDocumentContext } from "../types.js";
import {
  cloneChildrenInto,
  createPage,
  getDirectSlot,
  getEffectivePageSize,
  resolvePageSizeInPixels,
} from "./utils.js";

const EMPTY_BY_PAGINATION_ATTRIBUTE = "data-paged-react-empty-by-pagination";

export async function paginateDocument(ctx: PaginateDocumentContext): Promise<HTMLElement[]> {
  const { sourceRoot, pagesRoot, signal, options } = ctx;
  const pages: HTMLElement[] = [];

  if (signal?.aborted) return pages;

  pagesRoot.replaceChildren();

  await waitForLayoutReady(sourceRoot);

  if (signal?.aborted) return pages;

  const sourceRootClone = connectedClone(sourceRoot);

  const segments = Array.from(
    sourceRootClone.querySelectorAll(":scope > [data-paged-react-segment-source]"),
  ) as HTMLDivElement[];

  for (const [segmentIndex, segment] of segments.entries()) {
    if (signal?.aborted) return pages;

    let segmentPageSize = getEffectivePageSize(segment);
    if (options?.pageSize) {
      segmentPageSize = resolvePageSize(options.pageSize);
      segment.dataset.pagedReactPageWidth = segmentPageSize.width;
      segment.dataset.pagedReactPageHeight = segmentPageSize.height;
      segment.style.width = segmentPageSize.width;
      segment.style.minHeight = segmentPageSize.height;
    }

    if (options?.pageMargins) {
      segment.style.setProperty("--paged-react-page-margin-top", options.pageMargins.top);
      segment.style.setProperty("--paged-react-page-margin-right", options.pageMargins.right);
      segment.style.setProperty("--paged-react-page-margin-bottom", options.pageMargins.bottom);
      segment.style.setProperty("--paged-react-page-margin-left", options.pageMargins.left);
      segment.style.boxSizing = "border-box";
      segment.style.padding =
        "var(--paged-react-page-margin-top) var(--paged-react-page-margin-right) var(--paged-react-page-margin-bottom) var(--paged-react-page-margin-left)";
    }

    const segmentPageSizePixels = resolvePageSizeInPixels(segmentPageSize, sourceRoot.ownerDocument);

    const headerSlot = getDirectSlot(segment, "header");
    const bodySlot = getDirectSlot(segment, "body");
    const footerSlot = getDirectSlot(segment, "footer");

    const headerHeight = headerSlot?.offsetHeight ?? 0;
    const footerHeight = footerSlot?.offsetHeight ?? 0;

    const segBox = getBoxStyle(segment);
    const segmentHeightOffset =
      segBox.paddingTop + segBox.paddingBottom + segBox.borderBottomWidth + segBox.borderTopWidth;

    const maxBodyHeight = segmentPageSizePixels.height - headerHeight - footerHeight - segmentHeightOffset;

    if (maxBodyHeight <= 0) {
      console.warn(
        `Page size ${segmentPageSize.width} x ${segmentPageSize.height} is too small to fit header and footer content.`,
      );
      continue;
    }

    const repeatTableHeader = segment.getAttribute("data-paged-react-repeat-table-header") === "true";

    console.time(`Segment ${segmentIndex + 1} pagination`);

    const bodyPayload = {
      body: bodySlot,
      maxBodyHeight,
      repeatTableHeader,
      signal,
    };

    let bodyIndex = 0;
    for await (const bodySegment of bodySegmenter(bodyPayload)) {
      if (signal?.aborted) {
        console.timeEnd(`Segment ${segmentIndex + 1} pagination`);
        return pages;
      }

      const page = createPage({
        segment,
        pagesRoot,
        pageSize: segmentPageSize,
        bodySlot,
        headerSlot,
        footerSlot,
        pageNumber: segmentIndex + 1,
      });

      page.page.setAttribute("data-paged-react-segment-index", String(segmentIndex));
      page.page.setAttribute("data-paged-react-body-segment-index", String(bodyIndex));

      cloneChildrenInto(page.header, headerSlot);
      cloneChildrenInto(page.footer, footerSlot);
      cloneChildrenInto(page.body, bodySegment);
      pages.push(page.page);

      bodyIndex += 1;
    }
    console.timeEnd(`Segment ${segmentIndex + 1} pagination`);
  }

  sourceRootClone.remove();
  return pages;
}

async function* bodySegmenter(ctx: {
  body: HTMLElement | null;
  maxBodyHeight: number;
  repeatTableHeader: boolean;
  signal?: AbortSignal;
}): AsyncGenerator<HTMLElement> {
  const { body, maxBodyHeight, repeatTableHeader, signal } = ctx;

  if (!body) return;

  const view = body.ownerDocument.defaultView;
  if (!view) return;
  const ownerWindow: Window & typeof globalThis = view;

  const styleCache = createComputedStyleCache();
  const pageBreaks = Array.from(body.querySelectorAll("[data-paged-react-page-break]"));

  while (true) {
    if (signal?.aborted) return;

    const bodyRect = body.getBoundingClientRect();
    const bodyHeight = bodyRect.height;
    const hasPageBreak = pageBreaks.some((pageBreak) => body.contains(pageBreak));

    if (bodyHeight <= maxBodyHeight && !hasPageBreak) {
      yield body;
      return;
    }

    const mutations: Array<() => void> = [];
    const pageSlice = bodySlice({ body, bodyRect, mutations });
    yield pageSlice.segment;

    if (!mutations.length) {
      return;
    }

    for (const mutation of mutations) {
      mutation();
    }

    await new Promise<void>((resolve) => setTimeout(resolve));
    if (signal?.aborted) return;
  }

  function bodySlice(ctx: {
    body: HTMLElement;
    bodyRect: DOMRect;
    mutations: Array<() => void>;
    parent?: HTMLElement;
    superParentOffset?: number;
  }): { segment: HTMLElement; stopped: boolean } {
    const { body, bodyRect, mutations, parent = body, superParentOffset = 0 } = ctx;
    const segment = parent.cloneNode(false) as HTMLElement;
    const parentStyle = styleCache.get(parent);
    const parentOffset = parentStyle.paddingBottom + parentStyle.borderBottomWidth + parentStyle.marginBottom;

    for (const target of Array.from(parent.childNodes)) {
      if (target instanceof ownerWindow.Element) {
        if (target.hasAttribute("data-paged-react-page-break")) {
          mutations.push(() => target.remove());
          return { segment, stopped: true };
        }

        const targetRect = target.getBoundingClientRect();
        const targetStyle = styleCache.get(target);

        const targetBottom =
          targetRect.bottom +
          targetStyle.marginBottom +
          superParentOffset +
          // We need to consider the parent offset
          parentOffset -
          // to get the relative position
          bodyRect.top;

        const isEmptyShell =
          target.children.length === 0 && target.textContent !== null && target.textContent.trim() === "";

        if (isEmptyShell) {
          const targetContentHeight =
            targetRect.height -
            targetStyle.paddingTop -
            targetStyle.paddingBottom -
            targetStyle.borderTopWidth -
            targetStyle.borderBottomWidth;

          if (target.hasAttribute(EMPTY_BY_PAGINATION_ATTRIBUTE) && targetContentHeight <= 0) {
            mutations.push(() => target.remove());
            continue;
          }

          segment.appendChild(target.cloneNode(true));
          if (targetBottom <= maxBodyHeight) {
            mutations.push(() => target.remove());
          }

          continue;
        }

        const canBreakTarget = canBreakElement(target);
        const hasNestedPageBreak = pageBreaks.some((pageBreak) => target.contains(pageBreak));

        if (targetBottom <= maxBodyHeight && !hasNestedPageBreak) {
          // Keep pagination-created empty shells that still have box height.
          segment.appendChild(target.cloneNode(true));

          // Keep table headers on the current page.
          if (parent instanceof ownerWindow.HTMLTableElement && target.tagName === "THEAD") continue;

          // Keep the first body row when repeating table headers.
          if (
            repeatTableHeader &&
            parent instanceof ownerWindow.HTMLTableSectionElement &&
            parent.parentElement instanceof ownerWindow.HTMLTableElement &&
            !parent.parentElement.tHead &&
            target === parent.rows[0]
          ) {
            continue;
          }

          mutations.push(() => {
            // Remove the source node after cloning it into the page.
            cleanupPaginationTarget(target, parent, repeatTableHeader);
          });
        } else if (canBreakTarget) {
          const childSegment = bodySlice({
            body,
            bodyRect,
            mutations,
            parent: target as HTMLElement,
            superParentOffset: parentOffset + superParentOffset,
          });
          if (childSegment.segment.childNodes.length) segment.appendChild(childSegment.segment);
          if (childSegment.stopped) return { segment, stopped: true };
        } else {
          if (segment.childNodes.length) return { segment, stopped: true };

          const targetRequiredPageHeight =
            targetRect.height + Math.max(0, targetStyle.marginTop) + Math.max(0, targetStyle.marginBottom);

          if (targetRequiredPageHeight <= maxBodyHeight && mutations.length > 0) {
            return { segment, stopped: true };
          }

          console.error("Paged React: unbreakable element exceeds one page and will be clipped.", target);

          segment.appendChild(target.cloneNode(true));
          mutations.push(() => target.remove());
        }
      }

      if (target instanceof ownerWindow.Text) {
        const textRange = body.ownerDocument.createRange();
        textRange.selectNode(target);
        const textRects = Array.from(textRange.getClientRects());

        // Remove text nodes that no longer render any line boxes.
        if (!textRects.length) {
          mutations.push(() => target.remove());
          continue;
        }

        let textTop = Infinity;
        let textBottom = -Infinity;

        for (const rect of textRects) {
          const rectTop = rect.top + parentOffset + superParentOffset - bodyRect.top;
          const rectBottom = rect.bottom + parentOffset + superParentOffset - bodyRect.top;

          if (rectTop < textTop) textTop = rectTop;

          if (rectBottom > textBottom) textBottom = rectBottom;
        }

        // Keep text that fully fits on the current page.
        if (textBottom <= maxBodyHeight) {
          segment.append(target.data);
          mutations.push(() => target.remove());
          continue;
        }

        // Leave text alone if it starts below the current page window.
        if (textTop > maxBodyHeight) continue;

        // Split text across the page boundary line by line.
        const lines = textBreaker(target, textRects);
        const remaining = body.ownerDocument.createDocumentFragment();

        for (const line of lines) {
          const lineBottom = line.rect.bottom + parentOffset + superParentOffset - bodyRect.top;

          if (lineBottom <= maxBodyHeight) {
            segment.append(line.text);
          } else {
            remaining.append(line.text);
          }
        }

        mutations.push(() => target.replaceWith(remaining));
      }
    }

    return { segment, stopped: false };
  }

  function cleanupPaginationTarget(target: Element, parent: HTMLElement, repeatTableHeader: boolean) {
    if (target.tagName === "LI" && parent instanceof ownerWindow.HTMLOListElement) {
      if (parent.reversed) parent.start -= 1;
      else parent.start += 1;
    }

    target.remove();

    if (parent.children.length === 0 && parent.textContent !== null && parent.textContent.trim() === "") {
      parent.setAttribute(EMPTY_BY_PAGINATION_ATTRIBUTE, "");
    }

    if (parent instanceof ownerWindow.HTMLTableSectionElement) {
      const table = parent.parentElement;
      if (parent.rows.length === 0) parent.remove();
      if (
        repeatTableHeader &&
        table instanceof ownerWindow.HTMLTableElement &&
        !table.tHead &&
        parent.rows.length === 1
      ) {
        parent.remove();
      }
      if (table instanceof ownerWindow.HTMLTableElement && !table.tBodies.length) table.remove();
    }
  }
}
