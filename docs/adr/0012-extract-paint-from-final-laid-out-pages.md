# Extract Paint from Final Laid-Out Pages

`PaintIR` will be extracted from the final DOM-preserving pages after pagination, page decoration, and required layout readiness have completed. This keeps PDF geometry aligned with visible HTML and avoids reusing speculative measurement fragments or clipping a single infinite-layout snapshot, at the cost of a deliberate extraction pass after page generation.
