import { forwardRef } from "react";
import { createPageSizeStyle } from "../utils/page-size.js";
import type {
  DocumentBodyProps,
  DocumentFooterProps,
  DocumentHeaderProps,
  DocumentProps,
  DocumentSegmentProps,
  StyleWithPageVars,
} from "../types.js";

type DocumentComponent = ReturnType<typeof forwardRef<HTMLDivElement, DocumentProps>> & {
  Segment: typeof DocumentSegment;
  Header: typeof DocumentHeader;
  Body: typeof DocumentBody;
  Footer: typeof DocumentFooter;
};

export const DocumentSegment = forwardRef<HTMLDivElement, DocumentSegmentProps>(
  function DocumentSegment({ children, pageSize, style, ...props }, ref) {
    const pageStyle = createPageSizeStyle(
      pageSize,
      style as StyleWithPageVars | undefined,
    );

    return (
      <div
        {...props}
        ref={ref}
        data-paged-react-segment=""
        style={pageStyle}
      >
        {children}
      </div>
    );
  },
);

export const DocumentHeader = forwardRef<HTMLDivElement, DocumentHeaderProps>(
  function DocumentHeader({ children, ...props }, ref) {
    return (
      <div {...props} ref={ref} data-paged-react-header="">
        {children}
      </div>
    );
  },
);

export const DocumentBody = forwardRef<HTMLDivElement, DocumentBodyProps>(
  function DocumentBody({ children, ...props }, ref) {
    return (
      <div {...props} ref={ref} data-paged-react-body="">
        {children}
      </div>
    );
  },
);

export const DocumentFooter = forwardRef<HTMLDivElement, DocumentFooterProps>(
  function DocumentFooter({ children, ...props }, ref) {
    return (
      <div {...props} ref={ref} data-paged-react-footer="">
        {children}
      </div>
    );
  },
);

const DocumentRoot = forwardRef<HTMLDivElement, DocumentProps>(
  function Document({ children, pageSize, style, ...props }, ref) {
    const pageStyle = createPageSizeStyle(
      pageSize,
      style as StyleWithPageVars | undefined,
    );

    return (
      <div {...props} ref={ref} data-paged-react-document="" style={pageStyle}>
        {children}
      </div>
    );
  },
);

export const Document = Object.assign(DocumentRoot, {
  Segment: DocumentSegment,
  Header: DocumentHeader,
  Body: DocumentBody,
  Footer: DocumentFooter,
}) as DocumentComponent;
