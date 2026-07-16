export function canBreakElement(element: Element): boolean {
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

  if (["avoid", "avoid-page", "avoid-column"].includes(computedStyle.breakInside)) {
    return false;
  }

  if (computedStyle.pageBreakInside === "avoid") {
    return false;
  }

  return true;
}
