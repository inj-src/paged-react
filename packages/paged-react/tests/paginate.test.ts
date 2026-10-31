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

/** Mock layout: flex rows and grids place their children side by side (one row of columns). */
function isSideBySide(element: Element) {
  return (
    element instanceof HTMLElement &&
    ((element.style.display === "flex" &&
      element.style.flexDirection !== "column" &&
      element.style.flexDirection !== "column-reverse") ||
      element.style.display === "grid")
  );
}

function getElementHeight(element: Element): number {
  const generatedHeight = element.getAttribute("data-test-generated-height");

  if (generatedHeight && element.closest("[data-paged-react-page-body]")) {
    return Number.parseFloat(generatedHeight);
  }

  const scopedHeight = element.getAttribute("data-test-scoped-height");

  if (scopedHeight && element.closest(".extension-root")) {
    return Number.parseFloat(scopedHeight);
  }

  const explicitHeight = element.getAttribute("data-test-height");

  if (explicitHeight) {
    return Number.parseFloat(explicitHeight);
  }

  const childHeights = Array.from(element.children, (child) => getElementHeight(child));

  if (isSideBySide(element)) {
    return Math.max(0, ...childHeights);
  }

  return childHeights.reduce((sum, height) => sum + height, 0);
}

function getElementRectHeight(element: Element): number {
  const pageHeight = element.getAttribute("data-test-page-height");

  if (pageHeight && element.hasAttribute("data-paged-react-page-body")) {
    return Number.parseFloat(pageHeight);
  }

  if (element instanceof HTMLElement && element.style.display === "contents") {
    return 0;
  }

  return getElementHeight(element);
}

