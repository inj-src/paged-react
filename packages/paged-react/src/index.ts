import "./styles.css";

export { Document, DocumentBody, DocumentFooter, DocumentHeader, DocumentSegment } from "./components/document.js";
export { paginateDocument } from "./core/paginate.js";
export { PageBreak } from "./components/page-break.js";
export { PageNumber, TargetPageNumber, TotalPages } from "./components/page-number.js";
export { Watermark } from "./components/watermark.js";
export { pageSizes } from "./page-sizes.js";
export type { PageNumberFormat } from "./core/page-number-format.js";
export type {
  BandPages,
  DocumentBodyProps,
  DocumentFooterProps,
  DocumentHeaderProps,
  DocumentProps,
  DocumentSegmentProps,
  PaginateDocumentContext,
  PageMargins,
  PageSize,
  PageSizeName,
  PageSizeValue,
  PaginationOptions,
  SlotProps,
} from "./types.js";
