const MONOLITHIC_TAGS = [
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
];

/** Replaced content, form controls and non-HTML elements (SVG): they cannot be split at all. */
export function isMonolithic(element: Element): boolean {
  const view = element.ownerDocument.defaultView;
  if (!view || !(element instanceof view.HTMLElement)) {
    return true;
  }

  return MONOLITHIC_TAGS.includes(element.tagName.toUpperCase());
}

export function canBreakElement(element: Element): boolean {
  if (isMonolithic(element)) {
    return false;
  }

  const computedStyle = (element.ownerDocument.defaultView as Window).getComputedStyle(element);

  if (["avoid", "avoid-page", "avoid-column"].includes(computedStyle.breakInside)) {
    return false;
  }

  if (computedStyle.pageBreakInside === "avoid") {
    return false;
  }

  return true;
}
