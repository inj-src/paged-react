import { pageSizes } from "../page-sizes.js";
import type { CSSProperties } from "react";
import type { PageSize, PageSizeValue } from "../types.js";

export function resolvePageSize(pageSize?: PageSize): PageSizeValue | undefined {
  if (!pageSize) {
    return undefined;
  }

  if (typeof pageSize === "string") {
    return pageSizes[pageSize];
  }

  return pageSize;
}

export function createPageSizeStyle(
  pageSize: PageSize | undefined,
  style: CSSProperties | undefined,
): CSSProperties | undefined {
  const resolved = resolvePageSize(pageSize);

  if (!resolved) {
    return style;
  }

  return {
    ...style,
    "--paged-react-page-width": resolved.width,
    "--paged-react-page-height": resolved.height,
  } as CSSProperties;
}
