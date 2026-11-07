# Fix: endless empty pages from a box taller than the page

Change: `packages/paged-react/src/core/paginate.ts` (11 lines added, 2 removed). Found with version 0.2.5.

## Symptom

A document whose body holds a fixed-height box slightly taller than the page body never stops paginating. Page count grows by about 9 per second, pages are empty or hold one fragment each, `afterPaginate` never runs, and the console repeats:

```
Paged React: unbreakable element exceeds one page and will be clipped.
```

A way to trigger it, from a real template: an A5 segment with 10mm margins (190mm of body) whose body is

```tsx
<div className="relative h-[190mm]">
  <section className="h-[95mm]">…first copy…</section>
  <div className="absolute top-1/2 …">cut line</div>
  <section className="h-[95mm]">…second copy…</section>
</div>
```

190mm renders as 718.1px while the measured page body is 716.1px, so the box is 2px too tall and has to be split.

## Cause

Two problems combine. Both were confirmed by logging each pass of `bodySegmenter`.

### 1. Splitting a fixed-height box can never pass the overflow check

A page slice clones each split ancestor with `cloneNode(false)`, which keeps its classes and so its fixed height. Every candidate slice containing the `h-[190mm]` clone therefore overflows the measurement body by the same 2px, whatever content it holds.

The correction loop answers overflow by shrinking `sliceMaxBodyHeight` by the overflow and slicing again. Here the overflow never shrinks, so the loop steps down 2px at a time until `sliceMaxBodyHeight <= 0` and breaks with the last, smallest candidate. With a negative height nothing fits, so the only thing placed is the first unbreakable element, forced on through the "will be clipped" path. Each page ends up holding one fragment (logged slice heights: 70, 68, 66 … -1.875).

### 2. A text split that moves nothing still counts as progress

Fixed-height boxes don't shrink as their children leave, so `bodyHeight <= maxBodyHeight` never becomes true and the loop keeps slicing. Once the fragments run out, the slice window lands on table-cell text that doesn't fit. The text branch of `bodySlice` splits it into lines, finds that no line fits, and still queues

```ts
mutations.push(() => target.replaceWith(remaining));
```

with `remaining` holding every line: the text is replaced by an identical copy. The outer loop only stops when a pass queues no mutations, so this no-op keeps it going. Every later pass is an empty page with 4 of these replacements (one per `<td>`), forever.

## Fix

### Text split: only replace text that actually moved

```ts
// Replacing text with all of its own lines changes nothing, so the page would repeat forever.
if (remaining.childNodes.length < lines.length) {
  mutations.push(() => target.replaceWith(remaining));
}
```

This stops the endless loop: a pass that cannot move anything queues no mutation, and the existing `if (!mutations.length) return;` ends pagination.

### Correction loop: fall back to the fullest slice

The first candidate of each pass, sliced at the full page height, is kept. If shrinking reaches zero without clearing the overflow, that candidate is used instead of the smallest one:

```ts
let fullestSlice: { mutations: Array<() => void>; pageSlice: HTMLElement } | undefined;
…
fullestSlice ??= { mutations, pageSlice };
…
sliceMaxBodyHeight -= correction;
// Shrinking never cleared the overflow, e.g. a fixed-height box taller than the page.
if (sliceMaxBodyHeight <= 0) {
  ({ mutations, pageSlice } = fullestSlice);
  break;
}
```

Candidates are computed against the unchanged body (mutations run only after `yield`), so the first one is still valid. The fallback only applies when correction failed completely, which before produced near-empty slices. Documents whose overflow does shrink take the same path as before.

## Results

Rendered in Chromium with the hospital app's templates, comparing published 0.2.5 against this change:

| Document | Before | After |
| --- | --- | --- |
| Two-copy ticket with the 190mm box | Endless; 38+ pages after 5s; `afterPaginate` never runs | 2 pages: both copies complete on page 1; `afterPaginate` runs |
| Ordinary templates (1, 2, 1, 3 and 3 pages) | — | Same page counts, no clipping warnings |

With the 190mm box, all text still appears once per copy, so nothing is dropped. `check-types`, `lint`, the package tests (9) and the web app tests (3) pass.

## Known leftovers

- **An empty last page.** After the content is placed, the emptied fixed-height box is still taller than the page and is yielded once more as an empty page.
- **Console noise.** Each "will be clipped" warning fires during the correction loop's discarded candidates too, so the broken document logs it about 36 times.
- **The input itself.** Both leftovers only appear with a box taller than the page. Keeping fixed heights a millimetre or two under the page body avoids all of this.
