import { useMemo, useState } from "react";
import { Document, PageBreak, pageSizes } from "paged-react";
import "paged-react/styles.css";

const PAGE_MARGIN_CLASS = "p-[18mm_16mm]";
const SHEET_CHROME_CLASS = "p-2 text-slate-600 text-xs text-center";

type ScenarioId =
  | "long-article"
  | "forced-breaks"
  | "legacy-breaks"
  | "break-inside-avoid"
  | "multi-segment";

function Paragraphs({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, idx) => (
        <p key={idx}>
          Section {idx + 1}. This paragraph is intentionally verbose to pressure pagination and
          verify body overflow handling across generated pages with normal document flow.
        </p>
      ))}
    </>
  );
}

function HeaderContent({ left, right }: { left: string; right?: string }) {
  return (
    <div className="flex justify-center items-center w-full text-center">
      <span>{left}</span>
      {right ? <span className="before:mx-1.5 before:content-['·']">{right}</span> : null}
    </div>
  );
}

function HeaderLine({ left, right }: { left: string; right?: string }) {
  return (
    <div className={SHEET_CHROME_CLASS}>
      <HeaderContent left={left} right={right} />
    </div>
  );
}

function FooterLine({ content }: { content: string }) {
  return <div className={SHEET_CHROME_CLASS}>{content}</div>;
}

function NaturalSheet({
  title,
  footer,
  rightTitle,
  body,
  className,
}: {
  title: string;
  footer: string;
  rightTitle?: string;
  body: React.ReactNode;
  className?: string;
}) {
  return (
    <article
      className={[
        "flex min-h-[297mm] w-[210mm] flex-col border border-slate-300 bg-white shadow-[0_6px_18px_rgba(15,23,42,0.12)]",
        className ?? "",
      ].join(" ")}
    >
      <div className={["flex min-h-full flex-col", PAGE_MARGIN_CLASS].join(" ")}>
        <header>
          <HeaderLine left={title} right={rightTitle} />
        </header>
        <section className="body grow sheet-body-typography">{body}</section>
        <footer>
          <FooterLine content={footer} />
        </footer>
      </div>
    </article>
  );
}

function ForcedBreakMarker() {
  return (
    <div
      className="my-4 px-3 py-2 border border-blue-300 border-dashed rounded text-slate-700 text-xs text-center"
      role="presentation"
      aria-hidden="true"
    >
      Manual flow marker for hard page break point
    </div>
  );
}

function PaginatedLongArticle() {
  return (
    <Document pageSize={pageSizes.A4} pruneSourceAfterPagination>
      <Document.Segment className={["bg-transparent", PAGE_MARGIN_CLASS].join(" ")}>
        <Document.Header>
          <HeaderLine left="Quarterly Report" right="Long Article" />
        </Document.Header>
        <Document.Body className="body sheet-body-typography">
          <h1>Long Article</h1>
          <Paragraphs count={30} />
        </Document.Body>
        <Document.Footer>
          <FooterLine content="Confidential Draft" />
        </Document.Footer>
      </Document.Segment>
    </Document>
  );
}

