export const SOURCE_ID_ATTRIBUTE = "data-paged-react-ir-source-id";

export type IRRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type BreakDirectiveValue = "auto" | "page" | "avoid";

export type BreakDirectives = {
  before: BreakDirectiveValue;
  after: BreakDirectiveValue;
  inside: BreakDirectiveValue;
};

export type FragmentKind = "segment" | "header" | "body" | "footer" | "element";

export type PaintStyle = {
  color?: string;
  backgroundColor?: string;
  borderTopColor?: string;
  borderRightColor?: string;
  borderBottomColor?: string;
  borderLeftColor?: string;
  borderTopWidth?: string;
  borderRightWidth?: string;
  borderBottomWidth?: string;
  borderLeftWidth?: string;
  borderRadius?: string;
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  fontStyle?: string;
  lineHeight?: string;
  letterSpacing?: string;
  textAlign?: string;
  opacity?: number;
  overflow?: string;
};

export type PaintNode =
  | {
      type: "box";
      sourceId: string;
      fragmentId: string;
      rect: IRRect;
      style: PaintStyle;
      zIndex: number;
    }
  | {
      type: "text";
      sourceId: string;
      fragmentId: string;
      rect: IRRect;
      text: string;
      sourceStart: number;
      sourceEnd: number;
      style: PaintStyle;
      zIndex: number;
    }
  | {
      type: "image";
      sourceId: string;
      fragmentId: string;
      rect: IRRect;
      source: string;
      style: PaintStyle;
      zIndex: number;
    };

export type FragmentIR = {
  id: string;
  sourceId: string;
  kind: FragmentKind;
  parentId: string | null;
  childIds: string[];
  rect: IRRect;
  breakDirectives: BreakDirectives;
  repeated: boolean;
  continuationIndex: number;
  continuationCount: number;
};

export type PageIR = {
  index: number;
  segmentIndex: number;
  segmentPageIndex: number;
  width: number;
  height: number;
  fragments: FragmentIR[];
  paint: PaintNode[];
};

export type PaginatedDocumentIR = {
  pages: PageIR[];
};
