import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { paginateDocument } from "../src/core/paginate.js";

function createSegment(): {
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
  header.setAttribute("data-paged-react-header", "");
  body.setAttribute("data-paged-react-body", "");
  footer.setAttribute("data-paged-react-footer", "");

  segment.append(header, body, footer);
  sourceRoot.append(segment);

  return { sourceRoot, pagesRoot, header, body, footer };
}

describe("paginateDocument starter", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "requestAnimationFrame",
      ((cb: FrameRequestCallback) => {
        cb(0);
        return 1;
      }) as typeof requestAnimationFrame,
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  it("renders one generated page for one source segment", async () => {
    const { sourceRoot, pagesRoot, header, body, footer } = createSegment();
    header.textContent = "Header";
    body.textContent = "Body";
    footer.textContent = "Footer";

    await paginateDocument({
      sourceRoot,
      pagesRoot,
      pageSize: { width: "210mm", height: "297mm" },
    });

    const page = pagesRoot.querySelector("[data-paged-react-page]");

    expect(pagesRoot.querySelectorAll("[data-paged-react-page]")).toHaveLength(1);
    expect(page?.getAttribute("data-page-number")).toBe("1");
    expect(page?.getAttribute("data-paged-react-segment-index")).toBe("0");
    expect(page?.querySelector("[data-paged-react-page-header]")?.textContent).toBe(
      "Header",
    );
    expect(page?.querySelector("[data-paged-react-page-body]")?.textContent).toBe("Body");
    expect(page?.querySelector("[data-paged-react-page-footer]")?.textContent).toBe(
      "Footer",
    );
  });

  it("clears previous generated pages before rendering", async () => {
    const { sourceRoot, pagesRoot, body } = createSegment();
    pagesRoot.appendChild(document.createElement("div"));
    body.textContent = "Fresh content";

    await paginateDocument({ sourceRoot, pagesRoot });

    expect(pagesRoot.children).toHaveLength(1);
    expect(pagesRoot.textContent).toContain("Fresh content");
  });

  it("does nothing when aborted before rendering", async () => {
    const { sourceRoot, pagesRoot } = createSegment();
    const controller = new AbortController();
    controller.abort();

    await paginateDocument({
      sourceRoot,
      pagesRoot,
      signal: controller.signal,
    });

    expect(pagesRoot.children).toHaveLength(0);
  });
});
