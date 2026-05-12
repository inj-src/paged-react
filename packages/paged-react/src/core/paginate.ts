import { layout as measurePreparedText, prepare as prepareText } from "@chenglou/pretext";
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

type FragmentOutcome = "fit-all" | "split" | "none-fit";

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

function hasRenderableContent(node: Node): boolean {
  if (node.nodeType === Node.TEXT_NODE) {
    return (node.textContent ?? "").length > 0;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return node.childNodes.length > 0;
  }

  const element = node as Element;
  return element.childNodes.length > 0 || (element.textContent?.length ?? 0) > 0;
}

function pruneEmptyBranches(node: HTMLElement): void {
  for (const child of Array.from(node.children)) {
    pruneEmptyBranches(child as HTMLElement);
  }

  for (const child of Array.from(node.children)) {
    if (!hasRenderableContent(child)) {
      child.remove();
    }
  }
}

function appendRemainingChildClones(
  sourceChildren: ChildNode[],
  startIndex: number,
  target: HTMLElement,
): void {
  for (let index = startIndex; index < sourceChildren.length; index += 1) {
    const child = sourceChildren[index];
    if (child) {
      target.appendChild(child.cloneNode(true));
    }
  }
}

function getLineHeightPx(style: CSSStyleDeclaration): number {
  const lineHeight = Number.parseFloat(style.lineHeight);
  if (Number.isFinite(lineHeight)) {
    return lineHeight;
  }

  const fontSize = Number.parseFloat(style.fontSize);
  return Number.isFinite(fontSize) ? fontSize * 1.2 : 16 * 1.2;
}

function getLetterSpacingPx(style: CSSStyleDeclaration): number {
  const letterSpacing = Number.parseFloat(style.letterSpacing);
  return Number.isFinite(letterSpacing) ? letterSpacing : 0;
}

function getFontShorthand(style: CSSStyleDeclaration): string {
  if (style.font) {
    return style.font;
  }

  const fontStyle = style.fontStyle || "normal";
  const fontVariant = style.fontVariant || "normal";
  const fontWeight = style.fontWeight || "400";
  const fontStretch = style.fontStretch || "normal";
  const fontSize = style.fontSize || "16px";
  const fontFamily = style.fontFamily || "sans-serif";

  return `${fontStyle} ${fontVariant} ${fontWeight} ${fontStretch} ${fontSize} ${fontFamily}`;
}

function getGraphemeSegments(text: string): string[] {
  const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  return Array.from(segmenter.segment(text), (segment) => segment.segment);
}

function measureTextHeight(
  text: string,
  contextElement: HTMLElement,
  maxWidth: number,
): number | null {
  if (typeof navigator !== "undefined" && /jsdom/i.test(navigator.userAgent)) {
    return null;
  }

  const style = window.getComputedStyle(contextElement);

  try {
    const prepared = prepareText(text, getFontShorthand(style), {
      letterSpacing: getLetterSpacingPx(style),
      whiteSpace: style.whiteSpace === "pre-wrap" ? "pre-wrap" : "normal",
      wordBreak: style.wordBreak === "keep-all" ? "keep-all" : "normal",
    });
    return measurePreparedText(prepared, maxWidth, getLineHeightPx(style)).height;
  } catch {
    return null;
  }
}

