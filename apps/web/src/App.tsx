import { useMemo, useState, useEffect } from "react";
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

function App() {
  const STORAGE_KEY = "paged-react:scenario";
  const [scenario, setScenario] = useState<ScenarioId>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    return (raw as ScenarioId) || "long-article";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, scenario);
  }, [scenario]);

  const views = useMemo(() => {
    switch (scenario) {
      case "forced-breaks":
        return {
          natural: <NaturalForcedBreaks />,
          paginated: <PaginatedForcedBreaks />,
        };
      case "legacy-breaks":
        return {
          natural: <NaturalLegacyBreaks />,
          paginated: <PaginatedLegacyBreaks />,
        };
      case "break-inside-avoid":
        return {
          natural: <NaturalBreakInsideAvoid />,
          paginated: <PaginatedBreakInsideAvoid />,
        };
      case "multi-segment":
        return {
          natural: <NaturalMultiSegment />,
          paginated: <PaginatedMultiSegment />,
        };
      case "mixed-image-text":
        return {
          natural: <NaturalMixedImageText />,
          paginated: <PaginatedMixedImageText />,
        };
      case "table-rows":
        return {
          natural: <NaturalTableRows />,
          paginated: <PaginatedTableRows />,
        };
      case "nested-layout":
        return {
          natural: <NaturalNestedLayout />,
          paginated: <PaginatedNestedLayout />,
        };
      default:
        return {
          natural: <NaturalLongArticle />,
          paginated: <PaginatedLongArticle />,
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
