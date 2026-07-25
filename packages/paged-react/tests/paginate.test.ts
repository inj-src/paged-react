import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { paginateDocument } from "../src/core/paginate.js";

const rectFrom = ({ height, top }: { height: number; top: number }) =>
  ({
    bottom: top + height,
    height,
    left: 0,
    right: 100,
    top,
    width: 100,
    x: 0,
    y: top,
    toJSON: () => ({}),
  }) as DOMRect;

function parsePx(value: string) {
  return Number.parseFloat(value) || 0;
}

function getElementHeight(element: Element): number {
  const scopedHeight = element.getAttribute("data-test-scoped-height");

  if (scopedHeight && element.closest(".extension-root")) {
    return Number.parseFloat(scopedHeight);
  }

  const explicitHeight = element.getAttribute("data-test-height");

  if (explicitHeight) {
    return Number.parseFloat(explicitHeight);
  }

  return Array.from(element.children).reduce((sum, child) => sum + getElementHeight(child), 0);
}

function getElementTop(element: Element): number {
  const parent = element.parentElement;

  if (!parent) {
    return 0;
  }

  const siblingTop = Array.from(parent.children)
    .slice(0, Array.from(parent.children).indexOf(element))
    .reduce((sum, sibling) => sum + getElementHeight(sibling), 0);

  return getElementTop(parent) + siblingTop;
}

