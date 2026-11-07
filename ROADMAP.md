# Roadmap: advanced paged-media features

Features that print engines offer and paged-react does not yet, collected while comparing it with
[takumi-pdf](https://github.com/kane50613/takumi) and [Prince](https://www.princexml.com/doc/). Each
entry says what it is, who has it, and how it could fit paged-react's design (paginate in the
browser, then let the browser print).

Already done: orphans/widows, `break-*: avoid`, keep-together, repeated `<thead>`/`<tfoot>`,
rowspans across pages, page numbers as text with `format` and `pageNumberStart`,
`TargetPageNumber` for tables of contents, first/odd/even header and footer variants, and header
and footer placement in the margins (`bandPlacement="margin"`, growing the margin to fit).

## Pages and bands

- **Last-page header/footer** (takumi: `last`). Needs to know a page is the last before laying it
  out: lay out with the tallest band, as takumi does, or paginate again.
- **Start a segment on a right-hand page** (Prince: `break-before: right` / `recto`), inserting a
  blank page when needed; and a style hook for blank pages (`:blank`).
- **Page ranges**: render only some pages (takumi: `page_ranges`).

## Generated content

- **Running headers with the current chapter title** (Prince: `string-set` / `string()`,
  `position: running()`): a component like `<RunningText name="chapter" />` that the fill pass
  writes per page, from the last marked heading that started on or before that page.
- **Target text** (Prince: `target-text` / `target-content()`): the heading text of a link's
  target, for "see Chapter 3, *Results*" references.
- **Inherit `href` from an enclosing link** in `TargetPageNumber` (takumi does this).
- **Dot leaders** in tables of contents (Prince: `leader()`): mostly possible with flexbox today;
  worth a documented recipe or a small component.

## Tables

- **Repeat a table header or footer only when it is small** (takumi: at most a quarter of the page),
  so a tall `<thead>` does not fill every page.

## Notes and floats

These need space reserved while choosing where a page ends, which is where ranking break
candidates (instead of the current rule set) would pay off.

- **Footnotes** (Prince: `float: footnote`, `@footnote`, `::footnote-call`, `::footnote-marker`):
  a note written inline moves to the bottom of the page its marker lands on; the marker's line
  and its note must share a page, and long notes may continue on the next page. takumi does not
  have footnotes, so this would set paged-react apart.
- **Page floats** (Prince: `float: top` / `bottom`, `@page-float-top`): a figure moves to the top or
  bottom of the current page, or the next one, instead of leaving a gap where it did not fit.
- **Sidenotes / margin notes** (Prince: `@leftnote`, `@rightnote`, `@outsidenote`).

## Fragmentation

- **Content taller than a page that cannot break** (images, SVG) continues over the following
  pages instead of being clipped (takumi does this).
- **Multi-column layout across pages** (Prince columns); multi-column containers are currently not
  split by the ordered-flow optimizations.
- **`box-decoration-break: clone`**: split boxes are always sliced today, as Chrome does by default.
- **Break ranking**: record every break opportunity with an appeal (perfect, violates
  orphans/widows, violates avoid, last resort) and choose the best, as Blink and takumi do, instead
  of the current targeted rules. Worth it once the fixtures in the HTML-to-PDF benchmark show cases
  the rules cannot handle, or for footnotes and floats.

## Typography (Prince)

- Avoid hyphenating across a page break; balanced facing pages (`-prince-page-fill`); line-break
  optimization (`-prince-line-break-choices`). Mostly decided by the browser's line breaker, so
  only partly reachable from paged-react.

## Output (not reachable through the browser's print)

The browser writes the PDF, so these need a step after printing (for example a server-side
post-processor): PDF bookmarks from headings, document metadata, PDF/A, PDF/UA, PDF/X, encryption
and permissions, attachments (such as invoice XML), annotations, forms, page labels, crop and
bleed marks, CMYK and spot colors.
