# Use Browser-Constrained Reflow as Layout Authority

`paged-react` will use browser layout under page-sized constraints to resolve CSS-dependent fragment geometry, while the paginator owns fragmentation and continuation. This preserves the existing React/DOM/CSS contract and avoids building an independent layout engine; extracting one infinite layout and clipping it is rejected because it produces page-agnostic flex, table, and text behavior.

## Consequences

- Pagination remains dependent on browser layout, loaded fonts, and loaded assets.
- The PDF writer receives resolved geometry and does not perform layout.
- Arbitrary CSS cannot automatically be guaranteed by every non-HTML writer.
