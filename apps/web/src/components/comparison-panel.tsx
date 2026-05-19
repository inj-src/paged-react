import type { ReactNode } from "react";

type ComparisonPanelProps = {
  title: string;
  children: ReactNode;
  paginated?: boolean;
};

export function ComparisonPanel({
  title,
  children,
  paginated,
}: ComparisonPanelProps) {
  const contentClassNames = ["p-2 min-h-0"];

  if (paginated) {
    contentClassNames.push("paginated-sheet-theme");
  }

  return (
    <div className="flex flex-col flex-1 gap-3 p-3.5 min-h-[60vh]">
      <h2 className="m-0 font-['Space_Grotesk','Avenir_Next',sans-serif] text-sm tracking-[0.02em]">
        {title}
      </h2>
      <div className={contentClassNames.join(" ")}>{children}</div>
    </div>
  );
}
