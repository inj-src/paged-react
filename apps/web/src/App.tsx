import { useMemo, useState, useEffect, useRef } from "react";
import { exportPdf } from "paged-react";
import { ComparisonPanel } from "./components/comparison-panel";
import { ScenarioSelect } from "./components/scenario-select";
import {
  NaturalBreakInsideAvoid,
  NaturalForcedBreaks,
  NaturalLegacyBreaks,
  NaturalLongArticle,
  PaginatedBreakInsideAvoid,
  PaginatedForcedBreaks,
  PaginatedLegacyBreaks,
  PaginatedLongArticle,
} from "./scenarios/article-scenarios";
import {
  NaturalMixedImageText,
  NaturalMultiSegment,
  NaturalNestedLayout,
  NaturalTableRows,
  PaginatedMixedImageText,
  PaginatedMultiSegment,
  PaginatedNestedLayout,
  PaginatedTableRows,
} from "./scenarios/layout-scenarios";
import type { ScenarioId } from "./scenarios/types";
import { useReactToPrint } from "react-to-print";

function App() {
  const STORAGE_KEY = "paged-react:scenario";
  const [scenario, setScenario] = useState<ScenarioId>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    return (raw as ScenarioId) || "long-article";
  });

  const contentRef = useRef<HTMLDivElement>(null);
  const reactToPrintFn = useReactToPrint({
    contentRef,
    print: async (iframe) => {
      console.log(iframe.contentWindow!.document.querySelector("html")?.innerHTML);
    },
  });

  const exportPdfFn = async () => {
    const pagesRoot = contentRef.current;
    const sourceRoot = pagesRoot?.parentElement?.querySelector<HTMLDivElement>("[data-paged-react-source]");
    if (!pagesRoot || !sourceRoot) {
      return;
    }

    const pdfWindow = window.open("about:blank", "_blank");
    if (!pdfWindow) {
      return;
    }

    try {
      const bytes = await exportPdf({ sourceRoot, pagesRoot });
      const blobBytes = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(blobBytes).set(bytes);
      const blob = new Blob([blobBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      pdfWindow.location.href = url;
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      let message = "Unable to export PDF.";
      if (error instanceof Error) {
        message = error.message;
      }
      pdfWindow.document.body.textContent = message;
    }
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, scenario);
  }, [scenario]);

  const views = useMemo(() => {
    switch (scenario) {
      case "forced-breaks":
        return {
          natural: <NaturalForcedBreaks />,
          paginated: <PaginatedForcedBreaks contentRef={contentRef} />,
        };
      case "legacy-breaks":
        return {
          natural: <NaturalLegacyBreaks />,
          paginated: <PaginatedLegacyBreaks contentRef={contentRef} />,
        };
      case "break-inside-avoid":
        return {
          natural: <NaturalBreakInsideAvoid />,
          paginated: <PaginatedBreakInsideAvoid contentRef={contentRef} />,
        };
      case "multi-segment":
        return {
          natural: <NaturalMultiSegment />,
          paginated: <PaginatedMultiSegment contentRef={contentRef} />,
        };
      case "mixed-image-text":
        return {
          natural: <NaturalMixedImageText />,
          paginated: <PaginatedMixedImageText contentRef={contentRef} />,
        };
      case "table-rows":
        return {
          natural: <NaturalTableRows />,
          paginated: <PaginatedTableRows contentRef={contentRef} />,
        };
      case "nested-layout":
        return {
          natural: <NaturalNestedLayout />,
          paginated: <PaginatedNestedLayout contentRef={contentRef} />,
        };
      default:
        return {
          natural: <NaturalLongArticle />,
          paginated: <PaginatedLongArticle contentRef={contentRef} />,
        };
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
          <button
            className="bg-blue-500 hover:bg-blue-700 px-4 py-2 rounded font-bold text-white"
            onClick={reactToPrintFn}
          >
            Print
          </button>
          <button
            className="bg-slate-700 hover:bg-slate-900 px-4 py-2 rounded font-bold text-white"
            onClick={exportPdfFn}
          >
            Export PDF
          </button>
          <ScenarioSelect scenario={scenario} onScenarioChange={setScenario} />
        </div>
      </header>

      <section className="mt-5">
        <div className="flex max-md:flex-col gap-5">
          <ComparisonPanel title="Natural Flow (direct DOM)">{views.natural}</ComparisonPanel>
          <ComparisonPanel title="Paginated Flow (package)" paginated>
            {views.paginated}
          </ComparisonPanel>
        </div>
      </section>
    </main>
  );
}

export default App;
