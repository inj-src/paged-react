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
export function getDirectSlot(
  parent: Element,
  attribute: "header" | "body" | "footer",
): HTMLElement | null {
  return parent.querySelector(`:scope > [data-paged-react-${attribute}]`);
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

/** Reads page size CSS variables from a segment, falling back to the document size. */
export function getEffectivePageSize(
  el: HTMLElement,
  fallback: ResolvedPageSize,
): ResolvedPageSize {
  const style = window.getComputedStyle(el);
  const width = style.getPropertyValue("--paged-react-page-width").trim() || fallback.width;
  const height = style.getPropertyValue("--paged-react-page-height").trim() || fallback.height;

  return { width, height };
}

/** Converts a CSS page size value (e.g. mm/in/px) into numeric pixel dimensions. */
export function resolvePageSizeInPixels(pageSize: ResolvedPageSize) {
  const probe = document.createElement("div");
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  probe.style.pointerEvents = "none";
  probe.style.left = "0";
  probe.style.top = "0";
  probe.style.width = pageSize.width;
  probe.style.height = pageSize.height;

  document.body.appendChild(probe);

  const rect = probe.getBoundingClientRect();
  probe.remove();

  return {
    width: rect.width,
    height: rect.height,
  };
}

/** Creates the generated page shell used by the pagination engine. */
export function createPage(
  pagesRoot: HTMLElement,
  pageSize: ResolvedPageSize,
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

  page.append(header, body, footer);
  pagesRoot.appendChild(page);

  return { page, header, body, footer };
}