describe("paginateDocument", () => {
  const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;

  beforeEach(() => {
    vi.stubGlobal("requestAnimationFrame", ((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    }) as typeof requestAnimationFrame);

    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: { ready: Promise.resolve() },
    });

    HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
      const styleHeight = parsePx(this.style.height);

      if (styleHeight > 0 && this.getAttribute("data-test-height") === null) {
        return rectFrom({ height: styleHeight, top: 0 });
      }

      return rectFrom({
        height: getElementHeight(this),
        top: getElementTop(this),
      });
    };
  });

  afterEach(() => {
    HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    document.body.replaceChildren();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("moves break-inside-avoid table rows to the next page when they fit a fresh page", async () => {
    const sourceRoot = document.createElement("div");
    const pagesRoot = document.createElement("div");
    const segment = document.createElement("div");
    const body = document.createElement("div");
    const intro = document.createElement("p");
    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    const tbody = document.createElement("tbody");
    const bodyRow = document.createElement("tr");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    segment.setAttribute("data-paged-react-segment-source", "");
    segment.setAttribute("data-paged-react-page-width", "100px");
    segment.setAttribute("data-paged-react-page-height", "100px");
    segment.setAttribute("data-paged-react-repeat-table-header", "true");
    body.setAttribute("data-paged-react-body-source", "");
    intro.setAttribute("data-test-height", "70");
    headerRow.setAttribute("data-test-height", "20");
    bodyRow.setAttribute("data-test-height", "30");
    bodyRow.style.breakInside = "avoid";
    bodyRow.innerHTML = "<td>Surgeon Fee</td><td>100</td>";

    headerRow.innerHTML = "<th>Expense Type</th><th>Amount</th>";
    thead.append(headerRow);
    tbody.append(bodyRow);
    table.append(thead, tbody);
    body.append(intro, table);
    segment.append(body);
    sourceRoot.append(segment);
    document.body.append(sourceRoot, pagesRoot);

    const pages = await paginateDocument({ sourceRoot, pagesRoot });

    expect(errorSpy).not.toHaveBeenCalled();
    expect(pages).toHaveLength(2);
    expect(pages[0].querySelectorAll("tbody tr")).toHaveLength(0);
    expect(pages[1].querySelectorAll("tbody tr")).toHaveLength(1);
  });

  it("overrides page size and margins for generated pages", async () => {
    const sourceRoot = document.createElement("div");
    const pagesRoot = document.createElement("div");
    const segment = document.createElement("div");
    const body = document.createElement("div");
    const content = document.createElement("p");

    segment.setAttribute("data-paged-react-segment-source", "");
    segment.setAttribute("data-paged-react-page-width", "100px");
    segment.setAttribute("data-paged-react-page-height", "100px");
    body.setAttribute("data-paged-react-body-source", "");
    content.setAttribute("data-test-height", "20");
    body.append(content);
    segment.append(body);
    sourceRoot.append(segment);
    document.body.append(sourceRoot, pagesRoot);

    const pages = await paginateDocument({
      sourceRoot,
      pagesRoot,
      options: {
        pageSize: { width: "50px", height: "60px" },
        pageMargins: {
          top: "4px",
          right: "5px",
          bottom: "6px",
          left: "7px",
        },
      },
    });

    expect(pages).toHaveLength(1);
    expect(pages[0].style.width).toBe("50px");
    expect(pages[0].style.height).toBe("60px");
    expect(pages[0].style.getPropertyValue("--paged-react-page-margin-top")).toBe("4px");
    expect(pages[0].style.getPropertyValue("--paged-react-page-margin-left")).toBe("7px");
  });

  it("paginates elements owned by an iframe document", async () => {
    const iframe = document.createElement("iframe");
    document.body.append(iframe);

    const frameDocument = iframe.contentDocument;
    const frameWindow = iframe.contentWindow;
    expect(frameDocument).not.toBeNull();
    expect(frameWindow).not.toBeNull();
    if (!frameDocument || !frameWindow) {
      return;
    }

    const sourceRoot = frameDocument.createElement("div");
    const pagesRoot = frameDocument.createElement("div");
    const segment = frameDocument.createElement("div");
    const body = frameDocument.createElement("div");
    const first = frameDocument.createElement("p");
    const second = frameDocument.createElement("p");

    segment.setAttribute("data-paged-react-segment-source", "");
    segment.setAttribute("data-paged-react-page-width", "100px");
    segment.setAttribute("data-paged-react-page-height", "50px");
    body.setAttribute("data-paged-react-body-source", "");
    first.setAttribute("data-test-height", "30");
    second.setAttribute("data-test-height", "30");
    body.append(first, second);
    segment.append(body);
    sourceRoot.append(segment);
    frameDocument.body.append(sourceRoot, pagesRoot);

    Object.defineProperty(frameDocument, "fonts", {
      configurable: true,
      value: { ready: Promise.resolve() },
    });
    frameWindow.HTMLElement.prototype.getBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;

    const pages = await paginateDocument({ sourceRoot, pagesRoot });

    expect(pages).toHaveLength(2);
    expect(pages[0].ownerDocument).toBe(frameDocument);
    expect(pages[1].ownerDocument).toBe(frameDocument);
  });

  it("preserves ancestor-scoped styles while measuring pagination", async () => {
    const styleRoot = document.createElement("div");
    const documentRoot = document.createElement("div");
    const pagesRoot = document.createElement("div");
    const sourceRoot = document.createElement("div");
    const segment = document.createElement("div");
    const body = document.createElement("div");
    const first = document.createElement("p");
    const second = document.createElement("p");

    styleRoot.className = "extension-root";
    segment.setAttribute("data-paged-react-segment-source", "");
    segment.setAttribute("data-paged-react-page-width", "100px");
    segment.setAttribute("data-paged-react-page-height", "100px");
    body.setAttribute("data-paged-react-body-source", "");
    first.setAttribute("data-test-height", "20");
    first.setAttribute("data-test-scoped-height", "60");
    first.style.breakInside = "avoid";
    first.textContent = "First";
    second.setAttribute("data-test-height", "20");
    second.setAttribute("data-test-scoped-height", "60");
    second.style.breakInside = "avoid";
    second.textContent = "Second";
    body.append(first, second);
    segment.append(body);
    sourceRoot.append(segment);
    documentRoot.append(pagesRoot, sourceRoot);
    styleRoot.append(documentRoot);
    document.body.append(styleRoot);

    const pages = await paginateDocument({ sourceRoot, pagesRoot });

    expect(pages).toHaveLength(2);
    expect(pages[0].textContent).toBe("First");
    expect(pages[1].textContent).toBe("Second");
  });
});
