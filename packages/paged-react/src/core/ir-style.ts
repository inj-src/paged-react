import type {
  BreakDirectiveValue,
  BreakDirectives,
  IRRect,
  PaintStyle,
} from "./ir-types.js";

export function readBreakDirectives(element: Element): BreakDirectives {
  const view = element.ownerDocument.defaultView;
  if (view === null) {
    return { before: "auto", after: "auto", inside: "auto" };
  }

  const style = view.getComputedStyle(element);
  return {
    before: normalizeBreak(style.breakBefore, style.pageBreakBefore),
    after: normalizeBreak(style.breakAfter, style.pageBreakAfter),
    inside: normalizeInsideBreak(style.breakInside, style.pageBreakInside),
  };
}

export function readPaintStyle(element: Element): PaintStyle {
  const view = element.ownerDocument.defaultView;
  if (view === null) {
    return {};
  }

  const computed = view.getComputedStyle(element);
  const style: PaintStyle = {};
  const properties: Array<Exclude<keyof PaintStyle, "opacity">> = [
    "color",
    "backgroundColor",
    "borderTopColor",
    "borderRightColor",
    "borderBottomColor",
    "borderLeftColor",
    "borderTopWidth",
    "borderRightWidth",
    "borderBottomWidth",
    "borderLeftWidth",
    "borderRadius",
    "fontFamily",
    "fontSize",
    "fontWeight",
    "fontStyle",
    "lineHeight",
    "letterSpacing",
    "textAlign",
    "overflow",
  ];

  for (const property of properties) {
    const value = computed[property];
    if (value.length > 0) {
      style[property] = value;
    }
  }

  const opacity = Number.parseFloat(computed.opacity);
  if (Number.isFinite(opacity)) {
    style.opacity = opacity;
  }

  return style;
}

export function hasVisibleBox(element: Element, style: PaintStyle): boolean {
  const view = element.ownerDocument.defaultView;
  if (view === null) {
    return false;
  }

  const computed = view.getComputedStyle(element);
  if (computed.display === "none" || computed.visibility === "hidden") {
    return false;
  }

  const opacity = style.opacity;
  if (opacity !== undefined && opacity <= 0) {
    return false;
  }

  const background = style.backgroundColor;
  if (background !== undefined && background !== "transparent" && background !== "rgba(0, 0, 0, 0)") {
    return true;
  }

  const borderWidths = [
    style.borderTopWidth,
    style.borderRightWidth,
    style.borderBottomWidth,
    style.borderLeftWidth,
  ];
  return borderWidths.some((value) => value !== undefined && Number.parseFloat(value) > 0);
}

export function getImageSource(element: Element): string | null {
  const source = element.getAttribute("src");
  if (source !== null && source.length > 0) {
    return source;
  }

  const view = element.ownerDocument.defaultView;
  if (view !== null && element instanceof view.HTMLImageElement && element.currentSrc.length > 0) {
    return element.currentSrc;
  }

  return null;
}

export function toPageRect(rect: DOMRect, pageRect: DOMRect): IRRect {
  return {
    x: rect.left - pageRect.left,
    y: rect.top - pageRect.top,
    width: rect.width,
    height: rect.height,
  };
}

export function readNumberAttribute(element: Element, name: string): number {
  const value = element.getAttribute(name);
  if (value === null) {
    return 0;
  }

  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) {
    return 0;
  }
  return number;
}

export function readDimension(value: number, styleValue: string): number {
  if (value > 0) {
    return value;
  }

  const parsed = Number.parseFloat(styleValue);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return parsed;
}

function normalizeBreak(modern: string, legacy: string): BreakDirectiveValue {
  if (modern === "page" || modern === "always") {
    return "page";
  }
  if (legacy === "always") {
    return "page";
  }
  return "auto";
}

function normalizeInsideBreak(modern: string, legacy: string): BreakDirectiveValue {
  if (modern === "avoid") {
    return "avoid";
  }
  if (legacy === "avoid") {
    return "avoid";
  }
  return "auto";
}
