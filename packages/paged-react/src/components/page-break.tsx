import { forwardRef } from "react";
import type { ComponentPropsWithoutRef } from "react";

export const PageBreak = forwardRef<HTMLSpanElement, ComponentPropsWithoutRef<"span">>(
  function PageBreak({ style, ...props }, ref) {
    return (
      <span
        {...props}
        ref={ref}
        data-paged-react-page-break=""
        style={{ breakBefore: "page", ...style }}
      />
    );
  },
);
