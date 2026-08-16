import { forwardRef } from "react";
import type { ComponentPropsWithoutRef } from "react";

export const Watermark = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<"div">>(
  function Watermark({ children, ...props }, ref) {
    return (
      <div {...props} ref={ref} data-paged-react-watermark-source="">
        {children}
      </div>
    );
  },
);
