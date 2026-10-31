const ranges = new WeakMap<Document, Range>();

/**
 * One reusable Range per document for geometry reads. Every live Range must be updated by the
 * browser on each DOM mutation until it is garbage collected, so creating one per measurement makes
 * the many removals pagination performs progressively slower.
 */
export function measureRange(document: Document): Range {
  let range = ranges.get(document);
  if (!range) {
    range = document.createRange();
    ranges.set(document, range);
  }
  return range;
}
