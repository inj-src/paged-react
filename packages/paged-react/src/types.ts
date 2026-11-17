import type { ComponentPropsWithoutRef, ReactNode } from "react";

export type PageSizeName =
  | "A0"
  | "A1"
  | "A2"
  | "A3"
  | "A4"
  | "A5"
  | "A6"
  | "A7"
  | "A8"
  | "A9"
  | "A10"
  | "B4"
  | "B5"
  | "Letter"
  | "Legal"
  | "Ledger";

export type PageSizeValue = {
  width: string;
  height: string;
};

export type PageSize = PageSizeName | PageSizeValue;

export type PageMargins = {
  top: string;
  right: string;
  bottom: string;
  left: string;
};

export type PaginationOptions = {
  pageSize?: PageSize;
  pageMargins?: PageMargins;
  scale?: number;
};

export type PaginateDocumentContext = {
  sourceRoot: HTMLDivElement;
  pagesRoot: HTMLDivElement;
  signal?: AbortSignal;
  options?: PaginationOptions;
};

export type SlotProps = ComponentPropsWithoutRef<"div">;

export type DocumentProps = SlotProps & {
  children: ReactNode;
  doNotHideSource?: boolean;
  paginate?: boolean;
  scale?: number;
  afterPaginate?: () => void;
};

export type DocumentSegmentProps = SlotProps & {
  children: ReactNode;
  pageSize: PageSize;
  pageMargins?: PageMargins;
  /**
   * A table split across pages repeats its `<thead>` on every page, like Chrome. `true` also repeats
   * the first body row of a table without a `<thead>`; `false` shows the header on the first page only.
   */
  repeatTableHeader?: boolean;
  /**
   * A table split across pages repeats its `<tfoot>` at the bottom of every page, like Chrome. `true`
   * also repeats the last body row of a table without a `<tfoot>`; `false` shows the footer once, at
   * the end of the table.
   */
  repeatTableFooter?: boolean;
  /** The page number of this segment's first page; later segments continue from it. */
  pageNumberStart?: number;
  /**
   * Where header and footer sit. `"content"` (default): inside the page margins, right above and
   * below the body. `"margin"`: in the top and bottom margins from the page edge, like Chrome's print
   * headers; a band taller than its margin grows the margin.
   */
  bandPlacement?: "content" | "margin";
};

/** Pages a header or footer variant applies to; it overrides the default header or footer there. */
export type BandPages = "first" | "odd" | "even";

export type DocumentHeaderProps = SlotProps & {
  children?: ReactNode;
  /** Use this header only on the segment's first page, or on odd or even page numbers. */
  pages?: BandPages;
};

export type DocumentBodyProps = SlotProps & {
  children: ReactNode;
};

export type DocumentFooterProps = SlotProps & {
  children?: ReactNode;
  /** Use this footer only on the segment's first page, or on odd or even page numbers. */
  pages?: BandPages;
};
