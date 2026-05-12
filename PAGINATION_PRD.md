# Paged React Pagination PRD

## Phase 1 - Core Engine

- [x] Package scaffold, slot components, and page size presets.
- [x] `Document`, `Document.Segment`, `Document.Header`, `Document.Body`, `Document.Footer`.
- [x] `PageBreak` component.
- [x] Hidden source DOM and visible generated page DOM.
- [x] Source DOM is hidden inline by default.
- [x] Optional `pruneSourceAfterPagination`.
- [x] Segment-by-segment pagination.
- [x] Repeated header/footer cloning per generated page.
- [x] Block-first body overflow pagination loop.
- [x] Oversized element fallback behavior.
- [x] Font/image readiness before layout.
- [x] CSS break detection: `break-before`, `break-after`, `page-break-before`, `page-break-after`.
- [x] `break-inside: avoid` / `page-break-inside: avoid` recognition.
- [x] Generated debug attributes: page number, segment index, oversized marker.

## Phase 2 - Next

- [x] Automated package tests for pagination behavior.
- [x] Stable styling hook documentation.
- [x] Conflict resolution docs for `PageBreak` vs CSS break rules.
- [x] Mixed image/text scenario.

## Phase 3 - Later

- [x] Table row-level splitting.
- [x] Repeated table headers.
- [ ] Long unbroken string handling.
- [ ] Inline text splitting.
- [ ] Deeply nested layout handling.

## Phase 4 - Scale

- [ ] Keep-with-next policy.
- [ ] 100+ page behavior/performance scenario.
- [ ] Advanced `break-inside` avoidance policy.
- [ ] Metadata API.
