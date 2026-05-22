import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { paginateDocument } from "../src/core/paginate";

describe("paginateDocument", () => {
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

    Object.defineProperty(HTMLImageElement.prototype, "complete", {
      configurable: true,
      get() {
        return true;
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.replaceChildren();
  });

  it("does not clone a consumed image onto the next page", async () => {
    const sourceRoot = document.createElement("div");
    const pagesRoot = document.createElement("div");
    const segment = document.createElement("div");
    const body = document.createElement("div");
    const intro = document.createElement("hr");
    const image = document.createElement("img");
    const tail = document.createElement("input");

    segment.setAttribute("data-paged-react-segment-source", "");
    segment.setAttribute("data-paged-react-page-width", "100px");
    segment.setAttribute("data-paged-react-page-height", "100px");
    body.setAttribute("data-paged-react-body-source", "");
    intro.dataset.block = "intro";
    image.alt = "Preview";
    image.dataset.block = "image";
    image.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
    tail.dataset.block = "tail";
    body.append(intro, image, tail);
    segment.append(body);
    sourceRoot.append(segment);

    document.body.append(sourceRoot, pagesRoot);

    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function () {
      if (this instanceof HTMLElement && this.style.height === "100px") {
        return { bottom: 100, height: 100, top: 0 } as DOMRect;
      }

      if (!(this instanceof HTMLElement)) {
        return { bottom: 0, height: 0, top: 0 } as DOMRect;
      }

      const block = this.dataset.block;
      let height = 60;

      if (block === "intro") {
        height = 20;
      }

      if (!block) {
        let bottom = 0;

        for (const child of Array.from(this.children)) {
          if (child instanceof HTMLElement) {
            let childHeight = 60;

            if (child.dataset.block === "intro") {
              childHeight = 20;
            }

            bottom += childHeight;
          }
        }

        return { bottom, height: bottom, top: 0 } as DOMRect;
      }

      let top = 0;

      if (this.parentElement) {
        for (const sibling of Array.from(this.parentElement.children)) {
          if (sibling === this) break;
          if (sibling instanceof HTMLElement) {
            let siblingHeight = 60;

            if (sibling.dataset.block === "intro") {
              siblingHeight = 20;
            }

            top += siblingHeight;
          }
        }
      }

      return { bottom: top + height, height, top } as DOMRect;
    });

    const pages = await paginateDocument({ sourceRoot, pagesRoot });

    expect(pages).toHaveLength(2);
    expect(pages[0].querySelectorAll("img")).toHaveLength(1);
    expect(pages[1].querySelectorAll("img")).toHaveLength(0);
  });
});