function getElementTop(element: Element): number {
  const parent = element.parentElement;

  if (!parent) {
    return 0;
  }

  let siblingTop = 0;
  if (!isSideBySide(parent)) {
    siblingTop = Array.from(parent.children)
      .slice(0, Array.from(parent.children).indexOf(element))
      .reduce((sum, sibling) => sum + getElementHeight(sibling), 0);
  }

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
        height: getElementRectHeight(this),
        top: getElementTop(this),
      });
    };

    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(function clientHeight() {
      return getElementRectHeight(this);
    });
    vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockImplementation(function scrollHeight() {
      return Array.from(this.children).reduce((sum, child) => sum + getElementHeight(child), 0);
    });
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

  it("keeps a table header only on the first fragment without repeatTableHeader", async () => {
    const sourceRoot = document.createElement("div");
    const pagesRoot = document.createElement("div");
    const segment = document.createElement("div");
    const body = document.createElement("div");
    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const tbody = document.createElement("tbody");

    segment.setAttribute("data-paged-react-segment-source", "");
    segment.setAttribute("data-paged-react-page-width", "100px");
    segment.setAttribute("data-paged-react-page-height", "100px");
    body.setAttribute("data-paged-react-body-source", "");
    thead.innerHTML = '<tr data-test-height="20"><th>Head</th></tr>';
    for (const index of [1, 2, 3, 4]) {
      const row = document.createElement("tr");
      row.setAttribute("data-test-height", "25");
      row.style.breakInside = "avoid";
      row.innerHTML = `<td>Row ${index}</td>`;
      tbody.append(row);
    }
    table.append(thead, tbody);
    body.append(table);
    segment.append(body);
    sourceRoot.append(segment);
    document.body.append(sourceRoot, pagesRoot);

    const pages = await paginateDocument({ sourceRoot, pagesRoot });

    expect(pages.map((page) => page.textContent)).toEqual(["HeadRow 1Row 2Row 3", "Row 4"]);
  });

  it("repeats a table header on every fragment with repeatTableHeader", async () => {
    const sourceRoot = document.createElement("div");
    const pagesRoot = document.createElement("div");
    const segment = document.createElement("div");
    const body = document.createElement("div");
    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const tbody = document.createElement("tbody");

    segment.setAttribute("data-paged-react-segment-source", "");
    segment.setAttribute("data-paged-react-page-width", "100px");
    segment.setAttribute("data-paged-react-page-height", "100px");
    segment.setAttribute("data-paged-react-repeat-table-header", "true");
    body.setAttribute("data-paged-react-body-source", "");
    thead.innerHTML = '<tr data-test-height="20"><th>Head</th></tr>';
    for (const index of [1, 2, 3, 4]) {
      const row = document.createElement("tr");
      row.setAttribute("data-test-height", "25");
      row.style.breakInside = "avoid";
      row.innerHTML = `<td>Row ${index}</td>`;
      tbody.append(row);
    }
    table.append(thead, tbody);
    body.append(table);
    segment.append(body);
    sourceRoot.append(segment);
    document.body.append(sourceRoot, pagesRoot);

    const pages = await paginateDocument({ sourceRoot, pagesRoot });

    expect(pages.map((page) => page.textContent)).toEqual(["HeadRow 1Row 2Row 3", "HeadRow 4"]);
  });

  it("keeps every row of a long fixed-layout table in order while windowing its rows", async () => {
    const sourceRoot = document.createElement("div");
    const pagesRoot = document.createElement("div");
    const segment = document.createElement("div");
    const body = document.createElement("div");
    const table = document.createElement("table");

    segment.setAttribute("data-paged-react-segment-source", "");
    segment.setAttribute("data-paged-react-page-width", "100px");
    segment.setAttribute("data-paged-react-page-height", "100px");
    body.setAttribute("data-paged-react-body-source", "");
    // Long enough (12 pages) for the source to keep only a window of rows.
    table.style.tableLayout = "fixed";
    for (const group of [0, 1]) {
      const tbody = document.createElement("tbody");
      for (let index = 1; index <= 60; index++) {
        const row = document.createElement("tr");
        row.setAttribute("data-test-height", "10");
        row.style.breakInside = "avoid";
        row.innerHTML = `<td>R${group * 60 + index};</td>`;
        tbody.append(row);
      }
      table.append(tbody);
    }
    body.append(table);
    segment.append(body);
    sourceRoot.append(segment);
    document.body.append(sourceRoot, pagesRoot);

    const pages = await paginateDocument({ sourceRoot, pagesRoot });

    expect(pages).toHaveLength(12);
    expect(pages.map((page) => page.querySelectorAll("tr").length)).toEqual(Array(12).fill(10));
    expect(pages.map((page) => page.textContent).join("")).toBe(
      Array.from({ length: 120 }, (_, index) => `R${index + 1};`).join(""),
    );
  });

  it("repeats a table footer at the bottom of every fragment with repeatTableHeader", async () => {
    const sourceRoot = document.createElement("div");
    const pagesRoot = document.createElement("div");
    const segment = document.createElement("div");
    const body = document.createElement("div");
    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const tbody = document.createElement("tbody");
    const tfoot = document.createElement("tfoot");

    segment.setAttribute("data-paged-react-segment-source", "");
    segment.setAttribute("data-paged-react-page-width", "100px");
    segment.setAttribute("data-paged-react-page-height", "100px");
    segment.setAttribute("data-paged-react-repeat-table-header", "true");
    body.setAttribute("data-paged-react-body-source", "");
    thead.innerHTML = '<tr data-test-height="20"><th>Head</th></tr>';
    tfoot.innerHTML = '<tr data-test-height="20"><td>Foot</td></tr>';
    for (const index of [1, 2, 3, 4]) {
      const row = document.createElement("tr");
      row.setAttribute("data-test-height", "25");
      row.style.breakInside = "avoid";
      row.innerHTML = `<td>Row ${index}</td>`;
      tbody.append(row);
    }
    table.append(thead, tbody, tfoot);
    body.append(table);
    segment.append(body);
    sourceRoot.append(segment);
    document.body.append(sourceRoot, pagesRoot);

    const pages = await paginateDocument({ sourceRoot, pagesRoot });

    // 100px page: header 20 + two 25px rows + footer 20 per fragment.
    expect(pages.map((page) => page.textContent)).toEqual(["HeadRow 1Row 2Foot", "HeadRow 3Row 4Foot"]);
  });

  it("keeps a rowspan cell's column when its rows continue on the next page", async () => {
    const sourceRoot = document.createElement("div");
    const pagesRoot = document.createElement("div");
    const segment = document.createElement("div");
    const body = document.createElement("div");
    const table = document.createElement("table");
    const tbody = document.createElement("tbody");

    segment.setAttribute("data-paged-react-segment-source", "");
    segment.setAttribute("data-paged-react-page-width", "100px");
    segment.setAttribute("data-paged-react-page-height", "100px");
    body.setAttribute("data-paged-react-body-source", "");
    for (const index of [1, 2, 3, 4]) {
      const row = document.createElement("tr");
      row.setAttribute("data-test-height", "30");
      row.style.breakInside = "avoid";
      row.innerHTML = `${index === 1 ? '<td rowspan="4">Dept</td>' : ""}<td>Row ${index}</td>`;
      tbody.append(row);
    }
    table.append(tbody);
    body.append(table);
    segment.append(body);
    sourceRoot.append(segment);
    document.body.append(sourceRoot, pagesRoot);

    const pages = await paginateDocument({ sourceRoot, pagesRoot });

    expect(pages.map((page) => page.textContent)).toEqual(["DeptRow 1Row 2Row 3", "Row 4"]);
    // Row 4 still has the department column, as an empty continuation of the spanning cell.
    const cells = pages[1].querySelector("tr")?.cells;
    expect(cells?.length).toBe(2);
    expect(cells?.[0]?.textContent).toBe("");
    expect(cells?.[1]?.textContent).toBe("Row 4");
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
    expect(pages[0].querySelector(":scope > [data-paged-react-scaled-content]")).toBeNull();
    expect(pages[0].querySelector(":scope > [data-paged-react-page-body]")).not.toBeNull();
  });

  it("uses a logical page size before painting scaled generated content", async () => {
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
        scale: 0.5,
        pageMargins: { top: "4px", right: "5px", bottom: "6px", left: "7px" },
      },
    });

    const scaledContent = pages[0].querySelector<HTMLDivElement>(
      ":scope > [data-paged-react-scaled-content]",
    );

    expect(pages[0].style.width).toBe("100px");
    expect(pages[0].style.height).toBe("100px");
    expect(scaledContent?.style.width).toBe("200px");
    expect(scaledContent?.style.height).toBe("200px");
    expect(scaledContent?.style.getPropertyValue("--paged-react-scale")).toBe("0.5");
    expect(scaledContent?.style.getPropertyValue("--paged-react-page-margin-top")).toBe(
      "calc(4px / 0.5)",
    );
  });

  it("writes page numbers, total pages and target pages as text after pagination", async () => {
    const sourceRoot = document.createElement("div");
    const pagesRoot = document.createElement("div");
    const segment = document.createElement("div");
    const footer = document.createElement("div");
    const body = document.createElement("div");
    const contents = document.createElement("p");
    const filler = document.createElement("p");
    const chapter = document.createElement("h2");

    segment.setAttribute("data-paged-react-segment-source", "");
    segment.setAttribute("data-paged-react-page-width", "100px");
    segment.setAttribute("data-paged-react-page-height", "100px");
    footer.setAttribute("data-paged-react-footer-source", "");
    footer.innerHTML =
      'Page <span data-paged-react-page-number=""></span> of <span data-paged-react-total-pages=""></span>';
    body.setAttribute("data-paged-react-body-source", "");
    contents.setAttribute("data-test-height", "20");
    contents.innerHTML = 'Chapter on <span data-paged-react-target-page="#chapter"></span>';
    filler.setAttribute("data-test-height", "70");
    filler.style.breakInside = "avoid";
    filler.textContent = "Filler";
    chapter.id = "chapter";
    chapter.setAttribute("data-test-height", "40");
    chapter.style.breakInside = "avoid";
    chapter.textContent = "Chapter";
    body.append(contents, filler, chapter);
    segment.append(body, footer);
    sourceRoot.append(segment);
    document.body.append(sourceRoot, pagesRoot);

    const pages = await paginateDocument({ sourceRoot, pagesRoot });

    expect(pages).toHaveLength(2);
    expect(pages.map((page) => page.querySelector("[data-paged-react-page-footer]")?.textContent)).toEqual([
      "Page 1 of 2",
      "Page 2 of 2",
    ]);
    expect(pages[0].querySelector("[data-paged-react-target-page]")?.textContent).toBe("2");
  });

  it("rejects scale values outside the browser print range", async () => {
    const sourceRoot = document.createElement("div");
    const pagesRoot = document.createElement("div");

    await expect(
      paginateDocument({ sourceRoot, pagesRoot, options: { scale: 0.09 } }),
    ).rejects.toThrow("Paged React scale must be between 0.1 and 2.");
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

  it("continues paginating sibling columns when one flex column stops", async () => {
    const sourceRoot = document.createElement("div");
    const pagesRoot = document.createElement("div");
    const segment = document.createElement("div");
    const body = document.createElement("div");
    const columns = document.createElement("section");
    const left = document.createElement("div");
    const right = document.createElement("div");

    segment.setAttribute("data-paged-react-segment-source", "");
    segment.setAttribute("data-paged-react-page-width", "100px");
    segment.setAttribute("data-paged-react-page-height", "100px");
    body.setAttribute("data-paged-react-body-source", "");
    columns.style.display = "flex";

    for (const [column, prefix] of [
      [left, "Left"],
      [right, "Right"],
    ] as const) {
      for (const index of [1, 2]) {
        const item = document.createElement("p");
        item.setAttribute("data-test-height", "60");
        item.style.breakInside = "avoid";
        item.textContent = `${prefix} ${index}`;
        column.append(item);
      }
    }

    columns.append(left, right);
    body.append(columns);
    segment.append(body);
    sourceRoot.append(segment);
    document.body.append(sourceRoot, pagesRoot);

    const pages = await paginateDocument({ sourceRoot, pagesRoot });

    expect(pages).toHaveLength(2);
    expect(pages[0].textContent).toBe("Left 1Right 1");
    expect(pages[1].textContent).toBe("Left 2Right 2");
  });

  it("continues to the next grid column when a column runs past the page", async () => {
    const sourceRoot = document.createElement("div");
    const pagesRoot = document.createElement("div");
    const segment = document.createElement("div");
    const body = document.createElement("div");
    const grid = document.createElement("section");
    const left = document.createElement("div");
    const right = document.createElement("div");

    segment.setAttribute("data-paged-react-segment-source", "");
    segment.setAttribute("data-paged-react-page-width", "100px");
    segment.setAttribute("data-paged-react-page-height", "100px");
    body.setAttribute("data-paged-react-body-source", "");
    grid.style.display = "grid";

    const item = (text: string, height: number) => {
      const element = document.createElement("p");
      element.setAttribute("data-test-height", String(height));
      element.style.breakInside = "avoid";
      element.textContent = text;
      return element;
    };
    // An empty spacer crossing the page end puts "Left 3" entirely below the page window, so the
    // left column's walk ends early; the right column still has to fill this page.
    const spacer = document.createElement("div");
    spacer.setAttribute("data-test-height", "20");

    left.append(item("Left 1", 60), item("Left 2", 30), spacer, item("Left 3", 60));
    right.append(item("Right 1", 60), item("Right 2", 60));
    grid.append(left, right);
    body.append(grid);
    segment.append(body);
    sourceRoot.append(segment);
    document.body.append(sourceRoot, pagesRoot);

    const pages = await paginateDocument({ sourceRoot, pagesRoot });

    expect(pages).toHaveLength(2);
    expect(pages[0].textContent).toBe("Left 1Left 2Right 1");
    expect(pages[1].textContent).toBe("Left 3Right 2");
  });

  it("moves a break-after: avoid heading to the next page with the block it introduces", async () => {
    const sourceRoot = document.createElement("div");
    const pagesRoot = document.createElement("div");
    const segment = document.createElement("div");
    const body = document.createElement("div");

    segment.setAttribute("data-paged-react-segment-source", "");
    segment.setAttribute("data-paged-react-page-width", "100px");
    segment.setAttribute("data-paged-react-page-height", "100px");
    body.setAttribute("data-paged-react-body-source", "");

    const block = (tag: string, text: string, height: number) => {
      const element = document.createElement(tag);
      element.setAttribute("data-test-height", String(height));
      element.style.breakInside = "avoid";
      element.textContent = text;
      return element;
    };
    const heading = block("h2", "Heading", 20);
    heading.style.breakAfter = "avoid";

    body.append(block("p", "Intro", 70), heading, block("p", "Body", 50));
    segment.append(body);
    sourceRoot.append(segment);
    document.body.append(sourceRoot, pagesRoot);

    const pages = await paginateDocument({ sourceRoot, pagesRoot });

    expect(pages).toHaveLength(2);
    expect(pages[0].textContent).toBe("Intro");
    expect(pages[1].textContent).toBe("HeadingBody");
  });

  it("splits a break-inside: avoid block taller than a page on a fresh page instead of clipping it", async () => {
    const sourceRoot = document.createElement("div");
    const pagesRoot = document.createElement("div");
    const segment = document.createElement("div");
    const body = document.createElement("div");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    segment.setAttribute("data-paged-react-segment-source", "");
    segment.setAttribute("data-paged-react-page-width", "100px");
    segment.setAttribute("data-paged-react-page-height", "100px");
    body.setAttribute("data-paged-react-body-source", "");

    const block = (text: string, height: number) => {
      const element = document.createElement("p");
      element.setAttribute("data-test-height", String(height));
      element.style.breakInside = "avoid";
      element.textContent = text;
      return element;
    };
    const keep = document.createElement("div");
    keep.style.breakInside = "avoid";
    keep.append(block("One", 50), block("Two", 50), block("Three", 50));

    body.append(block("Intro", 30), keep);
    segment.append(body);
    sourceRoot.append(segment);
    document.body.append(sourceRoot, pagesRoot);

    const pages = await paginateDocument({ sourceRoot, pagesRoot });

    expect(errorSpy).not.toHaveBeenCalled();
    expect(pages.map((page) => page.textContent)).toEqual(["Intro", "OneTwo", "Three"]);
  });

  it("places an empty element only on the page where it fits", async () => {
    const sourceRoot = document.createElement("div");
    const pagesRoot = document.createElement("div");
    const segment = document.createElement("div");
    const body = document.createElement("div");
    const intro = document.createElement("p");
    const spacer = document.createElement("div");

    segment.setAttribute("data-paged-react-segment-source", "");
    segment.setAttribute("data-paged-react-page-width", "100px");
    segment.setAttribute("data-paged-react-page-height", "100px");
    body.setAttribute("data-paged-react-body-source", "");
    intro.setAttribute("data-test-height", "90");
    intro.style.breakInside = "avoid";
    intro.textContent = "Intro";
    // Crosses the end of the first page: it belongs on the second page only.
    spacer.className = "spacer";
    spacer.setAttribute("data-test-height", "30");

    body.append(intro, spacer);
    segment.append(body);
    sourceRoot.append(segment);
    document.body.append(sourceRoot, pagesRoot);

    const pages = await paginateDocument({ sourceRoot, pagesRoot });

    expect(pages).toHaveLength(2);
    expect(pages.map((page) => page.querySelectorAll(".spacer").length)).toEqual([0, 1]);
  });

  it("paginates children rendered through display contents wrappers", async () => {
    const sourceRoot = document.createElement("div");
    const pagesRoot = document.createElement("div");
    const segment = document.createElement("div");
    const body = document.createElement("div");
    const wrapper = document.createElement("div");
    const first = document.createElement("p");
    const second = document.createElement("p");
    const third = document.createElement("p");

    segment.setAttribute("data-paged-react-segment-source", "");
    segment.setAttribute("data-paged-react-page-width", "100px");
    segment.setAttribute("data-paged-react-page-height", "100px");
    body.setAttribute("data-paged-react-body-source", "");
    body.setAttribute("data-test-page-height", "100");
    wrapper.style.display = "contents";
    first.setAttribute("data-test-height", "45");
    first.setAttribute("data-test-generated-height", "55");
    first.style.breakInside = "avoid";
    first.textContent = "First";
    second.setAttribute("data-test-height", "45");
    second.setAttribute("data-test-generated-height", "55");
    second.style.breakInside = "avoid";
    second.textContent = "Second";
    third.setAttribute("data-test-height", "45");
    third.setAttribute("data-test-generated-height", "55");
    third.style.breakInside = "avoid";
    third.textContent = "Third";
    wrapper.append(first, second, third);
    body.append(wrapper);
    segment.append(body);
    sourceRoot.append(segment);
    document.body.append(sourceRoot, pagesRoot);

    const pages = await paginateDocument({ sourceRoot, pagesRoot });

    expect(pages).toHaveLength(3);
    expect(pages[0].textContent).toBe("First");
    expect(pages[1].textContent).toBe("Second");
    expect(pages[2].textContent).toBe("Third");
  });

  it("clones segment watermarks while creating each page", async () => {
    const sourceRoot = document.createElement("div");
    const pagesRoot = document.createElement("div");
    const segment = document.createElement("div");
    const body = document.createElement("div");
    const first = document.createElement("p");
    const second = document.createElement("p");
    const watermark = document.createElement("div");
    const secondSegment = document.createElement("div");
    const secondBody = document.createElement("div");
    const secondWatermark = document.createElement("div");

    segment.setAttribute("data-paged-react-segment-source", "");
    segment.setAttribute("data-paged-react-page-width", "100px");
    segment.setAttribute("data-paged-react-page-height", "50px");
    body.setAttribute("data-paged-react-body-source", "");
    first.setAttribute("data-test-height", "30");
    second.setAttribute("data-test-height", "30");
    watermark.setAttribute("data-paged-react-watermark-source", "");
    watermark.textContent = "Draft";
    secondSegment.setAttribute("data-paged-react-segment-source", "");
    secondSegment.setAttribute("data-paged-react-page-width", "100px");
    secondSegment.setAttribute("data-paged-react-page-height", "50px");
    secondBody.setAttribute("data-paged-react-body-source", "");
    secondWatermark.setAttribute("data-paged-react-watermark-source", "");
    secondWatermark.textContent = "Final";
    body.append(first, second);
    segment.append(body, watermark);
    secondSegment.append(secondBody, secondWatermark);
    sourceRoot.append(segment, secondSegment);
    document.body.append(sourceRoot, pagesRoot);

    const pages = await paginateDocument({ sourceRoot, pagesRoot });

    expect(pages).toHaveLength(3);
    expect(pagesRoot.style.getPropertyValue("--paged-react-total-pages")).toBe("3");
    expect(pages[0].querySelector("[data-paged-react-watermark-source]")?.textContent).toBe("Draft");
    expect(pages[1].querySelector("[data-paged-react-watermark-source]")?.textContent).toBe("Draft");
    expect(pages[2].querySelector("[data-paged-react-watermark-source]")?.textContent).toBe("Final");
  });
});
