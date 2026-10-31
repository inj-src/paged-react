import { lineStartOffset } from "./text-break.js";
import { canBreakElement, isMonolithic } from "./avoid-break.js";
import { inlineLineBoxes, lineCount, groupLineBoxes } from "./line-boxes.js";
import { createComputedStyleCache } from "./computed-style.js";
import { waitForLayoutReady } from "./layout-ready.js";
import { measureRange } from "./measure-range.js";
import { createTableWindows } from "./table-window.js";
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
// Parent displays whose in-flow children are laid out top to bottom in source order.
const ORDERED_FLOW_DISPLAYS = new Set(["block", "flow-root", "list-item", "table-row-group"]);

const PAGE_NUMBER_SELECTOR = "[data-paged-react-page-number], [data-paged-react-total-pages], [data-paged-react-target-page]";

export async function paginateDocument(ctx: PaginateDocumentContext): Promise<HTMLElement[]> {
  const pages = await paginateSegments(ctx, new Map());
  const targetPages = fillPageNumbers(pages);

  // A filled-in target page number can be wider than its placeholder and rewrap its line, e.g. in
  // a table of contents. If that overflows a page, paginate once more with the numbers in place.
  const overflowing = pages.some((page) => {
    const body = page.querySelector("[data-paged-react-page-body]");
    return body !== null && body.querySelector("[data-paged-react-target-page]") !== null && body.scrollHeight > body.clientHeight;
  });
  if (!overflowing || ctx.signal?.aborted) return pages;

  const repaginated = await paginateSegments(ctx, targetPages);
  fillPageNumbers(repaginated);
  return repaginated;
}

/**
 * Writes the page numbers into PageNumber, TotalPages and TargetPageNumber spans, once, after
 * pagination. Returns each target's page, keyed by the span's href.
 */
function fillPageNumbers(pages: HTMLElement[]) {
  const pageOfId = new Map<string, number>();
  for (const [index, page] of pages.entries()) {
    for (const element of Array.from(page.querySelectorAll("[id]"))) {
      if (!pageOfId.has(element.id)) pageOfId.set(element.id, index + 1);
    }
    for (const span of Array.from(page.querySelectorAll("[data-paged-react-page-number]"))) {
      span.textContent = String(index + 1);
    }
    for (const span of Array.from(page.querySelectorAll("[data-paged-react-total-pages]"))) {
      span.textContent = String(pages.length);
    }
  }

  const targetPages = new Map<string, string>();
  for (const page of pages) {
    for (const span of Array.from(page.querySelectorAll("[data-paged-react-target-page]"))) {
      const href = span.getAttribute("data-paged-react-target-page");
      if (href === null || !href.startsWith("#")) continue;
      const target = pageOfId.get(decodeURIComponent(href.slice(1)));
      if (target === undefined) continue;
      span.textContent = String(target);
      targetPages.set(href, String(target));
    }
  }
  return targetPages;
}

