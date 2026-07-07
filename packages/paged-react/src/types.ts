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

export type SlotProps = ComponentPropsWithoutRef<"div">;

export type DocumentProps = SlotProps & {
  children: ReactNode;
  doNotHideSource?: boolean;
  paginate?: boolean;
  afterPaginate?: () => void;
};

export type DocumentSegmentProps = SlotProps & {
  children: ReactNode;
  pageSize: PageSize;
  repeatTableHeader?: boolean;
};

export type DocumentHeaderProps = SlotProps & {
  children: ReactNode;
};

export type DocumentBodyProps = SlotProps & {
  children: ReactNode;
};

export type DocumentFooterProps = SlotProps & {
  children: ReactNode;
};
