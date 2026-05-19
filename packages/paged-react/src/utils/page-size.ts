import { pageSizes } from "../page-sizes.js";
import type { PageSize, PageSizeValue } from "../types.js";

export function resolvePageSize(pageSize: PageSize): PageSizeValue {
  if (typeof pageSize === "string") {
    return pageSizes[pageSize];
  }

  return pageSize;
}
