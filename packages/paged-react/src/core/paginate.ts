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
  const scale = options?.scale ?? 1;

  if (!Number.isFinite(scale) || scale < 0.1 || scale > 2) {
    throw new Error("Paged React scale must be between 0.1 and 2.");
  }

  if (signal?.aborted) return pages;

  pagesRoot.style.setProperty("--paged-react-total-pages", "0");
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

    const segmentPageSizePixels = resolvePageSizeInPixels(
      segmentPageSize,
      sourceRoot.ownerDocument,
    );
    let contentPageSize = segmentPageSize;
    let contentPageSizePixels = segmentPageSizePixels;

    if (scale !== 1) {
      const view = sourceRoot.ownerDocument.defaultView;
      if (!view) {
        throw new Error("Paged React requires a document with an active window.");
      }
      const style = view.getComputedStyle(segment);
      const marginTop = style.getPropertyValue("--paged-react-page-margin-top").trim();
      const marginRight = style.getPropertyValue("--paged-react-page-margin-right").trim();
      const marginBottom = style.getPropertyValue("--paged-react-page-margin-bottom").trim();
      const marginLeft = style.getPropertyValue("--paged-react-page-margin-left").trim();

      if (marginTop) {
        segment.style.setProperty("--paged-react-page-margin-top", `calc(${marginTop} / ${scale})`);
      }
      if (marginRight) {
        segment.style.setProperty("--paged-react-page-margin-right", `calc(${marginRight} / ${scale})`);
      }
      if (marginBottom) {
        segment.style.setProperty("--paged-react-page-margin-bottom", `calc(${marginBottom} / ${scale})`);
      }
      if (marginLeft) {
        segment.style.setProperty("--paged-react-page-margin-left", `calc(${marginLeft} / ${scale})`);
      }

      contentPageSize = {
        width: `${segmentPageSizePixels.width / scale}px`,
        height: `${segmentPageSizePixels.height / scale}px`,
      };
      contentPageSizePixels = {
        width: segmentPageSizePixels.width / scale,
        height: segmentPageSizePixels.height / scale,
      };
      segment.style.minHeight = contentPageSize.height;
      segment.style.width = contentPageSize.width;
    }

    const headerSlot = getDirectSlot(segment, "header");
    const bodySlot = getDirectSlot(segment, "body");
    const footerSlot = getDirectSlot(segment, "footer");
    const watermarks = Array.from(segment.children).filter((child) => {
      return child.hasAttribute("data-paged-react-watermark-source");
    });

    const headerHeight = headerSlot?.offsetHeight ?? 0;
    const footerHeight = footerSlot?.offsetHeight ?? 0;

    const segBox = getBoxStyle(segment);
    const segmentHeightOffset =
      segBox.paddingTop + segBox.paddingBottom + segBox.borderBottomWidth + segBox.borderTopWidth;

    const calculatedMaxBodyHeight =
      contentPageSizePixels.height - headerHeight - footerHeight - segmentHeightOffset;

    if (calculatedMaxBodyHeight <= 0) {
      console.warn(
        `Page size ${segmentPageSize.width} x ${segmentPageSize.height} is too small to fit header and footer content.`,
      );
      continue;
    }

    const repeatTableHeader =
      segment.getAttribute("data-paged-react-repeat-table-header") === "true";
    const measurementPage = createPage({
      segment,
      pagesRoot,
      pageSize: segmentPageSize,
      contentPageSize,
      scale,
      bodySlot,
      headerSlot,
      footerSlot,
      pageNumber: segmentIndex + 1,
    });
    measurementPage.page.style.left = "-100000px";
    measurementPage.page.style.position = "absolute";
    measurementPage.page.style.top = "0";
    measurementPage.page.style.visibility = "hidden";
    if (scale !== 1) {
      measurementPage.content.style.setProperty("scale", "1");
    }
    cloneChildrenInto(measurementPage.header, headerSlot);
    cloneChildrenInto(measurementPage.footer, footerSlot);

    let maxBodyHeight = measurementPage.body.getBoundingClientRect().height;
    let measurementBody: HTMLElement | null = measurementPage.body;
    if (maxBodyHeight <= 0) {
      maxBodyHeight = calculatedMaxBodyHeight;
      measurementPage.page.remove();
      measurementBody = null;
    }

    console.time(`Segment ${segmentIndex + 1} pagination`);

    const bodyPayload = {
      body: bodySlot,
      maxBodyHeight,
      measurementBody,
      repeatTableHeader,
      signal,
    };

    let bodyIndex = 0;
    for await (const bodySegment of bodySegmenter(bodyPayload)) {
      if (signal?.aborted) {
        measurementPage.page.remove();
        console.timeEnd(`Segment ${segmentIndex + 1} pagination`);
        return pages;
      }

      const page = createPage({
        segment,
        pagesRoot,
        pageSize: segmentPageSize,
        contentPageSize,
        scale,
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
      for (const watermark of watermarks) {
        page.page.appendChild(watermark.cloneNode(true));
      }
      pages.push(page.page);

      bodyIndex += 1;
    }
    measurementPage.page.remove();
    console.timeEnd(`Segment ${segmentIndex + 1} pagination`);
  }

  sourceRootClone.remove();
  pagesRoot.style.setProperty("--paged-react-total-pages", String(pages.length));
  return pages;
}

