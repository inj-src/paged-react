import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { paginateDocument } from "../core/paginate.js";
import { resolvePageSize } from "../utils/page-size.js";
import type {
  DocumentBodyProps,
  DocumentFooterProps,
  DocumentHeaderProps,
  DocumentProps,
  DocumentSegmentProps,
} from "../types.js";
import { context } from "./context.js";

type DocumentComponent = ReturnType<typeof forwardRef<HTMLDivElement, DocumentProps>> & {
  Segment: typeof DocumentSegment;
  Header: typeof DocumentHeader;
  Body: typeof DocumentBody;
  Footer: typeof DocumentFooter;
};

export const DocumentSegment = forwardRef<HTMLDivElement, DocumentSegmentProps>(
  function DocumentSegment({ children, pageSize, repeatTableHeader, style, ...props }, ref) {
    const resolvedPageSize = resolvePageSize(pageSize);

    return (
      <div
        {...props}
        ref={ref}
        data-paged-react-repeat-table-header={String(repeatTableHeader === true)}
        data-paged-react-page-height={resolvedPageSize.height}
        data-paged-react-page-width={resolvedPageSize.width}
        data-paged-react-segment-source=""
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
      <div {...props} ref={ref} data-paged-react-header-source="">
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
    <div {...props} ref={ref} data-paged-react-body-source="">
      {children}
    </div>
  );
});

export const DocumentFooter = forwardRef<HTMLDivElement, DocumentFooterProps>(
  function DocumentFooter({ children, ...props }, ref) {
    return (
      <div {...props} ref={ref} data-paged-react-footer-source="">
        {children}
      </div>
    );
  },
);

const DocumentRoot = forwardRef<HTMLDivElement, DocumentProps>(function Document(
  { children, pruneSource = true, ...props },
  ref,
) {
  const sourceRef = useRef<HTMLDivElement | null>(null);
  const pagesRef = useRef<HTMLDivElement | null>(null);
  const [pages, setPages] = useState<HTMLElement[] | null>(null);

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

    setPages(null);

    void paginateDocument({
      sourceRoot,
      pagesRoot,
      signal: abortController.signal,
      pruneSource,
    }).then((generatedPages) => {
      if (abortController.signal.aborted) {
        return;
      }

      setPages(generatedPages);
    });

    return () => {
      abortController.abort();
    };
  }, [children, pruneSource]);

  return (
    <context.Provider value={{ pages }}>
      <div data-paged-react-document-source="" style={{ display: "contents" }}>
        <div
          data-paged-react-root-source=""
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
    </context.Provider>
  );
});

export const Document = Object.assign(DocumentRoot, {
  Segment: DocumentSegment,
  Header: DocumentHeader,
  Body: DocumentBody,
  Footer: DocumentFooter,
}) as DocumentComponent;
