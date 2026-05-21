export function canBreakElement(element: Element): boolean {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  const tagName = element.tagName.toUpperCase();

  if (
    [
      "SVG",
      "IMG",
      "CANVAS",
      "VIDEO",
      "IFRAME",
      "OBJECT",
      "EMBED",
      "INPUT",
      "TEXTAREA",
      "SELECT",
      "BUTTON",
    ].includes(tagName)
  ) {
    return false;
  }

  const computedStyle = getComputedStyle(element);

  if (["avoid", "avoid-page", "avoid-column"].includes(computedStyle.breakInside)) {
    return false;
  }

  if (computedStyle.pageBreakInside === "avoid") {
    return false;
  }

  return true;
}
