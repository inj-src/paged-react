import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { paginateDocument } from "../src/core/paginate.js";

function createBlock(size: number, text: string): HTMLDivElement {
  const block = document.createElement("div");
  block.setAttribute("data-test-size", String(size));
  block.textContent = text;
  return block;
}

function createTable(rowSizes: number[]): HTMLTableElement {
  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  const headerCell = document.createElement("th");
  const tbody = document.createElement("tbody");

  headerRow.setAttribute("data-test-size", "20");
  headerCell.textContent = "Quarter";
  headerRow.append(headerCell);
  thead.append(headerRow);

  for (const [index, size] of rowSizes.entries()) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");

    row.setAttribute("data-test-size", String(size));
    cell.textContent = `Row ${index + 1}`;
    row.append(cell);
    tbody.append(row);
  }

  table.append(thead, tbody);
  return table;
}

function sumTestSize(root: Element): number {
  const selfSize = Number(root.getAttribute("data-test-size") ?? "0");
  return selfSize + Array.from(root.children).reduce<number>((sum, child) => {
    return sum + sumTestSize(child);
  }, 0);
}

function createSegment(options?: { repeatTableHeader?: boolean }): {
  sourceRoot: HTMLDivElement;
  pagesRoot: HTMLDivElement;
  header: HTMLDivElement;
  body: HTMLDivElement;
  footer: HTMLDivElement;
};
function createSegment(options: { repeatTableHeader?: boolean } = {}): {
  sourceRoot: HTMLDivElement;
  pagesRoot: HTMLDivElement;
  header: HTMLDivElement;
  body: HTMLDivElement;
  footer: HTMLDivElement;
} {
  const sourceRoot = document.createElement("div");
  const pagesRoot = document.createElement("div");
  const segment = document.createElement("div");
  const header = document.createElement("div");
  const body = document.createElement("div");
  const footer = document.createElement("div");

  segment.setAttribute("data-paged-react-segment", "");
  if (options.repeatTableHeader) {
    segment.setAttribute("data-paged-react-repeat-table-header", "true");
  }
  header.setAttribute("data-paged-react-header", "");
  body.setAttribute("data-paged-react-body", "");
  footer.setAttribute("data-paged-react-footer", "");

  header.textContent = "Header";
  footer.textContent = "Footer";

  segment.append(header, body, footer);
  sourceRoot.append(segment);

  return { sourceRoot, pagesRoot, header, body, footer };
}

