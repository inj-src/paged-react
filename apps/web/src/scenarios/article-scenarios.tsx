import { Document, PageBreak, pageSizes } from "@repo/paged-react";
import {
  FooterLine,
  ForcedBreakMarker,
  HeaderLine,
  NaturalSheet,
  PAGE_MARGIN_CLASS,
  Paragraphs,
} from "./shared";

export function PaginatedLongArticle() {
  return (
    <Document pruneSourceAfterPagination>
      <Document.Segment pageSize={pageSizes.A4} className={[PAGE_MARGIN_CLASS].join(" ")}>
        <Document.Header>
          <HeaderLine left="Quarterly Report" right="Long Article" />
        </Document.Header>
        <Document.Body className="body sheet-body-typography">
          <h1>Long Article</h1>
          {/* <div className="bg-red-200 w-full h-212"></div> */}
          <Paragraphs count={30} />
        </Document.Body>
        <Document.Footer>
          <FooterLine content="Confidential Draft" />
        </Document.Footer>
      </Document.Segment>
    </Document>
  );
}

export function NaturalLongArticle() {
  return (
    <NaturalSheet
      title="Quarterly Report"
      rightTitle="Long Article"
      footer="Confidential Draft"
      body={
        <>
          <h1>Long Article</h1>
          <Paragraphs count={30} />
        </>
      }
    />
  );
}

export function PaginatedForcedBreaks() {
  return (
    <Document pruneSourceAfterPagination>
      <Document.Segment pageSize={pageSizes.A4} className={[PAGE_MARGIN_CLASS].join(" ")}>
        <Document.Header>
          <HeaderLine left="Forced Breaks" />
        </Document.Header>
        <Document.Body className="body sheet-body-typography">
          <h1>Start</h1>
          <Paragraphs count={8} />
          <PageBreak />
          <h2>After PageBreak Component</h2>
          <Paragraphs count={8} />
        </Document.Body>
        <Document.Footer>
          <FooterLine content="Page Footer" />
        </Document.Footer>
      </Document.Segment>
    </Document>
  );
}

export function NaturalForcedBreaks() {
  return (
    <NaturalSheet
      title="Forced Breaks"
      footer="Page Footer"
      body={
        <>
          <h1>Start</h1>
          <Paragraphs count={8} />
          <ForcedBreakMarker />
          <h2>After PageBreak Component</h2>
          <Paragraphs count={8} />
        </>
      }
    />
  );
}

export function PaginatedLegacyBreaks() {
  return (
    <Document pruneSourceAfterPagination>
      <Document.Segment pageSize={pageSizes.A4} className={[PAGE_MARGIN_CLASS].join(" ")}>
        <Document.Header>
          <HeaderLine left="Legacy Break Properties" />
        </Document.Header>
        <Document.Body className="body sheet-body-typography">
          <h1>Deprecated Properties Coverage</h1>
          <Paragraphs count={6} />
          <div style={{ pageBreakBefore: "always" as const }}>
            <h2>page-break-before: always</h2>
            <Paragraphs count={6} />
          </div>
          <div style={{ pageBreakAfter: "always" as const }}>
            <h2>page-break-after: always</h2>
            <Paragraphs count={4} />
          </div>
          <p>Trailing content to ensure post-break rendering is stable.</p>
        </Document.Body>
        <Document.Footer>
          <FooterLine content="Legacy CSS Test" />
        </Document.Footer>
      </Document.Segment>
    </Document>
  );
}

export function NaturalLegacyBreaks() {
  return (
    <NaturalSheet
      title="Legacy Break Properties"
      footer="Legacy CSS Test"
      body={
        <>
          <h1>Deprecated Properties Coverage</h1>
          <Paragraphs count={6} />
          <ForcedBreakMarker />
          <h2>page-break-before: always</h2>
          <Paragraphs count={6} />
          <h2>page-break-after: always</h2>
          <Paragraphs count={4} />
          <ForcedBreakMarker />
          <p>Trailing content to ensure post-break rendering is stable.</p>
        </>
      }
    />
  );
}

export function PaginatedBreakInsideAvoid() {
  return (
    <Document pruneSourceAfterPagination>
      <Document.Segment pageSize={pageSizes.A4} className={[PAGE_MARGIN_CLASS].join(" ")}>
        <Document.Header>
          <HeaderLine left="Break Inside Avoid" />
        </Document.Header>
        <Document.Body className="body sheet-body-typography">
          <h1>Avoid Inside Break</h1>
          <Paragraphs count={8} />
          <section
            className="my-4 p-3 border border-blue-300 rounded"
            style={{ pageBreakInside: "avoid" as const }}
          >
            <h2>Legacy page-break-inside: avoid</h2>
            <Paragraphs count={10} />
          </section>
          <Paragraphs count={10} />
        </Document.Body>
        <Document.Footer>
          <FooterLine content="Inside Avoid Test" />
        </Document.Footer>
      </Document.Segment>
    </Document>
  );
}

export function NaturalBreakInsideAvoid() {
  return (
    <NaturalSheet
      title="Break Inside Avoid"
      footer="Inside Avoid Test"
      body={
        <>
          <h1>Avoid Inside Break</h1>
          <Paragraphs count={5} />
          <section className="my-4 p-3 border border-blue-300 rounded">
            <h2>Legacy page-break-inside: avoid</h2>
            <Paragraphs count={10} />
          </section>
          <Paragraphs count={5} />
        </>
      }
    />
  );
}
