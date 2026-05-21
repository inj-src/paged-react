import { textBreaker } from "./text-break.js";
import { canBreakElement } from "./avoid-break.js";
import { createComputedStyleCache } from "./computed-style.js";
import { connectedClone } from "./utils.js";
import {
  cloneChildrenInto,
  createPage,
  getDirectSlot,
  getEffectivePageSize,
  resolvePageSizeInPixels,
} from "./utils.js";

type PaginationContext = {
  sourceRoot: HTMLDivElement;
  pagesRoot: HTMLDivElement;
  signal?: AbortSignal;
};

export async function paginateDocument(ctx: PaginationContext): Promise<void> {
  const { sourceRoot, pagesRoot, signal } = ctx;

  if (signal?.aborted) {
    return;
  }

  const sourceRootClone = connectedClone(sourceRoot);

  pagesRoot.textContent = "";

  const segments = Array.from(
    sourceRootClone.querySelectorAll(":scope > [data-paged-react-segment]"),
  ) as HTMLDivElement[];

  for (const [segmentIndex, segment] of segments.entries()) {
    if (signal?.aborted) {
      return;
    }

    const segmentPageSize = getEffectivePageSize(segment);
    const segmentPageSizePixels = resolvePageSizeInPixels(segmentPageSize);

    const headerSlot = getDirectSlot(segment, "header");
    const bodySlot = getDirectSlot(segment, "body");
    const footerSlot = getDirectSlot(segment, "footer");

    let headerHeight = 0;
    let footerHeight = 0;

    if (headerSlot) {
      headerHeight = headerSlot.offsetHeight;
    }

    if (footerSlot) {
      footerHeight = footerSlot.offsetHeight;
    }

    const computedSegmentStyle = getComputedStyle(segment);
    const segmentPaddingTop = parseFloat(computedSegmentStyle.paddingTop) || 0;
    const segmentPaddingBottom = parseFloat(computedSegmentStyle.paddingBottom) || 0;
    const segmentBorderBottom = parseFloat(computedSegmentStyle.borderBottomWidth) || 0;
    const segmentBorderTop = parseFloat(computedSegmentStyle.borderTopWidth) || 0;

    const maxBodyHeight =
      segmentPageSizePixels.height -
      headerHeight -
      footerHeight -
      segmentPaddingTop -
      segmentPaddingBottom -
      segmentBorderBottom -
      segmentBorderTop;

    if (maxBodyHeight <= 0) {
      console.warn(
        `Page size ${segmentPageSize.width} x ${segmentPageSize.height} is too small to fit header and footer content.`,
      );
      continue;
    }

    console.time(`Segment ${segmentIndex + 1} pagination`);
    const bodies = bodySegmenter(bodySlot, maxBodyHeight);
    console.timeEnd(`Segment ${segmentIndex + 1} pagination`);

    for (const [bodyIndex, bodySegment] of bodies.entries()) {
      if (signal?.aborted) {
        return;
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
    }
  }
}

function bodySegmenter(
  body: HTMLElement | null,
  maxBodyHeight: number,
  bodySegments: HTMLElement[] = [],
) {
  if (!body) return bodySegments;

  const styleCache = createComputedStyleCache();

  while (true) {
    const bodyRect = body.getBoundingClientRect();
    const bodyHeight = bodyRect.height;
    const hasPageBreak = body.querySelector("[data-paged-react-page-break]") !== null;

    if (bodyHeight <= maxBodyHeight && !hasPageBreak) {
      bodySegments.push(body);
      return bodySegments;
    }

    const mutations: Array<() => void> = [];
    const pageSlice = bodySlice(body, bodyRect, mutations);
    bodySegments.push(pageSlice.segment);

    if (!mutations.length) {
      return bodySegments;
    }

    for (const mutation of mutations) {
      mutation();
    }
  }

  function bodySlice(
    parent: HTMLElement,
    bodyRect: DOMRect,
    mutations: Array<() => void>,
    superParentOffset = 0,
  ): { segment: HTMLElement; stopped: boolean } {
    const segment = parent.cloneNode(false) as HTMLElement;
    const parentStyle = styleCache.get(parent);
    const parentOffset =
      parentStyle.paddingBottom + parentStyle.borderBottomWidth + parentStyle.marginBottom;

    for (const target of Array.from(parent.childNodes)) {
      if (target instanceof Element) {
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

        const hasNestedPageBreak = target.querySelector("[data-paged-react-page-break]") !== null;
        const canBreakTarget = canBreakElement(target);

        if (targetBottom <= maxBodyHeight && !hasNestedPageBreak) {
          segment.appendChild(target.cloneNode(true));
          mutations.push(() => {
            // If the target is a list item, we need to adjust the list numbering in the original list
            if (target.tagName === "LI" && parent instanceof HTMLOListElement) {
              if (parent.reversed) {
                parent.start -= 1;
              } else {
                parent.start += 1;
              }
            }

            target.remove();
          });
        } else if (canBreakTarget) {
          const childSegment = bodySlice(
            target as HTMLElement,
            bodyRect,
            mutations,
            parentOffset + superParentOffset,
          );
          if (childSegment.segment.childNodes.length) {
            segment.appendChild(childSegment.segment);
          }
          if (childSegment.stopped) {
            return { segment, stopped: true };
          }
        } else {
          if (segment.childNodes.length) {
            return { segment, stopped: true };
          }

          segment.appendChild(target.cloneNode(true));
          mutations.push(() => target.remove());
        }
      }

      if (target instanceof Text) {
        const textRange = document.createRange();
        textRange.selectNode(target);
        const textRects = Array.from(textRange.getClientRects());

        if (!textRects.length) {
          mutations.push(() => target.remove());
          continue;
        }

        let textTop = Infinity;
        let textBottom = -Infinity;

        for (const rect of textRects) {
          const rectTop = rect.top + parentOffset + superParentOffset - bodyRect.top;
          const rectBottom = rect.bottom + parentOffset + superParentOffset - bodyRect.top;

          if (rectTop < textTop) {
            textTop = rectTop;
          }

          if (rectBottom > textBottom) {
            textBottom = rectBottom;
          }
        }

        if (textBottom <= maxBodyHeight) {
          segment.append(target.data);
          mutations.push(() => target.remove());
          continue;
        }

        if (textTop > maxBodyHeight) {
          continue;
        }

        const lines = textBreaker(target, textRects);
        const remaining = document.createDocumentFragment();

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
}
