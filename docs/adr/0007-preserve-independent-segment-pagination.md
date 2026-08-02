# Preserve Independent Segment Pagination

Each `Document.Segment` will remain an independent pagination context with its own page size, margins, header, footer, and table settings. The resulting pages will be concatenated in document order into one paginated document, carrying both segment-local identity and global page identity so HTML, Watermark, and future PDF writers retain the current multi-segment behavior.
