import "./styles.css";

export { Document, DocumentBody, DocumentFooter, DocumentHeader, DocumentSegment } from "./components/document.js";
export { paginateDocument } from "./core/paginate.js";
export { exportPdf } from "./export-pdf.js";
export type { PdfWriterOptions } from "./export-pdf.js";
export { PageBreak } from "./components/page-break.js";
export { Watermark } from "./components/watermark.js";
export { pageSizes } from "./page-sizes.js";
export type {
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
