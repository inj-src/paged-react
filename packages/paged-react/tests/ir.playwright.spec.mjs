import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { expect, test } from "playwright/test";

const fixture = `<!doctype html>
<html>
  <head>
    <script type="importmap">
      {"imports":{"pdf-lib":"/vendor/pdf-lib.js"}}
    </script>
    <style>
      * { box-sizing: border-box; }
      html, body { margin: 0; }
      [data-test-source] { position: absolute; left: -1000px; top: 0; }
      [data-test-pages] { margin-left: 300px; }
      .segment, [data-paged-react-page] {
        display: grid;
        grid-template-rows: 24px minmax(0, 1fr) 20px;
        width: 240px;
        height: 160px;
        overflow: hidden;
      }
      .header { background: rgb(220, 235, 255); }
      .header img { width: 8px; height: 8px; }
      .footer { border-top: 1px solid rgb(20, 20, 20); }
      .item { height: 40px; border: 1px solid rgb(20, 20, 20); }
    </style>
  </head>
  <body>
    <div data-test-source>
      <div class="segment" data-paged-react-segment-source data-paged-react-page-width="240px" data-paged-react-page-height="160px">
        <div class="header" data-paged-react-header-source><img alt="mark" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=">Header</div>
        <div data-paged-react-body-source>
          <article class="item" data-test-item="first" style="break-after: page">First item</article>
          <article class="item" data-test-item="second" style="break-inside: avoid">Second item</article>
          <article class="item" data-test-item="third">Third item</article>
        </div>
        <div class="footer" data-paged-react-footer-source>Footer</div>
      </div>
    </div>
    <div data-test-pages></div>
  </body>
</html>`;

let server;
let baseURL;