async function* bodySegmenter(ctx: {
  body: HTMLElement | null;
  maxBodyHeight: number;
  measurementBody: HTMLElement | null;
  repeatTableHeader: boolean;
  signal?: AbortSignal;
}): AsyncGenerator<HTMLElement> {
  const { body, maxBodyHeight, measurementBody, repeatTableHeader, signal } = ctx;

  if (!body) return;

  const view = body.ownerDocument.defaultView;
  if (!view) return;
  const ownerWindow: Window & typeof globalThis = view;

  const styleCache = createComputedStyleCache();
  const pageBreaks = Array.from(body.querySelectorAll("[data-paged-react-page-break]"));
  let sliceMaxBodyHeight = maxBodyHeight;

  while (true) {
    if (signal?.aborted) return;
    sliceMaxBodyHeight = maxBodyHeight;

    const bodyRect = body.getBoundingClientRect();
    const bodyHeight = bodyRect.height;
    const hasPageBreak = pageBreaks.some((pageBreak) => body.contains(pageBreak));

    if (bodyHeight <= maxBodyHeight && !hasPageBreak) {
      if (measurementBody) {
        cloneChildrenInto(measurementBody, body);
        const bodyFits = measurementBody.scrollHeight <= measurementBody.clientHeight;
        measurementBody.replaceChildren();
        if (bodyFits) {
          yield body;
          return;
        }
      } else {
        yield body;
        return;
      }
    }

    let mutations: Array<() => void>;
    let pageSlice: HTMLElement;

    while (true) {
      const candidateMutations: Array<() => void> = [];
      const candidate = bodySlice({ body, bodyRect, mutations: candidateMutations });

      if (!measurementBody) {
        mutations = candidateMutations;
        pageSlice = candidate.segment;
        break;
      }

      measurementBody.replaceChildren(candidate.segment);
      const overflow = measurementBody.scrollHeight - measurementBody.clientHeight;
      candidate.segment.remove();

      mutations = candidateMutations;
      pageSlice = candidate.segment;

      if (overflow <= 0 || !mutations.length) {
        break;
      }

      let correction = Math.ceil(overflow);
      if (correction < 1) correction = 1;
      sliceMaxBodyHeight -= correction;
      if (sliceMaxBodyHeight <= 0) break;
    }

    yield pageSlice;

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
  }): { consumed: boolean; segment: HTMLElement; stopped: boolean } {
    const { body, bodyRect, mutations, parent = body, superParentOffset = 0 } = ctx;
    const segment = parent.cloneNode(false) as HTMLElement;
    let consumed = false;
    let stopped = false;
    const parentStyle = styleCache.get(parent);
    const parentOffset =
      parentStyle.paddingBottom + parentStyle.borderBottomWidth + parentStyle.marginBottom;

    for (const target of Array.from(parent.childNodes)) {
      if (target instanceof ownerWindow.Element) {
        if (target.hasAttribute("data-paged-react-page-break")) {
          mutations.push(() => target.remove());
          return { consumed, segment, stopped: true };
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
          target.children.length === 0 &&
          target.textContent !== null &&
          target.textContent.trim() === "";

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
          if (targetBottom <= sliceMaxBodyHeight) {
            mutations.push(() => target.remove());
            consumed = true;
          }

          continue;
        }

        const canBreakTarget = canBreakElement(target);
        const hasNestedPageBreak = pageBreaks.some((pageBreak) => target.contains(pageBreak));

        if (
          targetBottom <= sliceMaxBodyHeight &&
          !hasNestedPageBreak &&
          targetStyle.display !== "contents"
        ) {
          // Keep pagination-created empty shells that still have box height.
          segment.appendChild(target.cloneNode(true));

          // Keep table headers on the current page.
          if (parent instanceof ownerWindow.HTMLTableElement && target.tagName === "THEAD")
            continue;

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
          consumed = true;
        } else if (canBreakTarget) {
          const childSegment = bodySlice({
            body,
            bodyRect,
            mutations,
            parent: target as HTMLElement,
            superParentOffset: parentOffset + superParentOffset,
          });
          if (childSegment.segment.childNodes.length && childSegment.consumed) {
            segment.appendChild(childSegment.segment);
            consumed = true;
          }
          if (childSegment.stopped) {
            if (
              (parentStyle.display === "flex" || parentStyle.display === "inline-flex") &&
              parentStyle.flexDirection !== "column" &&
              parentStyle.flexDirection !== "column-reverse"
            ) {
              stopped = true;
              continue;
            }
            return { consumed, segment, stopped: true };
          }
        } else {
          if (consumed) return { consumed, segment, stopped: true };

          const targetRequiredPageHeight =
            targetRect.height +
            Math.max(0, targetStyle.marginTop) +
            Math.max(0, targetStyle.marginBottom);

          if (targetRequiredPageHeight <= maxBodyHeight && mutations.length > 0) {
            return { consumed, segment, stopped: true };
          }

          console.error(
            "Paged React: unbreakable element exceeds one page and will be clipped.",
            target,
          );

          segment.appendChild(target.cloneNode(true));
          mutations.push(() => target.remove());
          consumed = true;
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
        if (textBottom <= sliceMaxBodyHeight) {
          segment.append(target.data);
          mutations.push(() => target.remove());
          consumed = true;
          continue;
        }

        // Leave text alone if it starts below the current page window.
        if (textTop > sliceMaxBodyHeight) continue;

        // Split text across the page boundary line by line.
        const lines = textBreaker(target, textRects);
        const remaining = body.ownerDocument.createDocumentFragment();

        for (const line of lines) {
          const lineBottom = line.rect.bottom + parentOffset + superParentOffset - bodyRect.top;

          if (lineBottom <= sliceMaxBodyHeight) {
            segment.append(line.text);
            consumed = true;
          } else {
            remaining.append(line.text);
          }
        }

        mutations.push(() => target.replaceWith(remaining));
      }
    }

    return { consumed, segment, stopped };
  }

  function cleanupPaginationTarget(
    target: Element,
    parent: HTMLElement,
    repeatTableHeader: boolean,
  ) {
    if (target.tagName === "LI" && parent instanceof ownerWindow.HTMLOListElement) {
      if (parent.reversed) parent.start -= 1;
      else parent.start += 1;
    }

    target.remove();

    if (
      parent.children.length === 0 &&
      parent.textContent !== null &&
      parent.textContent.trim() === ""
    ) {
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