async function paginateSegments(
  ctx: PaginateDocumentContext,
  targetPages: Map<string, string>,
): Promise<HTMLElement[]> {
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

  // Page numbers are written after pagination; measure with a digit in place (or a target page
  // already known from a previous pass) so headers, footers and contents lines keep their size.
  for (const span of Array.from(sourceRootClone.querySelectorAll(PAGE_NUMBER_SELECTOR))) {
    span.textContent = "0";
    const href = span.getAttribute("data-paged-react-target-page");
    if (href === null) continue;
    const known = targetPages.get(href);
    if (known !== undefined) span.textContent = known;
  }

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
  const orderedFlowCache = new WeakMap<Element, boolean>();
  const pageBreaks = Array.from(body.querySelectorAll("[data-paged-react-page-break]"));
  const tableWindows = createTableWindows(body, ownerWindow, maxBodyHeight);
  let sliceMaxBodyHeight = maxBodyHeight;
  let lastYield = performance.now();
  let firstPage = true;
  let forcedBreak = false;
  // Set by keepWithNext when a better break exists inside an element it would move whole.
  let rebreakAt: number | null = null;
  let currentBodyTop = 0;

  // Margins adjoining an unforced break are truncated (CSS Fragmentation 3, 5.2): the first
  // blocks of a page lose their top margins, down to the first top padding or border.
  const truncateLeadingMargins = () => {
    for (let element = body.firstElementChild; element instanceof ownerWindow.HTMLElement; element = element.firstElementChild) {
      const computed = ownerWindow.getComputedStyle(element);
      if (computed.display.startsWith("inline") || computed.position === "absolute" || computed.position === "fixed") break;
      if (computed.marginTop !== "0px") {
        element.style.marginTop = "0";
        styleCache.invalidate(element);
      }
      if (parseFloat(computed.paddingTop) || parseFloat(computed.borderTopWidth)) break;
    }
  };

  while (true) {
    if (signal?.aborted) return;
    sliceMaxBodyHeight = maxBodyHeight;
    if (!firstPage && !forcedBreak) truncateLeadingMargins();
    firstPage = false;
    forcedBreak = false;

    const bodyRect = body.getBoundingClientRect();
    currentBodyTop = bodyRect.top;
    const bodyHeight = bodyRect.height;
    const hasPageBreak = pageBreaks.some((pageBreak) => body.contains(pageBreak));

    if (bodyHeight <= maxBodyHeight && !hasPageBreak && !tableWindows.pending()) {
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
    let fullestSlice: { mutations: Array<() => void>; pageSlice: HTMLElement } | undefined;

    while (true) {
      const candidateMutations: Array<() => void> = [];
      const candidate = bodySlice({ body, bodyRect, mutations: candidateMutations });

      // A better break was found inside an element: slice the page again, ending exactly there.
      const preferred = rebreakAt;
      rebreakAt = null;
      if (preferred !== null && preferred > 0 && preferred < sliceMaxBodyHeight) {
        sliceMaxBodyHeight = preferred;
        continue;
      }

      for (let element = candidate.segment.lastElementChild; element instanceof ownerWindow.HTMLElement; element = element.lastElementChild) {
        element.style.marginBottom = "0";
      }

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
      fullestSlice ??= { mutations, pageSlice };

      if (overflow <= 0 || !mutations.length) {
        break;
      }

      let correction = Math.ceil(overflow);
      if (correction < 1) correction = 1;
      sliceMaxBodyHeight -= correction;
      // Shrinking never cleared the overflow, e.g. a fixed-height box taller than the page.
      if (sliceMaxBodyHeight <= 0) {
        ({ mutations, pageSlice } = fullestSlice);
        break;
      }
    }

    yield pageSlice;

    if (!mutations.length) {
      // No progress is possible, so stop instead of repeating this page forever; whatever is
      // still in the source is missing from the output, so say so.
      if (body.textContent?.trim() || body.children.length) {
        console.error("Paged React: pagination made no progress; the remaining content was dropped.", body);
      }
      return;
    }

    // Restore parked table rows before this page's rows leave the source, so the window never runs dry.
    tableWindows.topUp();
    for (const mutation of mutations) {
      mutation();
    }

    // Yield to the browser in ~50 ms slices rather than after every page: each yield lets it run a
    // full render of the growing page list, which cost ~25-30% of pagination time on 100+ pages.
    if (performance.now() - lastYield > 50) {
      await new Promise<void>((resolve) => setTimeout(resolve));
      lastYield = performance.now();
    }
    if (signal?.aborted) return;
  }

  function bodySlice(ctx: {
    body: HTMLElement;
    bodyRect: DOMRect;
    mutations: Array<() => void>;
    parent?: HTMLElement;
    superParentOffset?: number;
  }): { consumed: boolean; segment: HTMLElement; stopped: boolean; pastWindow?: boolean } {
    const { body, bodyRect, mutations, parent = body, superParentOffset = 0 } = ctx;
    const segment = parent.cloneNode(false) as HTMLElement;
    let consumed = false;
    let stopped = false;
    // Elements placed whole on this page, newest last, so a heading can follow its next sibling.
    const placed: Array<{ element: Element; clone: Node; mutationStart: number; consumedBefore: boolean }> = [];
    // `next` contributes nothing to this page. Elements before it that must not be separated from
    // it (`break-after: avoid` / `break-before: avoid`) move to the next page too, as long as
    // something else stays on this one.
    const keepWithNext = (next: Element) => {
      let following = next;
      for (let last = placed.at(-1); last; last = placed.at(-1)) {
        if (last.mutationStart === 0 || !avoidsBreakBetween(last.element, following)) break;
        // Rather than moving all of it, break inside it at its latest allowed boundary (the
        // highest-ranked break left on this page), e.g. before a heading that closes a wrapper.
        const inner = interiorBreak(last.element, bodyRect);
        if (inner !== null) {
          rebreakAt = inner;
          return;
        }
        placed.pop();
        while (segment.lastChild && segment.lastChild !== last.clone) segment.lastChild.remove();
        last.clone.parentNode?.removeChild(last.clone);
        mutations.length = last.mutationStart;
        consumed = last.consumedBefore;
        following = last.element;
      }
    };
    // Without repeated headers only a table's first fragment shows its <thead>: once rows of the
    // table are placed, the header leaves the source with them.
    const consumeTableHeaderWith = (target: Element) => {
      const head = parent instanceof ownerWindow.HTMLTableElement ? parent.tHead : null;
      if (!repeatTableHeader && head && target !== head && target.tagName !== "COLGROUP" && target.tagName !== "CAPTION") {
        mutations.push(() => head.remove());
      }
    };
    // Everything on this page so far must stay with `next` (a heading starting the page): moving
    // `next` to the next page would take all of it along, so the page could not make progress.
    const onlyKeptWithNext = (next: Element) => {
      let following = next;
      for (let index = placed.length - 1; index >= 0; index--) {
        const entry = placed.at(index);
        if (!entry || !avoidsBreakBetween(entry.element, following)) return false;
        if (entry.mutationStart === 0) return true;
        following = entry.element;
      }
      return false;
    };
    const parentStyle = styleCache.get(parent);
    // Ancestors being walked continue on the next page and are sliced (see sliceFragment), so
    // their bottom padding, border and margin take no room on this page.
    const parentOffset = 0;

    const orderedFlow = isOrderedFlow(parent);

    for (const target of Array.from(parent.childNodes)) {
      if (target instanceof ownerWindow.Element) {
        if (target.hasAttribute("data-paged-react-page-break")) {
          // A break below the page window belongs to a later page: end this page without
          // consuming it, otherwise it is removed here and never breaks where it stands.
          const breakTop =
            target.getBoundingClientRect().top + parentOffset + superParentOffset - bodyRect.top;
          if (breakTop <= sliceMaxBodyHeight) {
            mutations.push(() => {
              target.remove();
              forcedBreak = true;
            });
          }
          return { consumed, segment, stopped: true };
        }

        // Column definitions apply to every slice of a table: copy them onto each page and keep
        // them in the source. Losing them changes column widths, so slices measured against the
        // source layout overflow the page.
        if (parent instanceof ownerWindow.HTMLTableElement && target.tagName === "COLGROUP") {
          segment.appendChild(target.cloneNode(true));
          continue;
        }

        // A table being split repeats its <tfoot> at the bottom of each fragment; the caller adds
        // it. Its last fragment fits whole and keeps the original.
        if (repeatTableHeader && parent instanceof ownerWindow.HTMLTableElement && target === parent.tFoot) {
          continue;
        }

        const targetRect = target.getBoundingClientRect();
        const targetStyle = styleCache.get(target);

        // Border box only: a bottom margin at the end of the page is truncated.
        const targetBottom = targetRect.bottom + superParentOffset + parentOffset - bodyRect.top;

        // In ordered flow this child and every later one start below the page window, so none of
        // them can land on this page.
        if (orderedFlow && mutations.length > 0 && targetRect.top - bodyRect.top > sliceMaxBodyHeight) {
          keepWithNext(target);
          return { consumed, segment, stopped: true, pastWindow: true };
        }

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

          // Table cells keep the row's column structure: an empty cell is always copied into the
          // fragment and never dropped.
          const tableCell = target instanceof ownerWindow.HTMLTableCellElement;

          // A box whose content pagination already placed holds nothing more to show. If it
          // crosses the page end (fixed height), drop it: it can never fit and would stall pages.
          if (
            target.hasAttribute(EMPTY_BY_PAGINATION_ATTRIBUTE) &&
            (targetContentHeight <= 0 || (!tableCell && targetBottom > sliceMaxBodyHeight))
          ) {
            mutations.push(() => target.remove());
            continue;
          }

          // Empty elements (<br>, <hr>, <img>, spacers) go on the page only when they fit there;
          // otherwise they wait in the source for the page they belong to.
          if (tableCell || targetBottom <= sliceMaxBodyHeight) segment.appendChild(target.cloneNode(true));
          if (targetBottom <= sliceMaxBodyHeight) {
            mutations.push(() => target.remove());
            consumed = true;
          }

          continue;
        }

        const targetRequiredPageHeight =
          targetRect.height + Math.max(0, targetStyle.marginTop) + Math.max(0, targetStyle.marginBottom);
        // `break-inside: avoid` is a preference. Like Chrome, a block that is too tall for any page
        // first moves to a fresh page (see below) and is split there instead of being clipped.
        const canBreakTarget =
          canBreakElement(target) ||
          ((mutations.length === 0 || onlyKeptWithNext(target)) &&
            targetRequiredPageHeight > maxBodyHeight &&
            !isMonolithic(target));
        const hasNestedPageBreak = pageBreaks.some((pageBreak) => target.contains(pageBreak));

        if (
          targetBottom <= sliceMaxBodyHeight &&
          !hasNestedPageBreak &&
          targetStyle.display !== "contents"
        ) {
          // Keep pagination-created empty shells that still have box height.
          const clone = target.cloneNode(true);
          segment.appendChild(clone);

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

          placed.push({ element: target, clone, mutationStart: mutations.length, consumedBefore: consumed });
          mutations.push(() => {
            // Remove the source node after cloning it into the page.
            cleanupPaginationTarget(target, parent, repeatTableHeader);
          });
          consumeTableHeaderWith(target);
          consumed = true;
        } else if (canBreakTarget) {
          const lineLimit = lineFragmentLimit(
            target as HTMLElement,
            targetRect,
            bodyRect,
            parentOffset + superParentOffset,
          );

          // Too few lines would stay on this page (orphans), so the block starts on the next one.
          if (lineLimit === "next-page" && mutations.length > 0) {
            keepWithNext(target);
            return { consumed, segment, stopped: true };
          }

          // Stop the split early enough to leave `widows` lines for the next page.
          const pageLimit = sliceMaxBodyHeight;
          if (typeof lineLimit === "number") {
            sliceMaxBodyHeight = Math.min(sliceMaxBodyHeight, lineLimit);
          }
          // Like Chrome's print, a table continuing on the next page repeats its <tfoot> at the
          // bottom of this fragment, so leave room for it below the rows.
          const repeatedFooter =
            repeatTableHeader && target instanceof ownerWindow.HTMLTableElement ? target.tFoot : null;
          if (repeatedFooter) sliceMaxBodyHeight -= repeatedFooter.getBoundingClientRect().height;

          let childSegment: ReturnType<typeof bodySlice>;
          try {
            childSegment = bodySlice({
              body,
              bodyRect,
              mutations,
              parent: target as HTMLElement,
              superParentOffset: parentOffset + superParentOffset,
            });
          } finally {
            sliceMaxBodyHeight = pageLimit;
          }
          if (repeatedFooter && childSegment.consumed) {
            childSegment.segment.appendChild(repeatedFooter.cloneNode(true));
          }
          if (childSegment.segment.childNodes.length && childSegment.consumed) {
            segment.appendChild(childSegment.segment);
            consumed = true;
            placed.length = 0;
            consumeTableHeaderWith(target);
            sliceFragment(childSegment.segment, target as HTMLElement, mutations);
          }
          if (childSegment.stopped) {
            // The child only ran out of content inside the page window. Later siblings start below
            // it in ordered flow; in grids, flex rows and tables they may sit beside it, so go on.
            if (childSegment.pastWindow) {
              if (!orderedFlow) continue;
              if (!childSegment.consumed) keepWithNext(target);
              return { consumed, segment, stopped: true, pastWindow: true };
            }
            if (
              (parentStyle.display === "flex" || parentStyle.display === "inline-flex") &&
              parentStyle.flexDirection !== "column" &&
              parentStyle.flexDirection !== "column-reverse"
            ) {
              stopped = true;
              continue;
            }
            if (!childSegment.consumed) keepWithNext(target);
            return { consumed, segment, stopped: true };
          }

          // The block crosses the page end but not even its first line fits: it moves to the next
          // page as a whole, and what must stay with it (a heading before it) moves too.
          if (
            orderedFlow &&
            !childSegment.consumed &&
            mutations.length > 0 &&
            targetBottom > sliceMaxBodyHeight
          ) {
            keepWithNext(target);
            return { consumed, segment, stopped: true };
          }
        } else {
          if (consumed) {
            keepWithNext(target);
            return { consumed, segment, stopped: true };
          }

          if (
            mutations.length > 0 &&
            (targetRequiredPageHeight <= maxBodyHeight || !isMonolithic(target))
          ) {
            keepWithNext(target);
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
        const textRange = measureRange(body.ownerDocument);
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
          if (target.data.trim()) placed.length = 0;
          segment.append(target.data);
          mutations.push(() => {
            const textParent = target.parentElement;
            target.remove();
            if (textParent && !textParent.children.length && !textParent.textContent?.trim()) {
              textParent.setAttribute(EMPTY_BY_PAGINATION_ATTRIBUTE, "");
            }
          });
          consumed = true;
          continue;
        }

        // Leave text alone if it starts below the current page window.
        if (textTop > sliceMaxBodyHeight) continue;

        // Split text at the first line that does not fit: earlier lines stay on this page, the
        // rest stays in the source as one text node. Only that boundary is measured.
        // One entry per line box: pre-formatted text reports an extra rect per newline.
        const lines = groupLineBoxes(textRects);
        const offset = parentOffset + superParentOffset - bodyRect.top;
        const firstOverflow = lines.findIndex((line) => line.bottom + offset > sliceMaxBodyHeight);
        const overflowLine = lines[firstOverflow];
        const cut = overflowLine ? lineStartOffset(target, overflowLine) : target.data.length;

        // Splitting at 0 would place nothing and leave the page unchanged.
        if (cut > 0 && cut < target.data.length) {
          if (target.data.slice(0, cut).trim()) placed.length = 0;
          segment.append(target.data.slice(0, cut));
          consumed = true;
          mutations.push(() => target.deleteData(0, cut));
        }
      }
    }

    return { consumed, segment, stopped };
  }

  /**
   * A block split at the page end is sliced like Chrome's default `box-decoration-break: slice`:
   * the fragment on this page has no bottom padding, border or margin, and the part left in the
   * source (the next page) no top ones.
   */
  function sliceFragment(fragment: HTMLElement, source: HTMLElement, mutations: Array<() => void>) {
    fragment.style.paddingBottom = "0";
    fragment.style.borderBottomWidth = "0";
    fragment.style.marginBottom = "0";
    // A box taller than its content (a fixed height or min-height, e.g. table cells with a set
    // height) is split like Chrome splits it: this fragment shrinks to the content placed here, the
    // continuation keeps only the height left below the page end.
    const leftover = fixedHeightLeftover(source);
    if (leftover !== null) {
      fragment.style.height = "auto";
      fragment.style.minHeight = "0";
    }
    mutations.push(() => {
      if (leftover !== null) {
        source.style.height = `${leftover}px`;
        source.style.minHeight = "0";
      }
      source.style.paddingTop = "0";
      source.style.borderTopWidth = "0";
      source.style.marginTop = "0";
      styleCache.invalidate(source);
    });
  }

  /**
   * Cells of `row` that span rows below it would disappear with it and shift every later row's
   * cells into the wrong columns. Before the first row of a section leaves the source, each such
   * cell continues as an empty cell in the next row, at the same column, spanning one row less.
   */
  function carryRowSpans(row: HTMLTableRowElement) {
    const section = row.parentElement;
    const next = row.nextElementSibling;
    if (!(section instanceof ownerWindow.HTMLTableSectionElement) || section.rows[0] !== row) return;
    if (!(next instanceof ownerWindow.HTMLTableRowElement)) return;

    // In a section's first row, a cell's column is the sum of the colspans before it.
    const carried: Array<{ column: number; cell: HTMLTableCellElement }> = [];
    let column = 0;
    for (const cell of Array.from(row.cells)) {
      if (cell.rowSpan > 1) {
        const continuation = cell.cloneNode(false) as HTMLTableCellElement;
        continuation.rowSpan = cell.rowSpan - 1;
        carried.push({ column, cell: continuation });
      }
      column += cell.colSpan;
    }
    if (!carried.length) return;

    // The next row's own cells fill the columns the carried cells leave free.
    const taken = new Set(carried.flatMap(({ column: start, cell }) => Array.from({ length: cell.colSpan }, (_, i) => start + i)));
    const placedAt: Array<{ column: number; cell: HTMLTableCellElement }> = [];
    let free = 0;
    for (const cell of Array.from(next.cells)) {
      while (taken.has(free)) free++;
      placedAt.push({ column: free, cell });
      free += cell.colSpan;
    }
    for (const { column: start, cell } of carried) {
      const before = placedAt.find((entry) => entry.column > start)?.cell ?? null;
      next.insertBefore(cell, before);
    }
  }

  /**
   * The latest place inside `element` where the page may break without violating an `avoid`:
   * the bottom of a child followed by a sibling it need not stay with, searched from the deepest
   * level of the last-child chain up (deeper boundaries come later on the page). Null when the
   * element must not be broken or has no such boundary.
   */
  function interiorBreak(element: Element, bodyRect: DOMRect): number | null {
    const levels: Element[] = [];
    for (let level: Element | null = element; level && canBreakElement(level) && isOrderedFlow(level as HTMLElement); level = level.lastElementChild) {
      levels.push(level);
    }
    for (const level of levels.reverse()) {
      const children = Array.from(level.children);
      for (let index = children.length - 1; index > 0; index--) {
        const before = children[index - 1] as Element;
        if (!avoidsBreakBetween(before, children[index] as Element)) {
          const bottom = before.getBoundingClientRect().bottom - bodyRect.top;
          return bottom > 0 ? bottom : null;
        }
      }
    }
    return null;
  }

  /**
   * Height of `element` below the current page end when CSS gives it a fixed height (`height` or
   * `min-height` as a length), null when it is sized by its content. Uses the Typed OM, which keeps
   * `auto` where getComputedStyle reports used pixels; layout-less DOMs (jsdom) lack it.
   */
  function fixedHeightLeftover(element: HTMLElement): number | null {
    if (typeof element.computedStyleMap !== "function") return null;
    const styles = element.computedStyleMap();
    const fixed = (value: unknown) => String(value).endsWith("px") && String(value) !== "0px";
    if (!fixed(styles.get("height")) && !fixed(styles.get("min-height"))) return null;
    const pageEnd = currentBodyTop + sliceMaxBodyHeight;
    return Math.max(0, element.getBoundingClientRect().bottom - pageEnd);
  }

  /** CSS `break-after` / `break-before: avoid` between two adjacent siblings. */
  function avoidsBreakBetween(previous: Element, next: Element) {
    const avoid = (value: string) => value === "avoid" || value === "avoid-page";
    const blockLevel = (element: Element) => !ownerWindow.getComputedStyle(element).display.startsWith("inline");
    // `break-after` propagates up from a last child, `break-before` from a first child.
    for (let element: Element | null = previous; element && blockLevel(element); element = element.lastElementChild) {
      if (avoid(ownerWindow.getComputedStyle(element).breakAfter)) return true;
    }
    for (let element: Element | null = next; element && blockLevel(element); element = element.firstElementChild) {
      if (avoid(ownerWindow.getComputedStyle(element).breakBefore)) return true;
    }
    return false;
  }

  /**
   * Whether every child of `parent` starts at or below the previous one, so a sibling walk may end
   * at the first child that starts below the page window. Computed once per parent: pagination
   * only removes children and splits text, which cannot break the ordering.
   */
  function isOrderedFlow(parent: HTMLElement): boolean {
    const cached = orderedFlowCache.get(parent);
    if (cached !== undefined) return cached;

    // "" is what DOMs without layout (jsdom) report for properties they do not implement.
    const isInitial = (value: string, ...initial: string[]) => value === "" || initial.includes(value);
    const parentComputed = ownerWindow.getComputedStyle(parent);
    // Tables lay out caption/thead/tfoot in their own order, whatever the DOM order is.
    let ordered =
      !(parent instanceof ownerWindow.HTMLTableElement) &&
      ORDERED_FLOW_DISPLAYS.has(styleCache.get(parent).display) &&
      isInitial(parentComputed.columnCount, "auto", "1") &&
      isInitial(parentComputed.columnWidth, "auto");

    for (const child of Array.from(parent.children)) {
      if (!ordered) break;
      const computed = ownerWindow.getComputedStyle(child);
      const box = styleCache.get(child);
      // Inline content, out-of-flow boxes, floats, shifted boxes and negative margins can all put a
      // later child above an earlier one.
      ordered =
        !computed.display.startsWith("inline") &&
        (isInitial(computed.position, "static") ||
          (computed.position === "relative" &&
            isInitial(computed.top, "auto", "0px") &&
            isInitial(computed.bottom, "auto", "0px"))) &&
        isInitial(computed.float, "none") &&
        isInitial(computed.transform, "none") &&
        box.marginTop >= 0 &&
        box.marginBottom >= 0;
    }

    orderedFlowCache.set(parent, ordered);
    return ordered;
  }

  /**
   * Applies CSS `orphans` / `widows` to a block of inline content that crosses the page end.
   * Returns a lower slice height that keeps enough lines for the next page, "next-page" when
   * fewer than `orphans` lines could stay on this page, or null when no adjustment is needed.
   */
  function lineFragmentLimit(
    target: HTMLElement,
    targetRect: DOMRect,
    bodyRect: DOMRect,
    offset: number,
  ): number | "next-page" | null {
    // Starts below this page: none of its lines can land here, so skip measuring them.
    if (targetRect.top - bodyRect.top >= sliceMaxBodyHeight) return null;

    const lines = inlineLineBoxes(target, ownerWindow);
    if (!lines || lines.length < 2) return null;

    // The block is split, so its bottom padding, border and margin are not on this page.
    const bottomOffset = offset;
    const lineBottoms = lines.map((line) => line.bottom + bottomOffset - bodyRect.top);
    const fitting = lineBottoms.filter((bottom) => bottom <= sliceMaxBodyHeight).length;

    if (fitting === 0 || fitting === lines.length) return null;

    const computed = ownerWindow.getComputedStyle(target);
    const orphans = lineCount(computed.orphans);
    const widows = lineCount(computed.widows);
    let keep = Math.min(fitting, lines.length - widows);
    // Too few lines for both (fewer than orphans + widows): like Chrome, orphans win and the
    // block breaks right after them, leaving fewer widows than asked for.
    if (keep < orphans && fitting >= orphans) keep = orphans;

    if (keep < orphans) return "next-page";
    if (keep < fitting) return (lineBottoms[keep - 1] ?? 0) + 0.5;
    return null;
  }

  function cleanupPaginationTarget(
    target: Element,
    parent: HTMLElement,
    repeatTableHeader: boolean,
  ) {
    if (target instanceof ownerWindow.HTMLTableRowElement) carryRowSpans(target);

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
