import { resolvePageSize } from "../utils/page-size.js";
import type { PageSize } from "../types.js";

type PaginationContext = {
  sourceRoot: HTMLElement;
  pagesRoot: HTMLElement;
  pageSize?: PageSize;
};

const BREAK_BEFORE_VALUES = new Set(["page", "always", "left", "right", "recto", "verso"]);
const BREAK_AFTER_VALUES = new Set(["page", "always", "left", "right", "recto", "verso"]);
const BREAK_INSIDE_AVOID_VALUES = new Set(["avoid"]);

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

function createPage(
  pagesRoot: HTMLElement,
  pageSize: { width: string; height: string },
  pageNumber: number,
): {
  page: HTMLDivElement;
  body: HTMLDivElement;
  header: HTMLDivElement;
  footer: HTMLDivElement;
} {
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

export async function paginateDocument(ctx: PaginationContext): Promise<void> {
  const { sourceRoot, pagesRoot, pageSize } = ctx;
  pagesRoot.textContent = "";

  await waitForLayoutReady(sourceRoot);

  const documentPageSize = resolvePageSize(pageSize) ?? { width: "210mm", height: "297mm" };
  const segments = Array.from(
    sourceRoot.querySelectorAll(":scope > [data-paged-react-segment]"),
  ) as HTMLElement[];

  if (segments.length === 0) {
    return;
  }

  let pageNumber = 1;

  for (const [segmentIndex, segment] of segments.entries()) {
    const segmentPageSize = getEffectivePageSize(segment, documentPageSize);

    const headerSlot = getDirectSlot(segment, "header");
    const bodySlot = getDirectSlot(segment, "body");
    const footerSlot = getDirectSlot(segment, "footer");

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

    let currentPage = createPage(pagesRoot, segmentPageSize, pageNumber++);
    currentPage.page.setAttribute("data-paged-react-segment-index", String(segmentIndex));
    cloneChildrenInto(currentPage.header, headerSlot);
    cloneChildrenInto(currentPage.footer, footerSlot);

    for (const block of blocks) {
      if (block.hasAttribute("data-paged-react-page-break")) {
        currentPage = createPage(pagesRoot, segmentPageSize, pageNumber++);
        currentPage.page.setAttribute("data-paged-react-segment-index", String(segmentIndex));
        cloneChildrenInto(currentPage.header, headerSlot);
        cloneChildrenInto(currentPage.footer, footerSlot);
        continue;
      }

      if (shouldBreakBefore(block)) {
        currentPage = createPage(pagesRoot, segmentPageSize, pageNumber++);
        currentPage.page.setAttribute("data-paged-react-segment-index", String(segmentIndex));
        cloneChildrenInto(currentPage.header, headerSlot);
        cloneChildrenInto(currentPage.footer, footerSlot);
      }

      const clone = block.cloneNode(true) as HTMLElement;
      currentPage.body.appendChild(clone);

      if (bodyHasOverflow(currentPage.body)) {
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

      if (shouldBreakAfter(block)) {
        currentPage = createPage(pagesRoot, segmentPageSize, pageNumber++);
        currentPage.page.setAttribute("data-paged-react-segment-index", String(segmentIndex));
        cloneChildrenInto(currentPage.header, headerSlot);
        cloneChildrenInto(currentPage.footer, footerSlot);
      }
    }
  }
}
