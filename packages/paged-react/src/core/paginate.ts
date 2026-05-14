import { resolvePageSize } from "../utils/page-size.js";

import {
  cloneChildrenInto,
  createPage,
  getDirectSlot,
  getEffectivePageSize,
  resolvePageSizeInPixels,
} from "./utils.js";
import type { PageSize } from "../types.js";

type PaginationContext = {
  sourceRoot: HTMLElement;
  pagesRoot: HTMLElement;
  pageSize?: PageSize;
  signal?: AbortSignal;
};

export async function paginateDocument(ctx: PaginationContext): Promise<void> {
  const { sourceRoot, pagesRoot, pageSize, signal } = ctx;

  if (signal?.aborted) {
    return;
  }

  pagesRoot.textContent = "";

  const documentPageSize = resolvePageSize(pageSize) ?? { width: "210mm", height: "297mm" };
  const segments = Array.from(
    sourceRoot.querySelectorAll(":scope > [data-paged-react-segment]"),
  ) as HTMLElement[];

  for (const [segmentIndex, segment] of segments.entries()) {
    if (signal?.aborted) {
      return;
    }

    const segmentPageSize = getEffectivePageSize(segment, documentPageSize);
    const segmentPageSizePixels = resolvePageSizeInPixels(segmentPageSize);

    const headerSlot = getDirectSlot(segment, "header");
    const bodySlot = getDirectSlot(segment, "body");
    const footerSlot = getDirectSlot(segment, "footer");

    const headerHeight = headerSlot ? headerSlot.offsetHeight : 0;
    const footerHeight = footerSlot ? footerSlot.offsetHeight : 0;

    const maxBodyHeight = segmentPageSizePixels.height - headerHeight - footerHeight;

    if (maxBodyHeight <= 0) {
      console.warn(
        `Page size ${segmentPageSize.width} x ${segmentPageSize.height} is too small to fit header and footer content.`,
      );
      continue;
    }

    if (maxBodyHeight >= (bodySlot?.offsetHeight ?? 0)) {
      const page = createPage(pagesRoot, segmentPageSize, segmentIndex + 1);
      page.page.setAttribute("data-paged-react-segment-index", String(segmentIndex));

      cloneChildrenInto(page.header, headerSlot);
      cloneChildrenInto(page.footer, footerSlot);

      cloneChildrenInto(page.body, bodySlot);
      continue;
    }

    const bodies = bodySegmenter(bodySlot, maxBodyHeight);

    for (const [bodyIndex, bodySegment] of bodies.entries()) {
      if (signal?.aborted) {
        return;
      }

      const page = createPage(pagesRoot, segmentPageSize, segmentIndex + 1);
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

  const bodyRect = body.getBoundingClientRect();

  if (bodyRect.height <= maxBodyHeight) {
    bodySegments.push(body);
    return bodySegments;
  }

  function splitElement(childList: NodeList, parent: HTMLElement) {
    const segment = parent.cloneNode(false) as HTMLElement;

    for (const target of childList) {
      if (target instanceof HTMLElement) {
        const needsSplit = needsSplitting(target, maxBodyHeight, bodyRect, bodySegments.length + 1);

        if (needsSplit) {
          return splitElement(target.childNodes, target);
        }

        segment.appendChild(target);
      }
      if (target instanceof Text) {
        // TODO: Implement text splitting logic here
        console.warn(
          `Text node splitting is not implemented yet. Node content: "${target.textContent}"`,
        );
      }
    }

    return segment;
  }

  const segment = splitElement(body.childNodes, body);
  bodySegments.push(segment);

  return bodySegmenter(body, maxBodyHeight, bodySegments);
}

function needsSplitting(
  element: HTMLElement,
  maxHeight: number,
  bodyRect: DOMRect,
  bodySegmentNo: number,
): boolean {
  const elementRect = element.getBoundingClientRect();
  const cumulativeHeight = elementRect.bottom - bodyRect.top;

  if (cumulativeHeight > maxHeight) {
    console.log(`Element ${element.tagName} at segment ${bodySegmentNo} exceeds max body height.`);
    return true;
  }

  return false;
}
