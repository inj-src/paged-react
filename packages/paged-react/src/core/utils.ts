export type PageElements = {
  page: HTMLDivElement;
  header: HTMLDivElement;
  body: HTMLDivElement;
  footer: HTMLDivElement;
};

export type ResolvedPageSize = {
  width: string;
  height: string;
};

/** Returns a direct segment slot without walking into nested child documents. */
export function getDirectSlot(parent: Element, attribute: "header" | "body" | "footer"): HTMLDivElement | null {
  return parent.querySelector(`:scope > [data-paged-react-${attribute}-source]`);
}

/** Clones all child nodes from a source slot into a target element. */
export function cloneChildrenInto(target: HTMLElement, source: HTMLElement | null): void {
  if (!source) {
    return;
  }

  for (const node of Array.from(source.childNodes)) {
    target.appendChild(node.cloneNode(true));
  }
}

/** Reads page size attributes from a segment. */
export function getEffectivePageSize(el: HTMLElement): ResolvedPageSize {
  const width = el.dataset.pagedReactPageWidth;
  const height = el.dataset.pagedReactPageHeight;

  if (!width || !height) {
    throw new Error("Document.Segment requires a resolved page size.");
  }

  return { width, height };
}

/** Converts a CSS page size value (e.g. mm/in/px) into numeric pixel dimensions. */
export function resolvePageSizeInPixels(pageSize: ResolvedPageSize, ownerDocument: Document) {
  const probe = ownerDocument.createElement("div");
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  probe.style.pointerEvents = "none";
  probe.style.left = "0";
  probe.style.top = "0";
  probe.style.width = pageSize.width;
  probe.style.height = pageSize.height;

  ownerDocument.body.appendChild(probe);

  const rect = probe.getBoundingClientRect();
  probe.remove();

  return {
    width: rect.width,
    height: rect.height,
  };
}

/** Creates the generated page shell used by the pagination engine. */
export function createPage({
  pagesRoot,
  headerSlot,
  footerSlot,
  bodySlot,
  segment,
  pageSize,
  pageNumber,
}: {
  pagesRoot: HTMLDivElement;
  headerSlot: HTMLDivElement | null;
  footerSlot: HTMLDivElement | null;
  bodySlot: HTMLDivElement | null;
  pageSize: ResolvedPageSize;
  segment: HTMLDivElement;
  pageNumber: number;
}): PageElements {
  const page = segment.cloneNode(false) as HTMLDivElement;
  page.removeAttribute("data-paged-react-segment-source");
  page.setAttribute("data-paged-react-page", "");
  page.setAttribute("data-page-number", String(pageNumber));
  page.style.height = pageSize.height;
  page.style.width = pageSize.width;

  let header = pagesRoot.ownerDocument.createElement("div");
  if (headerSlot) {
    header = headerSlot.cloneNode(false) as HTMLDivElement;
  }
  header.setAttribute("data-paged-react-page-header", "");
  header.removeAttribute("data-paged-react-header-source");

  let body = pagesRoot.ownerDocument.createElement("div");
  if (bodySlot) {
    body = bodySlot.cloneNode(false) as HTMLDivElement;
  }
  body.setAttribute("data-paged-react-page-body", "");
  body.removeAttribute("data-paged-react-body-source");

  let footer = pagesRoot.ownerDocument.createElement("div");
  if (footerSlot) {
    footer = footerSlot.cloneNode(false) as HTMLDivElement;
  }
  footer.setAttribute("data-paged-react-page-footer", "");
  footer.removeAttribute("data-paged-react-footer-source");

  page.append(header, body, footer);
  pagesRoot.appendChild(page);

  return { page, header, body, footer };
}

export function connectedClone(element: HTMLElement) {
  const clone = element.cloneNode(true) as HTMLElement;
  const parent = element.parentElement;
  if (!parent) {
    throw new Error("Paged React requires the source root to be connected.");
  }
  clone.style.left = "-100000px";
  clone.style.position = "absolute";
  clone.style.top = "0";
  parent.appendChild(clone);
  return clone;
}

export function getBoxStyle(element: Element) {
  const view = element.ownerDocument.defaultView;
  if (!view) {
    throw new Error("Paged React requires a document with an active window.");
  }
  const computedStyle = view.getComputedStyle(element);
  return {
    borderBottomWidth: parseFloat(computedStyle.borderBottomWidth) || 0,
    borderTopWidth: parseFloat(computedStyle.borderTopWidth) || 0,
    breakBefore: computedStyle.breakBefore,
    breakAfter: computedStyle.breakAfter,
    breakInside: computedStyle.breakInside,
    pageBreakBefore: computedStyle.pageBreakBefore,
    pageBreakAfter: computedStyle.pageBreakAfter,
    pageBreakInside: computedStyle.pageBreakInside,
    display: computedStyle.display,
    flexDirection: computedStyle.flexDirection,
    marginBottom: parseFloat(computedStyle.marginBottom) || 0,
    marginTop: parseFloat(computedStyle.marginTop) || 0,
    paddingBottom: parseFloat(computedStyle.paddingBottom) || 0,
    paddingTop: parseFloat(computedStyle.paddingTop) || 0,
  };
}
