import { forwardRef } from "react";
import type { ComponentPropsWithoutRef } from "react";

export const PageNumber = forwardRef<HTMLSpanElement, ComponentPropsWithoutRef<"span">>(
  function PageNumber(props, ref) {
    return <span {...props} ref={ref} data-paged-react-page-number="" />;
  },
);

export const TotalPages = forwardRef<HTMLSpanElement, ComponentPropsWithoutRef<"span">>(
  function TotalPages(props, ref) {
    return <span {...props} ref={ref} data-paged-react-total-pages="" />;
  },
);
