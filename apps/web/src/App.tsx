import { useMemo, useState } from "react";
import { Document, PageBreak, pageSizes } from "@repo/paged-react";
import "@repo/paged-react/styles.css";

const PAGE_MARGIN_CLASS = "p-[18mm_16mm]";
const SHEET_CHROME_CLASS = "p-2 text-slate-600 text-xs text-center";

type ScenarioId =
  | "long-article"
  | "forced-breaks"
  | "legacy-breaks"
  | "break-inside-avoid"
  | "multi-segment"
  | "mixed-image-text"
  | "table-rows"
  | "nested-layout";

const REPORT_IMAGE_SRC =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 720">
      <rect width="1200" height="720" fill="#e0f2fe"/>
      <rect x="80" y="90" width="1040" height="540" rx="28" fill="#0f172a"/>
      <rect x="140" y="150" width="420" height="220" rx="18" fill="#1d4ed8"/>
      <rect x="620" y="150" width="430" height="36" rx="18" fill="#f8fafc" fill-opacity="0.9"/>
      <rect x="620" y="210" width="360" height="24" rx="12" fill="#cbd5e1"/>
      <rect x="620" y="252" width="390" height="24" rx="12" fill="#cbd5e1"/>
      <rect x="620" y="294" width="320" height="24" rx="12" fill="#cbd5e1"/>
      <rect x="140" y="410" width="910" height="34" rx="17" fill="#22c55e" fill-opacity="0.85"/>
      <rect x="140" y="468" width="840" height="22" rx="11" fill="#94a3b8"/>
      <rect x="140" y="508" width="780" height="22" rx="11" fill="#94a3b8"/>
    </svg>
  `);

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

function MixedMediaLead() {
  return (
    <>
      <p>
        This scenario mixes a large illustrative asset with regular body copy to exercise image
        readiness and pagination order in the same segment.
      </p>
      <img
        alt="Report dashboard preview"
        className="my-4 border border-slate-300 rounded-md w-full h-auto"
        src={REPORT_IMAGE_SRC}
      />
      <p>
        The image should retain its place in flow and the following paragraphs should continue on
        the same page when space allows.
      </p>
      <Paragraphs count={10} />
    </>
  );
}

function RevenueTable() {
  const rows = [
    ["North", "$184,000", "12%"],
    ["South", "$163,000", "9%"],
    ["West", "$201,000", "15%"],
    ["Central", "$149,000", "7%"],
    ["Partner", "$131,000", "5%"],
    ["Online", "$228,000", "19%"],
    ["Renewal", "$121,000", "6%"],
    ["Expansion", "$173,000", "11%"],
    ["Education", "$117,000", "4%"],
    ["Public", "$143,000", "8%"],
    ["Health", "$136,000", "7%"],
    ["Finance", "$192,000", "13%"],
    ["Finance", "$192,000", "13%"],
    ["Finance", "$192,000", "13%"],
    ["Finance", "$192,000", "13%"],
    ["Finance", "$192,000", "13%"],
    ["Finance", "$192,000", "13%"],
    ["Finance", "$192,000", "13%"],
    ["Finance", "$192,000", "13%"],
    ["Finance", "$192,000", "13%"],
    ["Finance", "$192,000", "13%"],
    ["Finance", "$192,000", "13%"],
    ["Finance", "$192,000", "13%"],
    ["Finance", "$192,000", "13%"],
    ["Finance", "$192,000", "13%"],
    ["Finance", "$192,000", "13%"],
    ["Finance", "$192,000", "13%"],
    ["Finance", "$192,000", "13%"],
    ["Finance", "$192,000", "13%"],
  ];

  return (
    <table className="my-4 w-full text-sm border-collapse">
      <thead>
        <tr className="bg-slate-100 border-slate-300 border-b text-left">
          <th className="px-3 py-2 font-semibold">Channel</th>
          <th className="px-3 py-2 font-semibold">Revenue</th>
          <th className="px-3 py-2 font-semibold">Growth</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([channel, revenue, growth], index) => (
          <tr key={`${channel}-${index}`} className="border-slate-200 border-b align-top">
            <td className="px-3 py-2">{channel}</td>
            <td className="px-3 py-2">{revenue}</td>
            <td className="px-3 py-2">{growth}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function NestedPrescriptionLayout() {
  const diagnosisPoints = [
    "Per urethral discharge",
    "Ircy Papular irash",
    "HTN(-ve)",
    "DM (-ve)",
    "VDRL (Qualitative/Quantitative)",
    "TPHA (Qualitative/Quantitative)",
    "Anti HIV (1&2)",
    "HBsAg (Screening)",
    "Gonococcal Urethritis",
    "Scabies",
  ];

  const baseTreatmentSteps = [
    {
      name: "Inj. Rofecin 2 gm/vial",
      dose: "1 ampoule x 1 time",
      duration: "5 days",
      note: "Slow deep IM, for both partners.",
    },
    {
      name: "Cap. Doxy-A 100 mg",
      dose: "1 + 0 + 1",
      duration: "14 days",
      note: "After meals from day 7.",
    },
    {
      name: "Pernix Lotion",
      dose: "Whole bottle",
      duration: "1 night",
      note: "Apply neck down, wash after 8-12 hours.",
    },
    {
      name: "The Remidist Ketonaseal Shampoo",
      dose: "Topical",
      duration: "1 month",
      note: "Use during bath and leave for five minutes before rinse.",
    },
    {
      name: "Facid HC 2% / 1% Cream",
      dose: "Topical",
      duration: "1 month",
      note: "Apply twice daily to the affected region with a deliberatelyLongUnbrokenInstructionTokenThatNeedsToBreakAcrossThePageIfSpaceRunsOut.",
    },
  ];

  const treatmentSteps = Array.from({ length: 5 }, (_, cycleIndex) =>
    baseTreatmentSteps.map((step, stepIndex) => ({
      ...step,
      key: `${cycleIndex + 1}-${stepIndex + 1}-${step.name}`,
      name: cycleIndex === 0 ? step.name : `${step.name} Follow-up Cycle ${cycleIndex + 1}`,
      note:
        cycleIndex === 0
          ? step.note
          : `${step.note} Reassess tolerance, hydration status, symptom regression, and partner treatment adherence at the next review.`,
    })),
  ).flat();

  const adviceItems = Array.from({ length: 8 }, (_, index) => {
    const adviceLibrary = [
      "Do not substitute medicines without review.",
      "Contact the clinic before follow-up if symptoms change materially.",
      "Maintain the written dosing schedule and bring the sheet to the next visit.",
      "Avoid missed doses during the first two weeks of treatment.",
      "Use barrier protection until both partners complete the full regimen.",
      "Report new rash, fever, or severe gastric intolerance immediately.",
      "Increase oral fluids and avoid self-started additional antibiotics.",
      "Return with investigation reports and symptom notes for reassessment.",
    ];

    return adviceLibrary[index % adviceLibrary.length];
  });

  return (
    <section className="flex flex-1 gap-4" style={{ marginTop: "0.25in" }}>
      <ul className="flex flex-col gap-[4pt] min-w-0" style={{ width: "2in" }}>
        <li className="min-h-[1in]">
          <p className="font-semibold text-[11pt] text-gray-800 leading-[15pt]">C/C</p>
          <ul className="mt-0 mb-[6pt] pl-[24pt] w-full list-disc">
            {diagnosisPoints.slice(0, 2).map((point) => (
              <li key={point} className="font-medium text-[9.75pt]">
                {point}
              </li>
            ))}
          </ul>
        </li>
        <li className="min-h-[1in]">
          <p className="font-semibold text-[11pt] text-gray-800 leading-[15pt]">Findings</p>
          <ul className="mt-0 mb-[6pt] pl-[24pt] w-full list-disc">
            {diagnosisPoints.slice(2, 4).map((point) => (
              <li key={point} className="font-medium text-[9.75pt]">
                {point}
              </li>
            ))}
          </ul>
        </li>
        <li className="min-h-[1in]">
          <p className="font-semibold text-[11pt] text-gray-800 leading-[15pt]">Investigation</p>
          <ul className="mt-0 mb-[6pt] pl-[24pt] w-full list-disc">
            {diagnosisPoints.slice(4, 8).map((point) => (
              <li key={point} className="font-medium text-[9.75pt]">
                {point}
              </li>
            ))}
            {diagnosisPoints.slice(4, 8).map((point) => (
              <li key={point} className="font-medium text-[9.75pt]">
                {point}
              </li>
            ))}{" "}
            {diagnosisPoints.slice(4, 8).map((point) => (
              <li key={point} className="font-medium text-[9.75pt]">
                {point}
              </li>
            ))}{" "}
            {diagnosisPoints.slice(4, 8).map((point) => (
              <li key={point} className="font-medium text-[9.75pt]">
                {point}
              </li>
            ))}{" "}
            {diagnosisPoints.slice(4, 8).map((point) => (
              <li key={point} className="font-medium text-[9.75pt]">
                {point}
              </li>
            ))}{" "}
            {diagnosisPoints.slice(4, 8).map((point) => (
              <li key={point} className="font-medium text-[9.75pt]">
                {point}
              </li>
            ))}
          </ul>
        </li>
        <li className="min-h-[1in]">
          <p className="font-semibold text-[11pt] text-gray-800 leading-[15pt]">Diagnosis</p>
          <ul className="mt-0 mb-[6pt] pl-[24pt] w-full list-disc">
            {diagnosisPoints.slice(8).map((point) => (
              <li key={point} className="font-medium text-[9.75pt]">
                {point}
              </li>
            ))}
            {diagnosisPoints.slice(0, 4).map((point, index) => (
              <li key={`${point}-repeat-${index}`} className="font-medium text-[9.75pt]">
                Review note: {point}
              </li>
            ))}
          </ul>
        </li>
      </ul>

      <ul
        className="flex flex-col gap-[4pt] min-w-0"
        style={{ marginLeft: "4pt", marginTop: "0.5in", width: "5.77in" }}
      >
        <li className="min-h-[1in]">
          <ol className="space-y-[10pt] mt-0 pt-[15pt] pl-[15pt] w-full list-decimal">
            {treatmentSteps.map((step) => (
              <li key={step.key} className="w-full text-[8.75pt] leading-[10.5pt]">
                <div className="mb-[2pt] pr-[18pt] text-[10pt]">{step.name}</div>
                <div className="items-start gap-x-[6pt] grid grid-cols-[2fr_1fr_3fr] pr-[26pt] w-full">
                  <div className="min-w-0">{step.dose}</div>
                  <div className="min-w-0 text-center">{step.duration}</div>
                  <div className="min-w-0 text-left break-all">{step.note}</div>
                </div>
              </li>
            ))}
          </ol>
        </li>
        <li className="min-h-[1in]">
          <p className="font-semibold text-[11pt] text-gray-800 leading-[15pt]">Advices</p>
          <ol className="mt-0 mb-[6pt] pl-[24pt] w-full list-decimal">
            {adviceItems.map((item, index) => (
              <li key={`${index + 1}-${item}`} className="text-[8.75pt]">
                {item}
              </li>
            ))}
          </ol>
        </li>
      </ul>
    </section>
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

function PaginatedMixedImageText() {
  return (
    <Document pageSize={pageSizes.A4} pruneSourceAfterPagination>
      <Document.Segment className={["bg-transparent", PAGE_MARGIN_CLASS].join(" ")}>
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

function NaturalMixedImageText() {
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

function PaginatedTableRows() {
  return (
    <Document pageSize={pageSizes.A4} pruneSourceAfterPagination>
      <Document.Segment
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

function NaturalTableRows() {
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

function PaginatedNestedLayout() {
  return (
    <Document pageSize={pageSizes.A4} pruneSourceAfterPagination>
      <Document.Segment className={["bg-transparent", PAGE_MARGIN_CLASS].join(" ")}>
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
          <FooterLine content="Nested Layout Pagination" />
        </Document.Footer>
      </Document.Segment>
    </Document>
  );
}

function NaturalNestedLayout() {
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
      case "mixed-image-text":
        return { natural: <NaturalMixedImageText />, paginated: <PaginatedMixedImageText /> };
      case "table-rows":
        return { natural: <NaturalTableRows />, paginated: <PaginatedTableRows /> };
      case "nested-layout":
        return { natural: <NaturalNestedLayout />, paginated: <PaginatedNestedLayout /> };
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
              <option value="mixed-image-text">Mixed Image + Text</option>
              <option value="table-rows">Table Rows</option>
              <option value="nested-layout">Nested Layout</option>
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
