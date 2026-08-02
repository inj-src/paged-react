# Keep Header and Footer as Repeated Flow Slots

For the first rebuild, `Document.Header` and `Document.Footer` will remain static repeated flow slots: their measured heights reduce each segment page's body area, and their content is repeated on every page in that segment. Page-varying decoration will use a separate future page-layer API; the existing `Watermark` remains a compatibility feature rather than the long-term model for all page decoration.
