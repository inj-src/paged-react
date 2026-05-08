# paged-react

React components for building print-ready documents with automatic pagination.

## Status

This package is currently scaffolded for the initial pagination engine work.

## Basic Shape

```tsx
import { Document, PageBreak, pageSizes } from "paged-react";
import "paged-react/styles.css";

export function Report() {
  return (
    <Document pageSize={pageSizes.A4} pruneSourceAfterPagination>
      <Document.Segment className="p-[20mm]">
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

`Document` keeps its source tree hidden for pagination measurement. If your document is static after render, set `pruneSourceAfterPagination` to unmount the source tree after pagination completes.
