# Separate Structural and Paint IR Layers

`paged-react` will use a writer-neutral Paginated Document IR with two linked layers: a structural fragment tree for continuation and layout geometry, and per-page paint primitives for resolved visual output. This is preferred over one blended node model because page-aware pagination needs structure while layout2vector-style writers need flat paint order; source IDs link the layers without coupling writers to DOM nodes or requiring a new layout engine.

## Consequences

- Pagination remains independent from HTML and PDF output.
- Different writers may use the structural and paint layers differently.
- The writer boundary must preserve enough resolved geometry and assets for non-HTML writers.
