export function canBreakElement(element: Element, maxHeight = Number.POSITIVE_INFINITY): boolean {
  const view = element.ownerDocument.defaultView;
  if (!view) {
    return false;
  }

  if (!(element instanceof view.HTMLElement)) {
    return false;
  }

  const tagName = element.tagName.toUpperCase();

  if (
    ["SVG", "IMG", "CANVAS", "VIDEO", "IFRAME", "OBJECT", "EMBED", "INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(
      tagName,
    )
  ) {
    return false;
  }

  const computedStyle = view.getComputedStyle(element);

  const avoidBreak = ["avoid", "avoid-page", "avoid-column"].includes(computedStyle.breakInside);
  const legacyAvoidBreak = computedStyle.pageBreakInside === "avoid";
  if ([avoidBreak, legacyAvoidBreak].some(Boolean) && element.getBoundingClientRect().height <= maxHeight) {
    return false;
  }

  return true;
}