describe("paginateDocument", () => {
  const originalClientHeight = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    "clientHeight",
  );
  const originalScrollHeight = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    "scrollHeight",
  );

  beforeEach(() => {
    vi.stubGlobal(
      "requestAnimationFrame",
      ((cb: FrameRequestCallback) => {
        cb(0);
        return 1;
      }) as typeof requestAnimationFrame,
    );

    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: { ready: Promise.resolve() },
    });

    Object.defineProperty(HTMLElement.prototype, "clientHeight", {
      configurable: true,
      get() {
        if (this.hasAttribute("data-paged-react-page-body")) {
          return 100;
        }
        return originalClientHeight?.get?.call(this) ?? 0;
      },
    });

    Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
      configurable: true,
      get() {
        if (this.hasAttribute("data-paged-react-page-body")) {
          return Array.from(this.children as HTMLCollectionOf<Element>).reduce<number>(
            (sum, child) => {
            return sum + sumTestSize(child);
            },
            0,
          );
        }
        return originalScrollHeight?.get?.call(this) ?? 0;
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = "";

    if (originalClientHeight) {
      Object.defineProperty(HTMLElement.prototype, "clientHeight", originalClientHeight);
    }

    if (originalScrollHeight) {
      Object.defineProperty(HTMLElement.prototype, "scrollHeight", originalScrollHeight);
    }
  });

  it("creates a new page for PageBreak markers", async () => {
    const { sourceRoot, pagesRoot, body } = createSegment();
    body.append(createBlock(40, "First"));

    const marker = document.createElement("div");
    marker.setAttribute("data-paged-react-page-break", "");
    body.append(marker, createBlock(40, "Second"));

    await paginateDocument({
      sourceRoot,
      pagesRoot,
      pageSize: { width: "210mm", height: "297mm" },
    });

    const pages = pagesRoot.querySelectorAll("[data-paged-react-page]");
    expect(pages).toHaveLength(2);
    expect(pages[0]?.querySelector("[data-paged-react-page-body]")?.textContent).toContain(
      "First",
    );
    expect(pages[1]?.querySelector("[data-paged-react-page-body]")?.textContent).toContain(
      "Second",
    );
  });

  it("honors legacy CSS break rules", async () => {
    const { sourceRoot, pagesRoot, body } = createSegment();
    body.append(createBlock(40, "Alpha"));

    const breakBefore = createBlock(40, "Beta");
    breakBefore.style.pageBreakBefore = "always";
    body.append(breakBefore);

    await paginateDocument({
      sourceRoot,
      pagesRoot,
      pageSize: { width: "210mm", height: "297mm" },
    });

    const pages = pagesRoot.querySelectorAll("[data-paged-react-page]");
    expect(pages).toHaveLength(2);
    expect(pages[0]?.querySelector("[data-paged-react-page-body]")?.textContent).toContain(
      "Alpha",
    );
    expect(pages[1]?.querySelector("[data-paged-react-page-body]")?.textContent).toContain(
      "Beta",
    );
  });

  it("keeps an oversized block on the current empty page and marks it", async () => {
    const { sourceRoot, pagesRoot, body } = createSegment();
    const oversized = createBlock(150, "Oversized");
    oversized.style.pageBreakInside = "avoid";
    body.append(oversized);

    await paginateDocument({
      sourceRoot,
      pagesRoot,
      pageSize: { width: "210mm", height: "297mm" },
    });

    const pages = pagesRoot.querySelectorAll("[data-paged-react-page]");
    expect(pages).toHaveLength(1);
    expect(pages[0]?.getAttribute("data-paged-react-oversized")).toBe("true");
    expect(pages[0]?.getAttribute("data-paged-react-break-inside-avoid")).toBe("true");
  });

  it("clones per-segment header and footer content", async () => {
    const { sourceRoot, pagesRoot, header, body, footer } = createSegment();
    header.textContent = "Segment Header";
    footer.textContent = "Segment Footer";
    body.append(createBlock(60, "First page"), createBlock(60, "Second page"));

    await paginateDocument({
      sourceRoot,
      pagesRoot,
      pageSize: { width: "210mm", height: "297mm" },
    });

    const pages = pagesRoot.querySelectorAll("[data-paged-react-page]");
    expect(pages).toHaveLength(2);
    expect(
      pages[0]?.querySelector("[data-paged-react-page-header]")?.textContent,
    ).toContain("Segment Header");
    expect(
      pages[1]?.querySelector("[data-paged-react-page-footer]")?.textContent,
    ).toContain("Segment Footer");
    expect(pages[0]?.getAttribute("data-paged-react-segment-index")).toBe("0");
  });

  it("splits table rows across pages and repeats thead when enabled", async () => {
    const { sourceRoot, pagesRoot, body } = createSegment({ repeatTableHeader: true });
    body.append(createBlock(20, "Intro"), createTable([35, 35, 35, 35]));

    await paginateDocument({
      sourceRoot,
      pagesRoot,
      pageSize: { width: "210mm", height: "297mm" },
    });

    const pages = Array.from(pagesRoot.querySelectorAll("[data-paged-react-page]"));
    expect(pages).toHaveLength(3);
    expect(pages[0]?.querySelectorAll("thead")).toHaveLength(1);
    expect(pages[1]?.querySelectorAll("thead")).toHaveLength(1);
    expect(pages[2]?.querySelectorAll("thead")).toHaveLength(1);
    expect(pages[0]?.textContent).toContain("Row 1");
    expect(pages[1]?.textContent).toContain("Row 2");
    expect(pages[2]?.textContent).toContain("Row 4");
  });

  it("splits table rows without repeating thead when disabled", async () => {
    const { sourceRoot, pagesRoot, body } = createSegment();
    body.append(createTable([45, 45, 45]));

    await paginateDocument({
      sourceRoot,
      pagesRoot,
      pageSize: { width: "210mm", height: "297mm" },
    });

    const pages = Array.from(pagesRoot.querySelectorAll("[data-paged-react-page]"));
    expect(pages).toHaveLength(2);
    expect(pages[0]?.querySelectorAll("thead")).toHaveLength(1);
    expect(pages[1]?.querySelectorAll("thead")).toHaveLength(0);
  });
});
