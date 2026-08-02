# Paged Document Rendering

This context defines the language for turning a React document into paginated output and sending that result to different writers.

## Language

**Paginated Document IR**:
A writer-neutral representation of a document after pagination. It contains linked structural fragments and page-local paint primitives, but does not contain DOM nodes.

**Fragment**:
A page-specific continuation of a source document structure, including its relationship to the source and its layout geometry.

**Paint Primitive**:
A page-local visual record such as text, a shape, an image, or a path, with the geometry and visual properties needed to reproduce it.

**Writer**:
An output backend that consumes the Paginated Document IR and produces a concrete document format such as HTML or PDF.

**Layout Authority**:
The constrained layout of a page fragment in the browser is the source of truth for CSS-dependent geometry. Pagination decides fragmentation and continuation around that layout; it does not replace browser layout with an independent layout engine.

**Compatibility Shell**:
The existing React components, public types, documented DOM hooks, and pagination entry point that remain stable while the pagination core and writers are replaced behind them.

**Parity Milestone**:
The first rebuild milestone in which the new IR and paginator produce compatible HTML page output and preserve current consumers before a direct PDF writer is added.

**Break Directive**:
A normalized pagination instruction attached to a fragment boundary, including explicit page breaks and the supported modern or legacy CSS before, after, and inside rules.

**Keep-Together Rule**:
The soft `break-inside: avoid` preference: keep a fragment intact when it fits on a page, but allow breakable descendants to continue when the fragment is taller than a page.

**Segment**:
An independent pagination context with its own page geometry, margins, repeated slots, and pagination settings. A document's segment pages are emitted in segment order as one global page sequence.

**Repeated Slot**:
A segment-owned header or footer fragment that participates in page geometry and is repeated on each page produced by that segment.

**Page Decoration**:
An out-of-flow visual layer rendered for individual pages from stable page metadata. It does not change pagination geometry and can be emitted by multiple writers.

**Internal IR Contract**:
The evolving structural and paint representation used between pagination and built-in writers. It is not part of the stable public package API until its DOM-free and serialization invariants are proven.

**DOM-Preserving Writer**:
A writer that emits the structural page fragments as real HTML elements, preserving the current document semantics and styling hooks. It is the first HTML output strategy; geometry-oriented writers consume the paint layer instead.

**Final Page Extraction**:
The creation of page-local paint primitives from the fully laid-out generated page DOM after pagination and asset readiness, rather than from an unpaginated source snapshot.

**PDF Backend**:
The library-specific adapter that lowers page-local paint primitives into PDF drawing operations. The first planned backend is `pdf-lib`; its layout and pagination facilities are not used as the document layout authority.
