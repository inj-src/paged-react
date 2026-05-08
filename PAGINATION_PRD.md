# Paged React Pagination PRD

> Progress tracking key: `[ ]` not started, `[~]` in progress, `[x]` done, `[-]` deferred.

## 1. Goal

Build a React package (`paged-react`) that renders print-ready paginated documents from normal React content using slot-based composition:

- `Document`
- `Document.Segment`
- `Document.Header`
- `Document.Body`
- `Document.Footer`
- `PageBreak`

The engine must support automatic pagination, repeated headers/footers, page-size control, and page-margin behavior driven by normal CSS (`className` / `style`).

## 2. Success Criteria

- [ ] Users can render multi-page documents from long body content without manual page splitting.
- [ ] Headers and footers repeat on every generated page within a segment.
- [ ] Multiple segments with different page sizes and styles can coexist in one document.
- [ ] Hard page breaks work via `PageBreak` and CSS break properties.
- [ ] Pagination works in React 18 and 19 (`peerDependencies: >=18 <20`).
- [ ] A Vite app demonstrates behavior through scenario-based testing.
- [ ] Browser-level automated tests verify pagination behavior.

## 3. Scope

### 3.1 In Scope (MVP)

- [~] Slot-based pagination pipeline (source tree -> generated pages tree).
- [~] Hidden source DOM measurement and visible generated page DOM.
- [~] Segment-by-segment pagination.
- [~] Repeated header/footer cloning per page.
- [~] Body overflow detection loop (block-first algorithm).
- [x] `PageBreak` component.
- [x] CSS page-break detection (`break-before`, `break-after`, legacy `page-break-*`).
- [x] Deprecated `page-break-inside: avoid` fallback is recognized (`break-inside` parity path started).
- [x] Wait for fonts/images before layout.
- [ ] Basic resize/reflow trigger.
- [ ] Oversized element fallback on empty page.
- [ ] Debug attributes in generated DOM (`data-page-number`, segment index, oversized markers).

### 3.2 Out of Scope (Post-MVP)

- [-] Precise text-node splitting with line-level control.
- [-] Table row splitting and repeated table headers.
- [-] Widow/orphan control.
- [-] Footnotes/running strings/counter systems.
- [-] Full CSS Paged Media polyfill compatibility.
- [-] PDF export pipeline.
- [-] SSR pagination (browser-only pagination is acceptable for now).

## 4. API Contract

## 4.1 Public Components

- [~] `Document`
- [~] `Document.Segment`
- [~] `Document.Header`
- [~] `Document.Body`
- [~] `Document.Footer`
- [x] `PageBreak`

## 4.2 Page Size

- [~] `pageSize` on `Document` and `Document.Segment`.
- [~] Presets via `pageSizes`.
- [~] Custom size object `{ width, height }`.
- [ ] Validation of malformed page size values.

## 4.3 Styling Model

- [~] All slots accept regular `div` props (`className`, `style`, `id`, `data-*`, `aria-*`).
- [~] Page margins are represented through normal CSS (not custom margin props).
- [ ] Stable CSS variables and class hooks documented for consumer styling.

## 5. Engine Architecture

## 5.1 Render Topology

- [~] `Document` should host:
  - hidden source container (`data-paged-react-source`)
  - visible generated pages container (`data-paged-react-pages`)

## 5.2 Pipeline

- [~] Collect segments from source DOM.
- [~] For each segment:
  - resolve page size
  - read header/body/footer
  - build page shells
  - clone body blocks into pages until overflow
- [ ] Emit stable pagination metadata and stats callbacks.

## 5.3 Hard Break Rules

- [~] Break before if node is `PageBreak` marker.
- [~] Break before if computed style requires page break.
- [~] Break after if computed style requires page break.
- [ ] Conflict resolution and precedence docs (component break vs CSS break).

## 5.4 Reflow Strategy

- [ ] Reflow on mount.
- [ ] Reflow when children/page size change.
- [ ] Reflow on resize (debounced).
- [ ] Reflow after late image/font load.
- [ ] Optional manual reflow API for host apps.

## 6. Content Handling Matrix

## 6.1 Must Handle

- [ ] Paragraph-heavy content.
- [ ] Lists.
- [ ] Images as blocks.
- [ ] Standard sectioning containers.
- [ ] Explicit page-break markers.
- [ ] Mixed-size segments in one document.

## 6.2 Degrade Gracefully

- [ ] Oversized blocks that do not fit a single page body.
- [ ] Deeply nested layouts with unknown CSS.
- [ ] Long unbroken strings.
- [ ] Dynamic async content changes.

## 6.3 Later

- [-] Table row-level splitting.
- [-] Inline-level text splitting with precomputed metrics.
- [-] Keep-with-next and break-inside avoidance policies.

## 7. Reliability & Performance

- [ ] Avoid endless pagination loops.
- [ ] Avoid layout thrashing by batching reads/writes.
- [ ] Avoid stale cloned content across rerenders.
- [ ] Ensure deterministic order and page numbering.
- [ ] Measure large-document behavior (100+ pages scenario).

## 8. Vite Testing App Requirements

## 8.1 Lab UI

- [x] Scenario switcher.
- [ ] Page count readout.
- [x] Toggle for debug overlays.
- [ ] Clear display of source vs generated output modes.

## 8.2 Scenarios

- [x] Long article.
- [x] Forced breaks.
- [x] Multi-segment with distinct headers/footers.
- [ ] Mixed image/text.
- [x] Oversized block/table.
- [x] Different page sizes.

## 9. Automated Test Plan

## 9.1 Browser E2E (Playwright)

- [ ] Basic pagination creates multiple pages.
- [ ] Header/footer repeat on all generated pages.
- [ ] `PageBreak` forces new page.
- [ ] Segment boundaries preserve distinct templates.
- [ ] Oversized block does not crash or loop.
- [ ] Page count and numbering are stable after reflow.

## 9.2 Non-goal for MVP

- [-] JSDOM-based layout correctness tests.

## 10. Milestones

## M0 - Foundation

- [x] Package scaffold.
- [x] Slot components.
- [x] Page size presets.

## M1 - First Engine Pass

- [x] Hidden source + generated page containers.
- [~] Basic per-segment pagination loop.
- [x] `PageBreak` component.
- [x] Image/font readiness.
- [ ] Oversized fallback behavior.

## M2 - Vite Lab + E2E

- [ ] Scenario lab app.
- [ ] Playwright setup.
- [ ] Core end-to-end assertions.

## M3 - Hardening

- [ ] Reflow stability and performance passes.
- [ ] Edge-case cleanup.
- [ ] Consumer docs and migration notes.

## 11. Open Decisions

- [ ] Public callback API (`onPaginate`, diagnostics payload).
- [ ] Optional strict mode for invalid slot structures.
- [ ] Whether to expose lower-level hooks in v1.x.
- [ ] Rollout of text precision integration strategy.

## 12. Change Log

- 2026-05-08: PRD created and seeded with current implementation status.
- 2026-05-08: Added first pagination runtime pass, hidden source rendering, page generation container, hard-break support, and `PageBreak` component.
- 2026-05-08: Added Vite pagination lab scenarios and explicit legacy deprecated `page-break-before/after/inside` compatibility checks in implementation and demo.
