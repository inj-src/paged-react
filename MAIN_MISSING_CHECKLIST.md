# Missing From `main`

## 1. Pagination engine

1. [x] `packages/paged-react/src/core/paginate.ts`
2. [x] Wait for fonts, images, and layout readiness before paginating.
3. [x] Support `break-before`, `break-after`, and legacy `page-break-*` rules.
4. [x] Support `break-inside: avoid` and `page-break-inside: avoid`.
5. [x] Support explicit `data-paged-react-page-break` markers.
6. [x] Split overflowing nested content recursively.
7. [x] Split long text nodes across pages.
8. [ ] Handle oversized blocks and mark oversized pages.
9. [ ] Paginate tables row by row.
10. [ ] Repeat table headers when enabled.
11. [ ] Track page numbers and segment indexes on generated pages.

## 2. Component API

2. [*] Add `repeatTableHeader` support on `Document.Segment`.

4. [x] `packages/paged-react/src/types.ts`
5. [x] Add `StyleWithPageVars`.

6. [x] `packages/paged-react/src/utils/page-size.ts`
7. [x] Accept the typed page-size style shape.

## 3. Tests

1. [ ] `packages/paged-react/tests/paginate.test.ts`
2. [x] Cover page breaks.
3. [ ] Cover legacy CSS break rules.
4. [ ] Cover oversized `break-inside: avoid` blocks.
5. [ ] Cover repeated headers and footers.
6. [ ] Cover table splitting.
7. [x] Cover long text splitting.
8. [ ] Cover nested layout splitting.
