import type { ScenarioId } from "../scenarios/types";

type ScenarioSelectProps = {
  scenario: ScenarioId;
  onScenarioChange: (scenario: ScenarioId) => void;
};

export function ScenarioSelect({
  scenario,
  onScenarioChange,
}: ScenarioSelectProps) {
  return (
    <label className="flex flex-col gap-1.5 font-semibold text-xs uppercase tracking-[0.04em]">
      Scenario
      <select
        className="bg-slate-50 px-3 py-2 border border-slate-300 rounded-md max-md:w-full min-w-[260px] max-md:min-w-0 text-sm"
        value={scenario}
        onChange={(e) => onScenarioChange(e.target.value as ScenarioId)}
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
  );
}
