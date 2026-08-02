import { rgb, type RGB } from "pdf-lib";

export type ParsedPdfColor = {
  value: RGB;
  opacity: number;
};

export function parseCssColor(value: string | undefined): ParsedPdfColor | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "transparent") {
    return undefined;
  }

  if (normalized.startsWith("#")) {
    let hex = normalized.slice(1);
    if (hex.length === 3) {
      hex = hex
        .split("")
        .map((value) => `${value}${value}`)
        .join("");
    }
    if (![6, 8].includes(hex.length)) {
      return undefined;
    }

    const red = Number.parseInt(hex.slice(0, 2), 16);
    const green = Number.parseInt(hex.slice(2, 4), 16);
    const blue = Number.parseInt(hex.slice(4, 6), 16);
    if (![red, green, blue].every(Number.isFinite)) {
      return undefined;
    }

    let opacity = 1;
    if (hex.length === 8) {
      opacity = Number.parseInt(hex.slice(6, 8), 16) / 255;
    }
    return { value: rgb(red / 255, green / 255, blue / 255), opacity };
  }

  let body: string;
  let hasAlpha = false;
  if (normalized.startsWith("rgba(")) {
    body = normalized.slice(5, -1);
    hasAlpha = true;
  } else if (normalized.startsWith("rgb(")) {
    body = normalized.slice(4, -1);
  } else {
    return undefined;
  }

  const components = body.split(",").map((component) => Number.parseFloat(component.trim()));
  if (components.length < 3) {
    return undefined;
  }
  if (!components.slice(0, 3).every(Number.isFinite)) {
    return undefined;
  }
  const red = components[0];
  const green = components[1];
  const blue = components[2];
  if (red === undefined) {
    return undefined;
  }
  if (green === undefined) {
    return undefined;
  }
  if (blue === undefined) {
    return undefined;
  }

  let opacity = 1;
  if (hasAlpha) {
    const alpha = components[3];
    if (alpha === undefined || !Number.isFinite(alpha)) {
      return undefined;
    }
    opacity = Math.min(1, Math.max(0, alpha));
  }

  return {
    value: rgb(clampChannel(red) / 255, clampChannel(green) / 255, clampChannel(blue) / 255),
    opacity,
  };
}

function clampChannel(value: number): number {
  return Math.min(255, Math.max(0, value));
}
