import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
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
  const [scalePercent, setScalePercent] = useState(100);
  const deferredScalePercent = useDeferredValue(scalePercent);
  const scale = deferredScalePercent / 100;

  const contentRef = useRef<HTMLDivElement>(null);
  const reactToPrintFn = useReactToPrint({
    contentRef,
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, scenario);
  }, [scenario]);

  const views = useMemo(() => {
    switch (scenario) {
      case "forced-breaks":
        return {
          natural: <NaturalForcedBreaks />,
          paginated: <PaginatedForcedBreaks contentRef={contentRef} scale={scale} />,
        };
      case "legacy-breaks":
        return {
          natural: <NaturalLegacyBreaks />,
          paginated: <PaginatedLegacyBreaks contentRef={contentRef} scale={scale} />,
        };
      case "break-inside-avoid":
        return {
          natural: <NaturalBreakInsideAvoid />,
          paginated: <PaginatedBreakInsideAvoid contentRef={contentRef} scale={scale} />,
        };
      case "multi-segment":
        return {
          natural: <NaturalMultiSegment />,
          paginated: <PaginatedMultiSegment contentRef={contentRef} scale={scale} />,
        };
      case "mixed-image-text":
        return {
          natural: <NaturalMixedImageText />,
          paginated: <PaginatedMixedImageText contentRef={contentRef} scale={scale} />,
        };
      case "table-rows":
        return {
          natural: <NaturalTableRows />,
          paginated: <PaginatedTableRows contentRef={contentRef} scale={scale} />,
        };
      case "nested-layout":
        return {
          natural: <NaturalNestedLayout />,
          paginated: <PaginatedNestedLayout contentRef={contentRef} scale={scale} />,
        };
      default:
        return {
          natural: <NaturalLongArticle />,
          paginated: <PaginatedLongArticle contentRef={contentRef} scale={scale} />,
        };
    }
  }, [scenario, scale]);

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
          <label className="flex flex-col gap-1.5 font-semibold text-xs uppercase tracking-[0.04em]">
            Scale <span className="text-blue-700">{scalePercent}%</span>
            <input
              aria-label="Scale"
              className="w-[180px] accent-blue-600"
              type="range"
              min="10"
              max="200"
              step="5"
              value={scalePercent}
              onChange={(event) => setScalePercent(Number(event.target.value))}
            />
          </label>
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
