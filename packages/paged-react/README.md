# @repo/paged-react

React components for building print-ready documents with automatic pagination.

## Basic Shape

```tsx
import { Document, PageBreak, pageSizes } from "@repo/paged-react";
import "@repo/paged-react/styles.css";

export function Report() {
  return (
    <Document>
      <Document.Segment pageSize={pageSizes.A4} className="p-[20mm]" repeatTableHeader>
        <Document.Header>
          <header>Quarterly Report</header>
        </Document.Header>

        <Document.Body>
          <article>{/* paginated content */}</article>
          <PageBreak />
          <article>{/* starts on new page */}</article>
        </Document.Body>

        <Document.Footer>
          <footer>Page footer</footer>
        </Document.Footer>
      </Document.Segment>
    </Document>
  );
}
```

Slots accept normal `div` props such as `className`, `style`, `id`, `data-*`, and `aria-*`.

`Document` keeps its source tree hidden for pagination measurement.

`Document.Segment` requires `pageSize`, so each segment owns its generated page dimensions.

`Document.Segment` also accepts `repeatTableHeader`. When enabled, paginated table fragments repeat the original `<thead>` on continuation pages.

## Styling Hooks

Import `@repo/paged-react/styles.css` once.

- `[data-paged-react-document]`: root container
- `[data-paged-react-pages]`: generated pages wrapper
- `[data-paged-react-page]`: generated page
- `[data-paged-react-page-header]`: rendered header slot
- `[data-paged-react-page-body]`: rendered body slot
- `[data-paged-react-page-footer]`: rendered footer slot

Consumer spacing such as page margins should be applied through normal CSS on your segment and slot content.

## Break Rules

- `PageBreak` always starts a new page before following content.
- `break-before` / `page-break-before` start a new page before the element.
- `break-after` / `page-break-after` start a new page after the element.
- If both `PageBreak` and CSS breaks are present, `PageBreak` wins because it is handled as an explicit marker in flow.
- `break-inside: avoid` and `page-break-inside: avoid` are recognized as keep-together hints for a block.

## Tables

- Direct child `<table>` elements inside `Document.Body` are split by row when they overflow a page.
- The first fragment keeps the original `<thead>`.
- Continuation fragments repeat `<thead>` only when `repeatTableHeader` is set on the owning `Document.Segment`.

## Text and Nested Layouts

- Long unbroken text can continue across pages inside text-bearing blocks.
- Nested block layouts are fragmented recursively instead of being moved only as one oversized root block.
- The fragmentation path is block-oriented. It can split nested elements and text nodes, but it is not a full browser print engine.

## Test Coverage

Current package tests cover:

- explicit `PageBreak`
- legacy CSS break rules
- oversized block fallback
- repeated header/footer cloning
- table row splitting with and without repeated headers
- long unbroken text splitting
- nested layout fragmentation