test.beforeAll(async () => {
  server = createServer(async (request, response) => {
    const requestUrl = request.url;
    if (requestUrl === undefined) {
      response.writeHead(400);
      response.end();
      return;
    }

    const pathname = new URL(requestUrl, "http://localhost").pathname;
    if (pathname === "/") {
      response.writeHead(200, { "content-type": "text/html" });
      response.end(fixture);
      return;
    }

    if (pathname === "/vendor/pdf-lib.js") {
      try {
        const file = await readFile(new URL("../node_modules/pdf-lib/dist/pdf-lib.esm.js", import.meta.url));
        response.writeHead(200, { "content-type": "application/javascript" });
        response.end(file);
      } catch {
        response.writeHead(404);
        response.end();
      }
      return;
    }

    if (!pathname.startsWith("/dist/")) {
      response.writeHead(404);
      response.end();
      return;
    }

    try {
      const file = await readFile(new URL(`../${pathname.slice(1)}`, import.meta.url));
      response.writeHead(200, { "content-type": "application/javascript" });
      response.end(file);
    } catch {
      response.writeHead(404);
      response.end();
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("The Playwright fixture server did not expose a TCP address.");
  }
  baseURL = `http://127.0.0.1:${address.port}`;
});

test.afterAll(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
});

test("extracts page-local IR from real browser layout", async ({ page }) => {
  await page.goto(baseURL);

  const result = await page.evaluate(async () => {
    const { paginateDocumentIR } = await import("/dist/core/paginate.js");
    const sourceRoot = document.querySelector("[data-test-source]");
    const pagesRoot = document.querySelector("[data-test-pages]");
    if (!(sourceRoot instanceof HTMLElement) || !(pagesRoot instanceof HTMLElement)) {
      throw new Error("The pagination fixture is incomplete.");
    }

    const paginated = await paginateDocumentIR({ sourceRoot, pagesRoot });
    const { exportPdf } = await import("/dist/export-pdf.js");
    const pdfBytes = await exportPdf({ sourceRoot, pagesRoot });
    const { PDFDocument } = await import("pdf-lib");
    const pdf = await PDFDocument.load(pdfBytes);
    const firstItem = sourceRoot.querySelector('[data-test-item="first"]');
    const secondItem = sourceRoot.querySelector('[data-test-item="second"]');
    if (!(firstItem instanceof HTMLElement) || !(secondItem instanceof HTMLElement)) {
      throw new Error("The break directive fixture is incomplete.");
    }
    firstItem.style.breakAfter = "";
    secondItem.style.breakBefore = "page";
    const beforePages = await paginateDocumentIR({ sourceRoot, pagesRoot });
    return {
      pageCount: paginated.pages.length,
      ir: paginated.ir,
      pageText: paginated.pages.map((item) => item.textContent),
      hasSourceMarker: paginated.pages.some((item) => item.hasAttribute("data-paged-react-ir-source-id")),
      pdfByteLength: pdfBytes.length,
      pdfPageCount: pdf.getPageCount(),
      pdfPageSize: [pdf.getPage(0).getWidth(), pdf.getPage(0).getHeight()],
      beforePageText: beforePages.pages.map((item) => item.textContent),
    };
  });

  expect(result.pageCount).toBe(2);
  expect(result.ir.pages).toHaveLength(2);
  expect(result.ir.pages[0].width).toBe(240);
  expect(result.ir.pages[0].height).toBe(160);
  expect(result.ir.pages.map((item) => item.segmentPageIndex)).toEqual([0, 1]);
  expect(result.pageText[0]).toContain("First item");
  expect(result.pageText[0]).not.toContain("Second item");
  expect(result.pageText[1]).toContain("Second item");
  expect(result.hasSourceMarker).toBe(false);
  expect(result.pdfByteLength).toBeGreaterThan(0);
  expect(result.pdfPageCount).toBe(2);
  expect(result.pdfPageSize).toEqual([180, 120]);
  expect(result.beforePageText[0]).toContain("First item");
  expect(result.beforePageText[0]).not.toContain("Second item");

  const headerFragments = result.ir.pages.flatMap((item) => item.fragments.filter((fragment) => fragment.kind === "header"));
  expect(headerFragments).toHaveLength(2);
  expect(headerFragments[0].sourceId).toBe(headerFragments[1].sourceId);
  expect(headerFragments.every((fragment) => fragment.repeated)).toBe(true);
  expect(headerFragments.map((fragment) => fragment.continuationIndex)).toEqual([0, 1]);
  expect(headerFragments.every((fragment) => fragment.continuationCount === 2)).toBe(true);

  const allFragments = result.ir.pages.flatMap((item) => item.fragments);
  const breakAfterPage = allFragments.find((fragment) => fragment.breakDirectives.after === "page");
  const breakInsideAvoid = allFragments.find((fragment) => fragment.breakDirectives.inside === "avoid");
  expect(breakAfterPage).toBeDefined();
  expect(breakInsideAvoid).toBeDefined();

  const paint = result.ir.pages.flatMap((item) => item.paint);
  const textPaint = paint.filter((node) => node.type === "text");
  expect(textPaint.some((node) => node.text.includes("Header"))).toBe(true);
  expect(textPaint.some((node) => node.text.includes("Second item"))).toBe(true);
  expect(textPaint.every((node) => node.sourceId.length > 0)).toBe(true);
  expect(textPaint.every((node) => node.sourceEnd > node.sourceStart)).toBe(true);
  expect(textPaint.every((node) => node.rect.width > 0 && node.rect.height > 0)).toBe(true);
  expect(paint.some((node) => node.type === "box" && node.style.backgroundColor === "rgb(220, 235, 255)")).toBe(true);
  expect(paint.some((node) => node.type === "image" && node.source.startsWith("data:image/png"))).toBe(true);
});

test("splits an oversized avoid block through its text descendant", async ({ page }) => {
  await page.goto(baseURL);

  const result = await page.evaluate(async () => {
    const { paginateDocument } = await import("/dist/core/paginate.js");
    const sourceRoot = document.querySelector("[data-test-source]");
    const pagesRoot = document.querySelector("[data-test-pages]");
    const body = document.querySelector("[data-paged-react-body-source]");
    if (!(sourceRoot instanceof HTMLElement) || !(pagesRoot instanceof HTMLElement) || !(body instanceof HTMLElement)) {
      throw new Error("The pagination fixture is incomplete.");
    }

    const block = document.createElement("div");
    block.style.breakInside = "avoid";
    block.textContent = Array.from({ length: 120 }, () => "oversized avoid text").join(" ");
    body.replaceChildren(block);

    const pages = await paginateDocument({ sourceRoot, pagesRoot });
    return {
      pageCount: pages.length,
      text: pages.map((page) => page.textContent),
    };
  });

  expect(result.pageCount).toBeGreaterThan(1);
  expect(result.text.join(" ")).toContain("oversized avoid text");
});
