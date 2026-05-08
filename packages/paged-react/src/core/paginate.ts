import { resolvePageSize } from "../utils/page-size.js";
import type { PageSize } from "../types.js";

type PaginationContext = {
  sourceRoot: HTMLElement;
  pagesRoot: HTMLElement;
  pageSize?: PageSize;
  signal?: AbortSignal;
};

const BREAK_BEFORE_VALUES = new Set(["page", "always", "left", "right", "recto", "verso"]);
const BREAK_AFTER_VALUES = new Set(["page", "always", "left", "right", "recto", "verso"]);
const BREAK_INSIDE_AVOID_VALUES = new Set(["avoid"]);

type PageElements = {
  page: HTMLDivElement;
  body: HTMLDivElement;
  header: HTMLDivElement;
  footer: HTMLDivElement;
};

function getDirectSlot(
  parent: Element,
  attribute: "header" | "body" | "footer",
): HTMLElement | null {
  return parent.querySelector(`:scope > [data-paged-react-${attribute}]`);
}

function getBreakBefore(el: Element): string {
  const style = window.getComputedStyle(el);
  return style.breakBefore || style.pageBreakBefore || "";
}

function getBreakAfter(el: Element): string {
  const style = window.getComputedStyle(el);
  return style.breakAfter || style.pageBreakAfter || "";
}

function shouldBreakBefore(el: Element): boolean {
  if (el.hasAttribute("data-paged-react-page-break")) {
    return true;
  }
  return BREAK_BEFORE_VALUES.has(getBreakBefore(el));
}

function shouldBreakAfter(el: Element): boolean {
  return BREAK_AFTER_VALUES.has(getBreakAfter(el));
}

function shouldAvoidBreakInside(el: Element): boolean {
  const style = window.getComputedStyle(el);
  const modern = style.breakInside || "";
  const legacy = style.pageBreakInside || "";
  return BREAK_INSIDE_AVOID_VALUES.has(modern) || BREAK_INSIDE_AVOID_VALUES.has(legacy);
}

function shouldRepeatTableHeader(segment: HTMLElement): boolean {
  return segment.getAttribute("data-paged-react-repeat-table-header") === "true";
}

function isTableBlock(el: HTMLElement): el is HTMLTableElement {
  return el.tagName === "TABLE";
}

function createPage(
  pagesRoot: HTMLElement,
  pageSize: { width: string; height: string },
  pageNumber: number,
): PageElements {
  const page = document.createElement("div");
  page.setAttribute("data-paged-react-page", "");
  page.setAttribute("data-page-number", String(pageNumber));
  page.style.setProperty("--paged-react-page-width", pageSize.width);
  page.style.setProperty("--paged-react-page-height", pageSize.height);

  const header = document.createElement("div");
  header.setAttribute("data-paged-react-page-header", "");

  const body = document.createElement("div");
  body.setAttribute("data-paged-react-page-body", "");

  const footer = document.createElement("div");
  footer.setAttribute("data-paged-react-page-footer", "");

  page.appendChild(header);
  page.appendChild(body);
  page.appendChild(footer);
  pagesRoot.appendChild(page);

  return { page, body, header, footer };
}

function cloneChildrenInto(target: HTMLElement, source: HTMLElement | null): void {
  if (!source) {
    return;
  }
  for (const node of Array.from(source.childNodes)) {
    target.appendChild(node.cloneNode(true));
  }
}

function getEffectivePageSize(
  el: HTMLElement,
  fallback: { width: string; height: string },
): { width: string; height: string } {
  const style = window.getComputedStyle(el);
  const width = style.getPropertyValue("--paged-react-page-width").trim() || fallback.width;
  const height =
    style.getPropertyValue("--paged-react-page-height").trim() || fallback.height;
  return { width, height };
}

