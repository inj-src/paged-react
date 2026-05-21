import type { ReactNode } from "react";

export const PAGE_MARGIN_CLASS = "p-[18mm_16mm]";

const SHEET_CHROME_CLASS = "p-2 text-slate-600 text-xs text-center";

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

export function Paragraphs({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, idx) => (
        <p key={idx}>
          Section {idx + 1}. This paragraph is intentionally verbose to pressure
          pagination and verify body overflow handling across generated pages
          with normal document flow.
        </p>
      ))}
    </>
  );
}

function HeaderContent({ left, right }: { left: string; right?: string }) {
  const rightContent = [];

  if (right) {
    rightContent.push(
      <span className="before:mx-1.5 before:content-['·']" key="right">
        {right}
      </span>,
    );
  }

  return (
    <div className="flex justify-center items-center w-full text-center">
      <span>{left}</span>
      {rightContent}
    </div>
  );
}

export function HeaderLine({ left, right }: { left: string; right?: string }) {
  return (
    <div className={SHEET_CHROME_CLASS}>
      <HeaderContent left={left} right={right} />
    </div>
  );
}

export function FooterLine({ content }: { content: string }) {
  return <div className={SHEET_CHROME_CLASS}>{content}</div>;
}

export function NaturalSheet({
  title,
  footer,
  rightTitle,
  body,
  className,
}: {
  title: string;
  footer: string;
  rightTitle?: string;
  body: ReactNode;
  className?: string;
}) {
  const articleClassNames = [
    "flex min-h-[297mm] w-[210mm] flex-col border border-slate-300 bg-white shadow-[0_6px_18px_rgba(15,23,42,0.12)]",
  ];

  if (className) {
    articleClassNames.push(className);
  }

  return (
    <article className={articleClassNames.join(" ")}>
      <div
        className={["flex min-h-full flex-col", PAGE_MARGIN_CLASS].join(" ")}
      >
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

export function ForcedBreakMarker() {
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

export function MixedMediaLead() {
  return (
    <>
      <p>
        This scenario mixes a large illustrative asset with regular body copy to
        exercise image readiness and pagination order in the same segment.
      </p>
      <img
        alt="Report dashboard preview"
        className="my-4 border border-slate-300 rounded-md w-full h-auto"
        src={REPORT_IMAGE_SRC}
      />
      <p>
        The image should retain its place in flow and the following paragraphs
        should continue on the same page when space allows.
      </p>
      <Paragraphs count={10} />
    </>
  );
}

export function RevenueTable() {
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
          <th className="px-3 py-2 font-semibold">#</th>
          <th className="px-3 py-2 font-semibold">Channel</th>
          <th className="px-3 py-2 font-semibold">Revenue</th>
          <th className="px-3 py-2 font-semibold">Growth</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([channel, revenue, growth], index) => (
          <tr
            key={`${channel}-${index}`}
            className="border-slate-200 border-b align-top"
          >
            <td className="px-3 py-2">{index + 1}</td>
            <td className="px-3 py-2">{channel}</td>
            <td className="px-3 py-2">{revenue}</td>
            <td className="px-3 py-2">{growth}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
