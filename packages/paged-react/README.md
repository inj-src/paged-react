# paged-react

React components for building print-ready documents with automatic pagination.

The examples below use the expected npm package name:

```sh
npm install paged-react
```

## Quick Start

Import the components and the package stylesheet once in your app.

```tsx
import { Document, PageBreak, pageSizes } from "paged-react";
import "paged-react/styles.css";
// The package imports its base CSS from the main entry.
// If your bundler does not load library CSS side effects,
// then import `paged-react/styles.css` manually.

export function Report() {
  return (
    <Document>
      <Document.Segment pageSize={pageSizes.A4} className="report-page">
        <Document.Header>
          <h1>Monthly Report</h1>
        </Document.Header>

        <Document.Body>
          <p>This content will be split into pages when it gets too long.</p>
          <PageBreak />
          <p>This starts on the next page.</p>
        </Document.Body>

        <Document.Footer>
          <span>Company footer</span>
        </Document.Footer>
      </Document.Segment>
    </Document>
  );
}
```

`Document.Segment` must receive a `pageSize`. Use a built-in size such as `pageSizes.A4`, `pageSizes.Letter`, or pass your own size object:

```tsx
<Document.Segment pageSize={{ width: "210mm", height: "297mm" }}>
  {/* header, body, and footer */}
</Document.Segment>
```

Set page content margins with `pageMargins`. Margins are applied before pagination, so page
breaks account for the reduced body area.

```tsx
<Document.Segment
  pageSize={pageSizes.A4}
  pageMargins={{ top: "10mm", right: "8mm", bottom: "10mm", left: "8mm" }}
>
  {/* header, body, and footer */}
</Document.Segment>
```

For an existing document DOM, call `paginateDocument` with runtime overrides. This is useful
for print previews that let users change paper size or margins after the React document has
rendered, including documents hosted in an iframe.

```ts
import { paginateDocument } from "paged-react";

await paginateDocument({
  sourceRoot,
  pagesRoot,
  options: {
    pageSize: { width: "148mm", height: "210mm" },
    pageMargins: {
      top: "5mm",
      right: "5mm",
      bottom: "5mm",
      left: "5mm",
    },
  },
});
```

Runtime options override the corresponding `Document.Segment` values for that pagination run.

## Printing

`paged-react` creates the paginated DOM. Use `react-to-print` to open the browser print dialog.

```tsx
import { useRef } from "react";
// npm i react-to-print
import { useReactToPrint } from "react-to-print";
import { Document, pageSizes } from "paged-react";
import "paged-react/styles.css";

export function PrintableReport() {
  const contentRef = useRef<HTMLDivElement>(null);
  const print = useReactToPrint({ contentRef });

  return (
    <>
      <button type="button" onClick={print}>
        Print
      </button>

      <Document ref={contentRef}>
        <Document.Segment pageSize={pageSizes.A4}>
          <Document.Header>Header</Document.Header>
          <Document.Body>Report content</Document.Body>
          <Document.Footer>Footer</Document.Footer>
        </Document.Segment>
      </Document>
    </>
  );
}
```

## Optional Screen Preview CSS

The package CSS handles the document structure. Add this optional CSS in your app to make pages look nicer on screen before printing:

```css
@media screen {
  [data-paged-react-pages] {
    gap: 24px;
  }

  [data-paged-react-page] {
    border: 1px solid gray;
  }
}
```

## Main Pieces

- `Document`: the root component. Attach your print ref here.
- `Document.Segment`: one paginated section with its own page size.
- `Document.Header`: repeated at the top of every generated page in the segment.
- `Document.Body`: the content that gets split across pages.
- `Document.Footer`: repeated at the bottom of every generated page in the segment.
- `PageBreak`: starts following content on a new page.
- `Watermark`: renders a watermark inside the document.
- `pageSizes`: built-in page sizes, including A-series, B4, B5, Letter, Legal, and Ledger.

Slots accept normal `div` props such as `className`, `style`, `id`, `data-*`, and `aria-*`.

## PDF export

`exportPdf` paginates the same browser layout and returns PDF bytes from the internal page IR:

```ts
import { exportPdf } from "paged-react";

const bytes = await exportPdf({ sourceRoot, pagesRoot });
const blob = new Blob([bytes], { type: "application/pdf" });
```

The first PDF writer supports page geometry, text, solid backgrounds, borders, and PNG/JPEG images. It uses standard PDF fonts, so custom font embedding and advanced CSS paint are future additions. PDF coordinates are derived from the final browser layout; the writer does not paginate independently.

## Watermark

Use `Watermark` inside `Document`. It receives a render function with the current zero-based `pageIndex` and the generated `pages` array. The `Watermark` component gets copied over and rendered to every-single page.

```tsx
<Document>
  <Document.Segment pageSize={pageSizes.A4}>
    <Document.Body>Report content</Document.Body>
  </Document.Segment>

  <Watermark>
    {({ pageIndex, pages }) => (
      <div>
        Draft - page {pageIndex + 1} of {pages.length}
      </div>
    )}
  </Watermark>
</Document>
```

The rendered watermark is portaled into each generated page.

## Tables

Direct child `<table>` elements inside `Document.Body` can be split by row when they overflow a page.

```tsx
<Document.Segment pageSize={pageSizes.A4} repeatTableHeader>
  <Document.Body>
    <table>{/* rows */}</table>
  </Document.Body>
</Document.Segment>
```

If a table has a `<thead>`, the first table fragment keeps that header even when `repeatTableHeader` is not set. Use `repeatTableHeader` on `Document.Segment` when continuation pages should also repeat the original `<thead>`.

## Page Breaks

Use `PageBreak` or the supported CSS break directives for an explicit new page.

`break-before: page`, `break-after: page`, and their `always` values are supported, as are the legacy `page-break-before: always` and `page-break-after: always` declarations. `break-inside: avoid` and `page-break-inside: avoid` are supported as keep-together hints. If an avoided block is taller than a page, its breakable descendants may still be split.

Recto/verso, named pages, columns, and widow/orphan controls are not part of this first supported subset.

## Limitations

- This is not a full browser print engine. It uses DOM measurement and cloning to build pages.
- Pagination runs in the browser, so output can vary slightly between browsers, fonts, zoom levels, and loaded assets.
- Very complex layouts can be difficult to split perfectly, especially grids, flex-heavy layouts, positioned elements, transforms, and deeply nested components.
- If an item cannot be broken down and does not fit in one page, it stays on a single generated page and is clipped.
- Tables are best supported when the table is a direct child of `Document.Body`.
- Images and custom fonts should be loaded before printing for the most reliable result.
- Server-side rendering cannot know final page breaks because pagination depends on browser layout measurement.

## Styling Hooks

- `[data-paged-react-document]`: root container
- `[data-paged-react-pages]`: generated pages wrapper
- `[data-paged-react-page]`: generated page
- `[data-paged-react-page-header]`: rendered header slot
- `[data-paged-react-page-body]`: rendered body slot
- `[data-paged-react-page-footer]`: rendered footer slot