function NaturalLongArticle() {
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

function PaginatedForcedBreaks() {
  return (
    <Document pageSize={pageSizes.A4} pruneSourceAfterPagination>
      <Document.Segment className={["bg-transparent", PAGE_MARGIN_CLASS].join(" ")}>
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

function NaturalForcedBreaks() {
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

function PaginatedLegacyBreaks() {
  return (
    <Document pageSize={pageSizes.A4} pruneSourceAfterPagination>
      <Document.Segment className={["bg-transparent", PAGE_MARGIN_CLASS].join(" ")}>
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

function NaturalLegacyBreaks() {
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

function PaginatedBreakInsideAvoid() {
  return (
    <Document pageSize={pageSizes.A4} pruneSourceAfterPagination>
      <Document.Segment className={["bg-transparent", PAGE_MARGIN_CLASS].join(" ")}>
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

function NaturalBreakInsideAvoid() {
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

function PaginatedMultiSegment() {
  return (
    <Document pageSize={pageSizes.A4} pruneSourceAfterPagination>
      <Document.Segment className={["bg-transparent", PAGE_MARGIN_CLASS].join(" ")}>
        <Document.Header>
          <HeaderLine left="Segment A" />
        </Document.Header>
        <Document.Body className="body sheet-body-typography">
          <h1>A4 Segment</h1>
          <Paragraphs count={12} />
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
          <Paragraphs count={14} />
        </Document.Body>
        <Document.Footer>
          <FooterLine content="B Footer" />
        </Document.Footer>
      </Document.Segment>
    </Document>
  );
}

function NaturalMultiSegment() {
  return (
    <div className="flex flex-col gap-5">
      <NaturalSheet
        title="Segment A"
        footer="A Footer"
        body={
          <>
            <h1>A4 Segment</h1>
            <Paragraphs count={12} />
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
            <Paragraphs count={14} />
          </>
        }
      />
    </div>
  );
}

function App() {
  const [scenario, setScenario] = useState<ScenarioId>("long-article");

  const views = useMemo(() => {
    switch (scenario) {
      case "forced-breaks":
        return { natural: <NaturalForcedBreaks />, paginated: <PaginatedForcedBreaks /> };
      case "legacy-breaks":
        return { natural: <NaturalLegacyBreaks />, paginated: <PaginatedLegacyBreaks /> };
      case "break-inside-avoid":
        return {
          natural: <NaturalBreakInsideAvoid />,
          paginated: <PaginatedBreakInsideAvoid />,
        };
      case "multi-segment":
        return { natural: <NaturalMultiSegment />, paginated: <PaginatedMultiSegment /> };
      default:
        return { natural: <NaturalLongArticle />, paginated: <PaginatedLongArticle /> };
    }
  }, [scenario]);

  return (
    <main className="mx-auto p-6 min-h-screen text-slate-900">
      <header className="flex max-md:flex-col flex-wrap justify-between items-end max-md:items-start gap-4">
        <div className="title">
          <h1 className="m-0 mb-2 font-['Space_Grotesk','Avenir_Next',sans-serif] text-3xl leading-tight">
            Paged React Lab
          </h1>
          <p className="m-0 text-slate-600">Natural flow vs paginated flow comparison</p>
        </div>
        <div className="flex max-md:flex-col flex-wrap items-end max-md:items-start gap-3">
          <label className="flex flex-col gap-1.5 font-semibold text-xs uppercase tracking-[0.04em]">
            Scenario
            <select
              className="bg-slate-50 px-3 py-2 border border-slate-300 rounded-md max-md:w-full min-w-[260px] max-md:min-w-0 text-sm"
              value={scenario}
              onChange={(e) => setScenario(e.target.value as ScenarioId)}
            >
              <option value="long-article">Long Article</option>
              <option value="forced-breaks">Forced Breaks</option>
              <option value="legacy-breaks">Legacy page-break-* </option>
              <option value="break-inside-avoid">page-break-inside: avoid</option>
              <option value="multi-segment">Multi Segment</option>
            </select>
          </label>
        </div>
      </header>

      <section className="mt-5">
        <div className="flex max-md:flex-col gap-5">
          <div className="flex flex-col flex-1 gap-3 p-3.5 min-h-[60vh]">
            <h2 className="m-0 font-['Space_Grotesk','Avenir_Next',sans-serif] text-sm tracking-[0.02em]">
              Natural Flow (direct DOM)
            </h2>
            <div className="p-2 min-h-0">{views.natural}</div>
          </div>
          <div className="flex flex-col flex-1 gap-3 p-3.5 min-h-[60vh]">
            <h2 className="m-0 font-['Space_Grotesk','Avenir_Next',sans-serif] text-sm tracking-[0.02em]">
              Paginated Flow (package)
            </h2>
            <div className="p-2 min-h-0 paginated-sheet-theme">{views.paginated}</div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;
