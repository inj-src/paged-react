import { Document, pageSizes, Watermark } from "paged-react";
import { NestedPrescriptionLayout } from "./nested-prescription-layout";
import {
  FooterLine,
  HeaderLine,
  MixedMediaLead,
  NaturalSheet,
  PAGE_MARGIN_CLASS,
  Paragraphs,
  RevenueTable,
} from "./shared";

export function PaginatedMultiSegment({
  contentRef,
}: {
  contentRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <Document ref={contentRef}>
      <Document.Segment
        pageSize={pageSizes.A4}
        className={["bg-transparent", PAGE_MARGIN_CLASS].join(" ")}
      >
        <Document.Header>
          <HeaderLine left="Segment A" />
        </Document.Header>
        <Document.Body className="body sheet-body-typography">
          <h1>A4 Segment</h1>
          <Paragraphs count={30} />
        </Document.Body>
        <Document.Footer>
          <FooterLine content="A Footer" />
        </Document.Footer>
      </Document.Segment>
      <Document.Segment
        pageSize={pageSizes.Letter}
        className={["bg-gradient-to-b from-white to-sky-50", PAGE_MARGIN_CLASS].join(" ")}
      >
        <Document.Header>
          <HeaderLine left="Segment B" />
        </Document.Header>
        <Document.Body className="body sheet-body-typography">
          <h1>Letter Segment</h1>
          <Paragraphs count={40} />
        </Document.Body>
        <Document.Footer>
          <FooterLine content="B Footer" />
        </Document.Footer>
      </Document.Segment>
    </Document>
  );
}

export function NaturalMultiSegment() {
  return (
    <div className="flex flex-col gap-5">
      <NaturalSheet
        title="Segment A"
        footer="A Footer"
        body={
          <>
            <h1>A4 Segment</h1>
            <Paragraphs count={30} />
          </>
        }
      />
      <NaturalSheet
        className="bg-gradient-to-b from-white to-sky-50"
        title="Segment B"
        footer="B Footer"
        body={
          <>
            <h1>Letter Segment</h1>
            <Paragraphs count={40} />
          </>
        }
      />
    </div>
  );
}

export function PaginatedMixedImageText({
  contentRef,
}: {
  contentRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <Document ref={contentRef}>
      <Document.Segment
        pageSize={pageSizes.A4}
        className={["bg-transparent", PAGE_MARGIN_CLASS].join(" ")}
      >
        <Document.Header>
          <HeaderLine left="Mixed Media" right="Image + Text" />
        </Document.Header>
        <Document.Body className="body sheet-body-typography">
          <h1>Mixed Image and Text</h1>
          <MixedMediaLead />
        </Document.Body>
        <Document.Footer>
          <FooterLine content="Media Layout Test" />
        </Document.Footer>
      </Document.Segment>
    </Document>
  );
}

export function NaturalMixedImageText() {
  return (
    <NaturalSheet
      title="Mixed Media"
      rightTitle="Image + Text"
      footer="Media Layout Test"
      body={
        <>
          <h1>Mixed Image and Text</h1>
          <MixedMediaLead />
        </>
      }
    />
  );
}

export function PaginatedTableRows({
  contentRef,
}: {
  contentRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <Document ref={contentRef}>
      <Document.Segment
        pageSize={pageSizes.A4}
        className={["bg-transparent", PAGE_MARGIN_CLASS].join(" ")}
        repeatTableHeader
      >
        <Document.Header>
          <HeaderLine left="Revenue Ledger" right="Table Rows" />
        </Document.Header>
        <Document.Body className="body sheet-body-typography">
          <h1>Table Rows Demo</h1>
          <p>
            This scenario validates row-level table splitting with repeated headers on generated
            pages.
          </p>
          <RevenueTable />
          <Paragraphs count={5} />
        </Document.Body>
        <Document.Footer>
          <FooterLine content="Table Row Pagination" />
        </Document.Footer>
      </Document.Segment>
    </Document>
  );
}

export function NaturalTableRows() {
  return (
    <NaturalSheet
      title="Revenue Ledger"
      rightTitle="Table Rows"
      footer="Table Row Pagination"
      body={
        <>
          <h1>Table Rows Demo</h1>
          <p>
            This scenario validates row-level table splitting with repeated headers on generated
            pages.
          </p>
          <RevenueTable />
          <Paragraphs count={5} />
        </>
      }
    />
  );
}

export function PaginatedNestedLayout({
  contentRef,
}: {
  contentRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <Document ref={contentRef} doNotHideSource>
      <Document.Segment
        pageSize={pageSizes.A4}
        className={["bg-transparent", PAGE_MARGIN_CLASS].join(" ")}
      >
        <Document.Header>
          <HeaderLine left="Prescription Layout" right="Nested Flow" />
        </Document.Header>
        <Document.Body className="body sheet-body-typography">
          <h1>Nested Layout Demo</h1>
          <p>
            This scenario stresses nested flex, list, and grid content that must continue inside the
            same section across pages.
          </p>
          <NestedPrescriptionLayout />
        </Document.Body>
        <Document.Footer>
          <Watermark>
            {({ pages, pageIndex }) => {
              return (
                <span className="text-slate-400 text-sm">
                  Page {pageIndex + 1} of {pages.length}
                </span>
              );
            }}
          </Watermark>
          <FooterLine content="Nested Layout Pagination" />
        </Document.Footer>
      </Document.Segment>
    </Document>
  );
}

export function NaturalNestedLayout() {
  return (
    <NaturalSheet
      title="Prescription Layout"
      rightTitle="Nested Flow"
      footer="Nested Layout Pagination"
      body={
        <>
          <h1>Nested Layout Demo</h1>
          <p>
            This scenario stresses nested flex, list, and grid content that must continue inside the
            same section across pages.
          </p>
          <NestedPrescriptionLayout />
        </>
      }
    />
  );
}
