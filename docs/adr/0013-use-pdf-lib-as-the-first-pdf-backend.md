# Use pdf-lib as the First PDF Backend

The first direct PDF writer will target `pdf-lib` behind an internal adapter. `pdf-lib` fits the browser-first, geometry-driven writer boundary by creating PDF bytes from positioned text, images, vector paths, and embedded fonts without introducing a second layout engine; the IR will not depend on `pdf-lib` types so the backend can be replaced later.
