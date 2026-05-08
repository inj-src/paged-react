import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { paginateDocument } from "../core/paginate.js";
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
  function DocumentSegment(
    { children, pageSize, repeatTableHeader = false, style, ...props },
    ref,
  ) {
    const pageStyle = createPageSizeStyle(
      pageSize,
      style as StyleWithPageVars | undefined,
    );

    return (
      <div
        {...props}
        ref={ref}
        data-paged-react-segment=""
        data-paged-react-repeat-table-header={repeatTableHeader ? "true" : undefined}
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
  function Document(
    { children, pageSize, pruneSourceAfterPagination = false, style, ...props },
    ref,
  ) {
    const rootRef = useRef<HTMLDivElement | null>(null);
    const sourceRef = useRef<HTMLDivElement | null>(null);
    const pagesRef = useRef<HTMLDivElement | null>(null);
    const [isSourceMounted, setIsSourceMounted] = useState(true);

    const mergedRef = useMemo(() => {
      return (node: HTMLDivElement | null) => {
        rootRef.current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      };
    }, [ref]);

    const pageStyle = createPageSizeStyle(
      pageSize,
      style as StyleWithPageVars | undefined,
    );

    useEffect(() => {
      if (!pruneSourceAfterPagination) {
        setIsSourceMounted(true);
        return;
      }

      setIsSourceMounted(true);
    }, [children, pageSize, pruneSourceAfterPagination]);

    useEffect(() => {
      const sourceRoot = sourceRef.current;
      const pagesRoot = pagesRef.current;

      if (!sourceRoot || !pagesRoot) {
        return;
      }

      let cancelled = false;
      const abortController = new AbortController();

      void paginateDocument({
        sourceRoot,
        pagesRoot,
        pageSize,
        signal: abortController.signal,
      }).then(() => {
        if (!cancelled && pruneSourceAfterPagination) {
          setIsSourceMounted(false);
        }
      });

      return () => {
        cancelled = true;
        abortController.abort();
      };
    }, [children, isSourceMounted, pageSize, pruneSourceAfterPagination]);

    return (
      <div
        {...props}
        ref={mergedRef}
        data-paged-react-document=""
        style={pageStyle}
      >
        {isSourceMounted ? (
          <div
            data-paged-react-source=""
            ref={sourceRef}
            style={{
              left: "-100000px",
              pointerEvents: "none",
              position: "absolute",
              top: 0,
              visibility: "hidden",
            }}
          >
            {children}
          </div>
        ) : null}
        <div data-paged-react-pages="" ref={pagesRef} />
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
