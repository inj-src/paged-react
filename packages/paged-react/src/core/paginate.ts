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

  pagesRoot.textContent = "";

  const segments = Array.from(
    sourceRoot.querySelectorAll(":scope > [data-paged-react-segment]"),
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

    const maxBodyHeight =
      segmentPageSizePixels.height - headerHeight - footerHeight;

    if (maxBodyHeight <= 0) {
      console.warn(
        `Page size ${segmentPageSize.width} x ${segmentPageSize.height} is too small to fit header and footer content.`,
      );
      continue;
    }

    let bodyHeight = 0;

    if (bodySlot) {
      bodyHeight = bodySlot.offsetHeight;
    }

    if (maxBodyHeight >= bodyHeight) {
      const page = createPage({
        segment,
        pagesRoot,
        pageSize: segmentPageSize,
        bodySlot,
        headerSlot,
        footerSlot,
        pageNumber: segmentIndex + 1,
      });
      page.page.setAttribute(
        "data-paged-react-segment-index",
        String(segmentIndex),
      );

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

      const page = createPage({
        segment,
        pagesRoot,
        pageSize: segmentPageSize,
        bodySlot,
        headerSlot,
        footerSlot,
        pageNumber: segmentIndex + 1,
      });

      page.page.setAttribute(
        "data-paged-react-segment-index",
        String(segmentIndex),
      );
      page.page.setAttribute(
        "data-paged-react-body-segment-index",
        String(bodyIndex),
      );

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
  const bodyHeight = bodyRect.height;

  if (bodyHeight <= maxBodyHeight) {
    bodySegments.push(body.cloneNode(true) as HTMLElement);
    return bodySegments;
  }

  function clonePageSlice(
    parent: HTMLElement,
    startOffset: number,
    endOffset: number,
  ): HTMLElement | null {
    const segment = parent.cloneNode(false) as HTMLElement;

    for (const target of parent.childNodes) {
      if (target instanceof HTMLElement) {
        const targetRect = target.getBoundingClientRect();
        const targetTop = targetRect.top - bodyRect.top;
        const targetBottom = targetRect.bottom - bodyRect.top;

        if (targetBottom <= startOffset) {
          continue;
        }

        if (targetTop >= endOffset) {
          break;
        }

        if (targetTop >= startOffset && targetBottom <= endOffset) {
          segment.appendChild(target.cloneNode(true));
          continue;
        }

        if (target.children.length === 0) {
          segment.appendChild(target.cloneNode(true));
          continue;
        }

        const childSegment = clonePageSlice(target, startOffset, endOffset);

        if (childSegment?.childNodes.length) {
          segment.appendChild(childSegment);
          continue;
        }

        segment.appendChild(target.cloneNode(false));
        continue;
      }

      if (target instanceof Text && target.textContent?.trim()) {
        console.warn(
          `Text node splitting is not implemented yet. Node content: "${target.textContent}"`,
        );
        break;
      }
    }

    if (segment.childNodes.length) {
      return segment;
    }

    return null;
  }

  for (
    let startOffset = 0;
    startOffset < bodyHeight;
    startOffset += maxBodyHeight
  ) {
    const segment = clonePageSlice(
      body,
      startOffset,
      startOffset + maxBodyHeight,
    );

    if (segment) {
      bodySegments.push(segment);
    }
  }

  return bodySegments;
}
