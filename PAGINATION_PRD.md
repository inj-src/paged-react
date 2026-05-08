# Paged React Pagination PRD

## 1. Already Done

- Package scaffold, slot components, and page size presets.
- `Document`, `Document.Segment`, `Document.Header`, `Document.Body`, `Document.Footer`.
- `PageBreak` component.
- Hidden source DOM and visible generated page DOM.
- Source DOM is hidden inline by default.
- Optional `pruneSourceAfterPagination`.
- Segment-by-segment pagination.
- Repeated header/footer cloning per generated page.
- Block-first body overflow pagination loop.
- Font/image readiness before layout.
- CSS break detection: `break-before`, `break-after`, `page-break-before`, `page-break-after`.
- `break-inside: avoid` / `page-break-inside: avoid` recognition.
- Generated debug attributes: page number, segment index, oversized marker.
- Demo scenarios: long article, forced breaks, multi-segment, different page sizes, oversized block/table.

## 2. Needs To Be Done

- Oversized element fallback behavior.
- Automated package tests for pagination behavior.
- Stable styling hook documentation.
- Conflict resolution docs for `PageBreak` vs CSS break rules.
- Mixed image/text scenario.

## 3. Later

- Table row-level splitting.
- Repeated table headers.
- Inline text splitting.
- Keep-with-next policy.
- Advanced `break-inside` avoidance policy.
- Deeply nested layout handling.
- Long unbroken string handling.

# 4. Scale

- 100+ page behavior/performance scenario.
- Meta data api etc
