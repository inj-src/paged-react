# paged-react

React components for building print-ready documents with automatic pagination.

## Status

This package is currently scaffolded for the initial pagination engine work.

## Basic Shape

```tsx
import { Document, pageSizes } from "paged-react";

export function Report() {
  return (
    <Document pageSize={pageSizes.A4}>
      <Document.Segment className="p-[20mm]">
        <Document.Header>
          <header>Quarterly Report</header>
        </Document.Header>

        <Document.Body>
          <article>{/* paginated content */}</article>
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