function waitForImages(root: HTMLElement): Promise<void> {
  const images = Array.from(root.querySelectorAll("img"));
  if (images.length === 0) {
    return Promise.resolve();
  }

  return Promise.all(
    images.map((img) => {
      if (img.complete) {
        return Promise.resolve();
      }
      return new Promise<void>((resolve) => {
        img.addEventListener("load", () => resolve(), { once: true });
        img.addEventListener("error", () => resolve(), { once: true });
      });
    }),
  ).then(() => undefined);
}

async function waitForLayoutReady(root: HTMLElement): Promise<void> {
  if (document.fonts && "ready" in document.fonts) {
    await document.fonts.ready;
  }
  await waitForImages(root);
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

function bodyHasOverflow(body: HTMLElement): boolean {
  return body.scrollHeight > body.clientHeight + 1;
}

function collectBodyBlocks(bodySlot: HTMLElement): HTMLElement[] {
  return Array.from(bodySlot.children) as HTMLElement[];
}

function getTableRows(table: HTMLTableElement): HTMLTableRowElement[] {
  if (table.tBodies.length > 0) {
    return Array.from(table.tBodies).flatMap((section) => Array.from(section.rows));
  }

  return Array.from(table.querySelectorAll(":scope > tr"));
}

function createTableFragment(
  sourceTable: HTMLTableElement,
  includeHeader: boolean,
): { table: HTMLTableElement; body: HTMLTableSectionElement } {
  const table = sourceTable.cloneNode(false) as HTMLTableElement;

  if (sourceTable.caption) {
    table.appendChild(sourceTable.caption.cloneNode(true));
  }

  for (const colGroup of Array.from(sourceTable.querySelectorAll(":scope > colgroup"))) {
    table.appendChild(colGroup.cloneNode(true));
  }

  if (includeHeader && sourceTable.tHead) {
    table.appendChild(sourceTable.tHead.cloneNode(true));
  }

  const sourceBody = sourceTable.tBodies[0];
  const body = sourceBody
    ? (sourceBody.cloneNode(false) as HTMLTableSectionElement)
    : document.createElement("tbody");

  table.appendChild(body);
  return { table, body };
}

function paginateTableBlock(params: {
  block: HTMLTableElement;
  currentPage: PageElements;
  createSegmentPage: () => PageElements;
  repeatHeader: boolean;
}): PageElements {
  const { block, createSegmentPage, repeatHeader } = params;
  const rows = getTableRows(block);

  let currentPage = params.currentPage;
  let isFirstFragment = true;
  let fragment = createTableFragment(block, true);
  currentPage.body.appendChild(fragment.table);

  for (const row of rows) {
    const rowClone = row.cloneNode(true) as HTMLTableRowElement;
    fragment.body.appendChild(rowClone);

    if (!bodyHasOverflow(currentPage.body)) {
      isFirstFragment = false;
      continue;
    }

    fragment.body.removeChild(rowClone);

    if (fragment.body.rows.length === 0) {
      if (currentPage.body.childElementCount > 1) {
        currentPage.body.removeChild(fragment.table);
        currentPage = createSegmentPage();
        fragment = createTableFragment(block, isFirstFragment || repeatHeader);
        currentPage.body.appendChild(fragment.table);
        fragment.body.appendChild(rowClone);

        if (bodyHasOverflow(currentPage.body)) {
          currentPage.page.setAttribute("data-paged-react-oversized", "true");
        }
        isFirstFragment = false;
        continue;
      }

      fragment.body.appendChild(rowClone);
      currentPage.page.setAttribute("data-paged-react-oversized", "true");
      isFirstFragment = false;
      continue;
    }

    currentPage = createSegmentPage();
    fragment = createTableFragment(block, repeatHeader);
    currentPage.body.appendChild(fragment.table);
    fragment.body.appendChild(rowClone);

    if (bodyHasOverflow(currentPage.body)) {
      currentPage.page.setAttribute("data-paged-react-oversized", "true");
    }
    isFirstFragment = false;
  }

  if (fragment.body.rows.length === 0) {
    currentPage.body.removeChild(fragment.table);
  }

  return currentPage;
}

export async function paginateDocument(ctx: PaginationContext): Promise<void> {
  const { sourceRoot, pagesRoot, pageSize, signal } = ctx;
  if (signal?.aborted) {
    return;
  }
  pagesRoot.textContent = "";

  await waitForLayoutReady(sourceRoot);
  if (signal?.aborted) {
    return;
  }

  const documentPageSize = resolvePageSize(pageSize) ?? { width: "210mm", height: "297mm" };
  const segments = Array.from(
    sourceRoot.querySelectorAll(":scope > [data-paged-react-segment]"),
  ) as HTMLElement[];

  if (segments.length === 0) {
    return;
  }

  let pageNumber = 1;

  for (const [segmentIndex, segment] of segments.entries()) {
    if (signal?.aborted) {
      return;
    }
    const segmentPageSize = getEffectivePageSize(segment, documentPageSize);

    const headerSlot = getDirectSlot(segment, "header");
    const bodySlot = getDirectSlot(segment, "body");
    const footerSlot = getDirectSlot(segment, "footer");
    const repeatHeader = shouldRepeatTableHeader(segment);

    if (!bodySlot) {
      continue;
    }

    const blocks = collectBodyBlocks(bodySlot);
    if (blocks.length === 0) {
      const emptyPage = createPage(pagesRoot, segmentPageSize, pageNumber++);
      cloneChildrenInto(emptyPage.header, headerSlot);
      cloneChildrenInto(emptyPage.footer, footerSlot);
      emptyPage.page.setAttribute("data-paged-react-segment-index", String(segmentIndex));
      continue;
    }

    const createSegmentPage = (): PageElements => {
      const page = createPage(pagesRoot, segmentPageSize, pageNumber++);
      page.page.setAttribute("data-paged-react-segment-index", String(segmentIndex));
      cloneChildrenInto(page.header, headerSlot);
      cloneChildrenInto(page.footer, footerSlot);
      return page;
    };

    let currentPage = createSegmentPage();

    for (const block of blocks) {
      if (signal?.aborted) {
        return;
      }
      if (block.hasAttribute("data-paged-react-page-break")) {
        currentPage = createPage(pagesRoot, segmentPageSize, pageNumber++);
        currentPage.page.setAttribute("data-paged-react-segment-index", String(segmentIndex));
        cloneChildrenInto(currentPage.header, headerSlot);
        cloneChildrenInto(currentPage.footer, footerSlot);
        continue;
      }

      if (shouldBreakBefore(block)) {
        currentPage = createSegmentPage();
      }

      if (isTableBlock(block)) {
        currentPage = paginateTableBlock({
          block,
          currentPage,
          createSegmentPage,
          repeatHeader,
        });

        if (shouldBreakAfter(block)) {
          currentPage = createSegmentPage();
        }
        continue;
      }

      const pageWasEmpty = currentPage.body.childElementCount === 0;
      const clone = block.cloneNode(true) as HTMLElement;
      currentPage.body.appendChild(clone);

      if (bodyHasOverflow(currentPage.body)) {
        if (pageWasEmpty) {
          currentPage.page.setAttribute("data-paged-react-oversized", "true");
          if (shouldAvoidBreakInside(block)) {
            currentPage.page.setAttribute("data-paged-react-break-inside-avoid", "true");
          }
        } else {
          currentPage.body.removeChild(clone);

          const nextPage = createPage(pagesRoot, segmentPageSize, pageNumber++);
          nextPage.page.setAttribute("data-paged-react-segment-index", String(segmentIndex));
          cloneChildrenInto(nextPage.header, headerSlot);
          cloneChildrenInto(nextPage.footer, footerSlot);
          nextPage.body.appendChild(clone);

          if (shouldAvoidBreakInside(block)) {
            nextPage.page.setAttribute("data-paged-react-break-inside-avoid", "true");
          }

          if (bodyHasOverflow(nextPage.body)) {
            nextPage.page.setAttribute("data-paged-react-oversized", "true");
          }

          currentPage = nextPage;
        }
      }

      if (shouldBreakAfter(block)) {
        currentPage = createSegmentPage();
      }
    }
  }
}