function findTextSplitIndex(params: {
  text: string;
  contextElement: HTMLElement;
  targetParent: HTMLElement;
  pageBody: HTMLElement;
  availableHeight: number;
}): number {
  const { text, contextElement, targetParent, pageBody, availableHeight } = params;
  const graphemes = getGraphemeSegments(text);
  if (graphemes.length === 0) {
    return 0;
  }

  const maxWidth =
    contextElement.getBoundingClientRect().width || contextElement.clientWidth || pageBody.clientWidth;
  const fitsByDom = (count: number): boolean => {
    if (count <= 0) {
      return false;
    }

    const probe = document.createTextNode(graphemes.slice(0, count).join(""));
    targetParent.appendChild(probe);
    const fits = !bodyHasOverflow(pageBody);
    targetParent.removeChild(probe);
    return fits;
  };

  const estimatedHeight = maxWidth > 0 ? measureTextHeight(text, contextElement, maxWidth) : null;
  if (estimatedHeight !== null && estimatedHeight <= availableHeight && fitsByDom(graphemes.length)) {
    return graphemes.length;
  }

  let low = 1;
  let high = graphemes.length;
  let best = 0;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const candidate = graphemes.slice(0, mid).join("");
    const candidateHeight =
      maxWidth > 0 ? measureTextHeight(candidate, contextElement, maxWidth) : null;

    if (candidateHeight !== null && candidateHeight > availableHeight) {
      high = mid - 1;
      continue;
    }

    if (fitsByDom(mid)) {
      best = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return best;
}

function splitTextNodeToFit(params: {
  sourceText: Text;
  targetParent: HTMLElement;
  pageBody: HTMLElement;
  baselineHeight: number;
}): { head: Text | null; tail: Text | null } {
  const { sourceText, targetParent, pageBody, baselineHeight } = params;
  const text = sourceText.textContent ?? "";
  if (text.length === 0) {
    return { head: null, tail: null };
  }

  const graphemes = getGraphemeSegments(text);
  const availableHeight = Math.max(0, pageBody.clientHeight - baselineHeight);
  const best = findTextSplitIndex({
    availableHeight,
    contextElement: sourceText.parentElement ?? targetParent,
    pageBody,
    targetParent,
    text,
  });

  if (best <= 0) {
    return { head: null, tail: document.createTextNode(text) };
  }

  const headText = graphemes.slice(0, best).join("");
  const tailText = graphemes.slice(best).join("");

  return {
    head: document.createTextNode(headText),
    tail: tailText.length > 0 ? document.createTextNode(tailText) : null,
  };
}

function fragmentChildNodesToFit(params: {
  sourceChildren: ChildNode[];
  fittedParent: HTMLElement;
  overflowParent: HTMLElement;
  pageBody: HTMLElement;
}): FragmentOutcome {
  const { sourceChildren, fittedParent, overflowParent, pageBody } = params;

  for (const [index, child] of sourceChildren.entries()) {
    const hadPriorContent = hasRenderableContent(fittedParent);

    if (child.nodeType === Node.TEXT_NODE) {
      const baselineHeight = pageBody.scrollHeight;
      const fullClone = child.cloneNode(true) as Text;
      fittedParent.appendChild(fullClone);

      if (!bodyHasOverflow(pageBody)) {
        continue;
      }

      fittedParent.removeChild(fullClone);
      const split = splitTextNodeToFit({
        sourceText: child as Text,
        targetParent: fittedParent,
        pageBody,
        baselineHeight,
      });

      if (!split.head) {
        if (hadPriorContent) {
          overflowParent.appendChild(child.cloneNode(true));
          appendRemainingChildClones(sourceChildren, index + 1, overflowParent);
          return "split";
        }

        return "none-fit";
      }

      fittedParent.appendChild(split.head);
      if (split.tail) {
        overflowParent.appendChild(split.tail);
      }
      appendRemainingChildClones(sourceChildren, index + 1, overflowParent);
      return "split";
    }

    if (child.nodeType !== Node.ELEMENT_NODE) {
      const fullClone = child.cloneNode(true);
      fittedParent.appendChild(fullClone);
      if (!bodyHasOverflow(pageBody)) {
        continue;
      }
      fittedParent.removeChild(fullClone);

      if (hadPriorContent) {
        overflowParent.appendChild(child.cloneNode(true));
        appendRemainingChildClones(sourceChildren, index + 1, overflowParent);
        return "split";
      }

      return "none-fit";
    }

    const sourceElement = child as HTMLElement;
    const fullClone = sourceElement.cloneNode(true) as HTMLElement;
    fittedParent.appendChild(fullClone);
    if (!bodyHasOverflow(pageBody)) {
      continue;
    }
    fittedParent.removeChild(fullClone);

    if (shouldAvoidBreakInside(sourceElement) && hadPriorContent) {
      overflowParent.appendChild(fullClone);
      appendRemainingChildClones(sourceChildren, index + 1, overflowParent);
      return "split";
    }

    const headChild = sourceElement.cloneNode(false) as HTMLElement;
    const tailChild = sourceElement.cloneNode(false) as HTMLElement;
    fittedParent.appendChild(headChild);

    const childOutcome = fragmentChildNodesToFit({
      sourceChildren: Array.from(sourceElement.childNodes),
      fittedParent: headChild,
      overflowParent: tailChild,
      pageBody,
    });

    pruneEmptyBranches(headChild);
    pruneEmptyBranches(tailChild);

    if (!hasRenderableContent(headChild)) {
      headChild.remove();
    }

    if (childOutcome === "fit-all" && !bodyHasOverflow(pageBody)) {
      continue;
    }

    if (childOutcome === "split") {
      if (hasRenderableContent(tailChild)) {
        overflowParent.appendChild(tailChild);
      }
      appendRemainingChildClones(sourceChildren, index + 1, overflowParent);
      return "split";
    }

    if (headChild.isConnected) {
      headChild.remove();
    }

    if (hadPriorContent) {
      overflowParent.appendChild(fullClone);
      appendRemainingChildClones(sourceChildren, index + 1, overflowParent);
      return "split";
    }

    return "none-fit";
  }

  return "fit-all";
}

function fragmentElementToFit(
  sourceElement: HTMLElement,
  pageBody: HTMLElement,
): { head: HTMLElement | null; tail: HTMLElement | null } | null {
  const head = sourceElement.cloneNode(false) as HTMLElement;
  const tail = sourceElement.cloneNode(false) as HTMLElement;
  pageBody.appendChild(head);

  const outcome = fragmentChildNodesToFit({
    sourceChildren: Array.from(sourceElement.childNodes),
    fittedParent: head,
    overflowParent: tail,
    pageBody,
  });

  pruneEmptyBranches(head);
  pruneEmptyBranches(tail);

  if (!hasRenderableContent(head)) {
    head.remove();
  }

  if (!hasRenderableContent(tail)) {
    tail.remove();
  }

  if (outcome === "none-fit") {
    head.remove();
    tail.remove();
    return null;
  }

  return {
    head: hasRenderableContent(head) ? head : null,
    tail: hasRenderableContent(tail) ? tail : null,
  };
}

function paginateFragmentableBlock(params: {
  block: HTMLElement;
  currentPage: PageElements;
  createSegmentPage: () => PageElements;
}): PageElements {
  const { block, createSegmentPage } = params;
  let currentPage = params.currentPage;
  let pendingBlock: HTMLElement | null = block;

  while (pendingBlock) {
    const pageWasEmpty = currentPage.body.childElementCount === 0;
    const fullClone = pendingBlock.cloneNode(true) as HTMLElement;
    currentPage.body.appendChild(fullClone);

    if (!bodyHasOverflow(currentPage.body)) {
      return currentPage;
    }

    currentPage.body.removeChild(fullClone);

    if (shouldAvoidBreakInside(pendingBlock)) {
      if (pageWasEmpty) {
        currentPage.body.appendChild(fullClone);
        currentPage.page.setAttribute("data-paged-react-oversized", "true");
        currentPage.page.setAttribute("data-paged-react-break-inside-avoid", "true");
        return currentPage;
      }

      currentPage = createSegmentPage();
      continue;
    }

    const fragment = fragmentElementToFit(pendingBlock, currentPage.body);
    if (fragment?.tail) {
      pendingBlock = fragment.tail;
      currentPage = createSegmentPage();
      continue;
    }

    if (fragment?.head) {
      return currentPage;
    }

    if (pageWasEmpty) {
      currentPage.body.appendChild(fullClone);
      currentPage.page.setAttribute("data-paged-react-oversized", "true");
      return currentPage;
    }

    currentPage = createSegmentPage();
  }

  return currentPage;
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
        currentPage = createSegmentPage();
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

      currentPage = paginateFragmentableBlock({
        block,
        currentPage,
        createSegmentPage,
      });

      if (shouldBreakAfter(block)) {
        currentPage = createSegmentPage();
      }
    }
  }
}
