# Pagination Engine Rewrite Plan

## Phase 1 - Basics

- [ ] Keep `paginateDocument(ctx)` as the public engine entry point.
- [ ] Clear `pagesRoot` before every pagination run.
- [ ] Respect `AbortSignal` before and after async layout readiness.
- [ ] Wait for `document.fonts.ready`.
- [ ] Wait for images inside the source tree to load or error.
- [ ] Wait one animation frame before measuring.
- [ ] Resolve default document page size.
- [ ] Resolve per-segment page size from CSS vars.
- [ ] Read only direct `[data-paged-react-segment]` children from source root.
- [ ] Read direct segment slots: header, body, footer.
- [ ] Emit one page for an empty body segment.
- [ ] Create generated page DOM with header, body, and footer regions.
- [ ] Set `data-paged-react-page`.
- [ ] Set sequential `data-page-number`.
- [ ] Set `data-paged-react-segment-index`.
- [ ] Set `--paged-react-page-width`.
- [ ] Set `--paged-react-page-height`.
- [ ] Clone header/footer children onto every generated page.
- [ ] Paginate body direct children in source order.
- [ ] Preserve source DOM; never move source nodes into generated pages.
- [ ] Add tests for empty segments.
- [ ] Add tests for multi-segment page numbering.
- [ ] Add tests for per-segment page sizes.
- [ ] Add tests for abort behavior.
- [ ] Add tests for font/image readiness.

## Phase 2 - Breaks And Stuff

- [ ] Support explicit `data-paged-react-page-break`.
- [ ] Support `break-before`.
- [ ] Support legacy `page-break-before`.
- [ ] Support `break-after`.
- [ ] Support legacy `page-break-after`.
- [ ] Support `break-inside: avoid`.
- [ ] Support legacy `page-break-inside: avoid`.
- [ ] Treat explicit `PageBreak` markers as hard breaks.
- [ ] Move an overflowing keep-together block to the next page when current page has content.
- [ ] Keep an overflowing keep-together block on an empty page.
- [ ] Mark oversized pages with `data-paged-react-oversized`.
- [ ] Mark oversized keep-together pages with `data-paged-react-break-inside-avoid`.
- [ ] Avoid generating avoidable empty pages around breaks.
- [ ] Preserve trailing content after break markers.
- [ ] Add tests for modern `break-before`.
- [ ] Add tests for modern and legacy `break-after`.
- [ ] Add tests for modern `break-inside: avoid`.
- [ ] Add tests for `PageBreak` precedence over CSS breaks.
- [ ] Add tests for oversized fallback after existing page content.

## Phase 3 - Tables And Complex Layouts

- [ ] Split direct-child tables by row.
- [ ] Preserve table `caption`.
- [ ] Preserve table `colgroup`.
- [ ] Keep original `thead` on the first table fragment.
- [ ] Repeat `thead` on continuation fragments only when the segment enables repeated headers.
- [ ] Do not repeat `thead` when repeated headers are disabled.
- [ ] Mark a page oversized when a single table row cannot fit.
- [ ] Fragment regular overflowing blocks recursively.
- [ ] Split nested element trees without moving the whole root block when children can fit.
- [ ] Respect `break-inside: avoid` inside nested fragmentation.
- [ ] Split text nodes across pages.
- [ ] Split text by grapheme-safe boundaries.
- [ ] Handle long unbroken strings.
- [ ] Use text measurement to estimate split points.
- [ ] Verify split points with DOM overflow checks.
- [ ] Prune empty cloned wrapper branches.
- [ ] Carry remainder fragments onto continuation pages.
- [ ] Preserve sibling order across fragments.
- [ ] Add tests for table `caption` and `colgroup` preservation.
- [ ] Add tests for first-row oversized table fallback.
- [ ] Add tests for nested `break-inside: avoid`.
- [ ] Add tests for inline text splitting inside nested elements.
- [ ] Add tests for long unbroken strings.
- [ ] Add tests for deeply nested flex/list/grid-like markup.
