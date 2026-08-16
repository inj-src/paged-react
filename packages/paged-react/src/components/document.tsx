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

export const DocumentSegment = forwardRef<HTMLDivElement, DocumentSegmentProps>(function DocumentSegment(
  { children, pageSize, pageMargins, repeatTableHeader, style, ...props },
  ref,
) {
  const resolvedPageSize = resolvePageSize(pageSize);
  const segmentStyle = { ...style };

  if (pageMargins) {
    Object.assign(segmentStyle, {
      "--paged-react-page-margin-top": pageMargins.top,
      "--paged-react-page-margin-right": pageMargins.right,
      "--paged-react-page-margin-bottom": pageMargins.bottom,
      "--paged-react-page-margin-left": pageMargins.left,
      boxSizing: "border-box",
      padding:
        "var(--paged-react-page-margin-top) var(--paged-react-page-margin-right) var(--paged-react-page-margin-bottom) var(--paged-react-page-margin-left)",
    });
  }

  return (
    <div
      {...props}
      ref={ref}
      data-paged-react-repeat-table-header={String(repeatTableHeader === true)}
      data-paged-react-page-height={resolvedPageSize.height}
      data-paged-react-page-width={resolvedPageSize.width}
      data-paged-react-segment-source=""
      style={{
        ...segmentStyle,
        minHeight: resolvedPageSize.height,
        width: resolvedPageSize.width,
      }}
    >
      {children}
    </div>
  );
});

export const DocumentHeader = forwardRef<HTMLDivElement, DocumentHeaderProps>(function DocumentHeader(
  { children, ...props },
  ref,
) {
  return (
    <div {...props} ref={ref} data-paged-react-header-source="">
      {children}
    </div>
  );
});

export const DocumentBody = forwardRef<HTMLDivElement, DocumentBodyProps>(function DocumentBody(
  { children, ...props },
  ref,
) {
  return (
    <div {...props} ref={ref} data-paged-react-body-source="">
      {children}
    </div>
  );
});

export const DocumentFooter = forwardRef<HTMLDivElement, DocumentFooterProps>(function DocumentFooter(
  { children, ...props },
  ref,
) {
  return (
    <div {...props} ref={ref} data-paged-react-footer-source="">
      {children}
    </div>
  );
});

const DocumentRoot = forwardRef<HTMLDivElement, DocumentProps>(function Document(
  { children, afterPaginate, paginate = true, doNotHideSource = false, ...props },
  ref,
) {
  const sourceRef = useRef<HTMLDivElement | null>(null);
  const pagesRef = useRef<HTMLDivElement | null>(null);

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
    if (!paginate) return;
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
    }).then(() => {
      if (abortController.signal.aborted) {
        return;
      }
      afterPaginate?.();
    });

    return () => {
      abortController.abort();
    };
  }, [children, paginate, afterPaginate]);

  return (
    <div style={{ display: "contents" }}>
      <div data-paged-react-pages ref={mergedRef} {...props} />
      <div data-paged-react-source data-paged-react-source-hidden={String(!doNotHideSource)} ref={sourceRef}>
        {children}
      </div>
    </div>
  );
});

export const Document = Object.assign(DocumentRoot, {
  Segment: DocumentSegment,
  Header: DocumentHeader,
  Body: DocumentBody,
  Footer: DocumentFooter,
}) as DocumentComponent;
