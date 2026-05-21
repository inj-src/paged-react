import { forwardRef, useEffect, useMemo, useRef } from "react";
import { paginateDocument } from "../core/paginate.js";
import { resolvePageSize } from "../utils/page-size.js";
import type {
  DocumentBodyProps,
  DocumentFooterProps,
  DocumentHeaderProps,
  DocumentProps,
  DocumentSegmentProps,
} from "../types.js";

type DocumentComponent = ReturnType<typeof forwardRef<HTMLDivElement, DocumentProps>> & {
  Segment: typeof DocumentSegment;
  Header: typeof DocumentHeader;
  Body: typeof DocumentBody;
  Footer: typeof DocumentFooter;
};

export const DocumentSegment = forwardRef<HTMLDivElement, DocumentSegmentProps>(
  function DocumentSegment({ children, pageSize, repeatTableHeader, style, ...props }, ref) {
    const resolvedPageSize = resolvePageSize(pageSize);
    void repeatTableHeader;

    return (
      <div
        {...props}
        ref={ref}
        data-paged-react-page-height={resolvedPageSize.height}
        data-paged-react-page-width={resolvedPageSize.width}
        data-paged-react-segment=""
        style={{
          ...style,
          minHeight: resolvedPageSize.height,
          width: resolvedPageSize.width,
        }}
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

export const DocumentBody = forwardRef<HTMLDivElement, DocumentBodyProps>(function DocumentBody(
  { children, ...props },
  ref,
) {
  return (
    <div {...props} ref={ref} data-paged-react-body="">
      {children}
    </div>
  );
});

export const DocumentFooter = forwardRef<HTMLDivElement, DocumentFooterProps>(
  function DocumentFooter({ children, ...props }, ref) {
    return (
      <div {...props} ref={ref} data-paged-react-footer="">
        {children}
      </div>
    );
  },
);

const DocumentRoot = forwardRef<HTMLDivElement, DocumentProps>(function Document(
  { children, pruneSourceAfterPagination, ...props },
  ref,
) {
  const sourceRef = useRef<HTMLDivElement | null>(null);
  const pagesRef = useRef<HTMLDivElement | null>(null);

  // TODO: implement source pruning after pagination
  void pruneSourceAfterPagination;

  const mergedRef = useMemo(() => {
    return (node: HTMLDivElement | null) => {
      pagesRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    };
  }, [ref]);

  useEffect(() => {
    const sourceRoot = sourceRef.current;
    const pagesRoot = pagesRef.current;

    if (!sourceRoot) {
      return;
    }

    if (!pagesRoot) {
      return;
    }

    const abortController = new AbortController();

    void paginateDocument({
      sourceRoot,
      pagesRoot,
      signal: abortController.signal,
    });

    return () => {
      abortController.abort();
    };
  }, [children]);

  return (
    <div data-paged-react-document="" style={{ display: "contents" }}>
      <div
        data-paged-react-source=""
        ref={sourceRef}
        style={{
          left: "-100000px",
          pointerEvents: "none",
          position: "absolute",
          visibility: "hidden",
          top: 0,
        }}
      >
        {children}
      </div>
      <div data-paged-react-pages="" ref={mergedRef} {...props} />
    </div>
  );
});

export const Document = Object.assign(DocumentRoot, {
  Segment: DocumentSegment,
  Header: DocumentHeader,
  Body: DocumentBody,
  Footer: DocumentFooter,
}) as DocumentComponent;
