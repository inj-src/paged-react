# paged-react

React components for building print-ready documents with automatic pagination.

> This is an early-stage project. Its public API is not stable yet and may change between releases.

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
    scale: 0.8,
  },
});
```

Runtime options override the corresponding `Document.Segment` values for that pagination run.
`scale` accepts a factor from `0.1` to `2`. Pagination runs against the scaled logical page
dimensions, then the generated content is painted onto the selected physical page size.

For React documents, pass the same factor to `Document`:

```tsx
<Document scale={0.8}>{children}</Document>
```

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
- `PageNumber`: renders the current page number.
- `TotalPages`: renders the total number of generated pages.
- `Watermark`: renders a watermark inside one document segment.
- `pageSizes`: built-in page sizes, including A-series, B4, B5, Letter, Legal, and Ledger.

Slots accept normal `div` props such as `className`, `style`, `id`, `data-*`, and `aria-*`.

## Watermark

Use `Watermark` as a direct child of `Document.Segment` for static page decoration. Its source markup is cloned as each page in that segment is created, so it is not rendered through a React portal.

```tsx
<Document>
  <Document.Segment pageSize={pageSizes.A4}>
    <Watermark>
      <div>Draft</div>
    </Watermark>

    <Document.Body>Report content</Document.Body>
  </Document.Segment>
</Document>
```

Use `PageNumber` and `TotalPages` anywhere in document content, including headers, footers, and watermarks. They render as spans and accept normal span props.

```tsx
<Document.Footer>
  Page <PageNumber /> of <TotalPages />
</Document.Footer>
```

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

Use `PageBreak` for an explicit new page. This is the supported way to force a page break.

`page-break-inside: avoid` is supported as a keep-together hint. Use it when a block should move to the next page instead of being split across pages.

`break-before`, `page-break-before`, `break-after`, and `page-break-after` are intentionally ignored. Use `PageBreak` so there is only one explicit way to force a new page.

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
