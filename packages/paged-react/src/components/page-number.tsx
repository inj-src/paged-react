import { forwardRef } from "react";
import type { ComponentPropsWithoutRef } from "react";

export const PageNumber = forwardRef<HTMLSpanElement, ComponentPropsWithoutRef<"span">>(
  function PageNumber(props, ref) {
    return <span {...props} ref={ref} data-paged-react-page-number="" />;
  },
);

/**
 * The page number of the element `href` (`#id`) points to, e.g. in a table of contents. Give it
 * a fixed width (`display: inline-block; width: 3ch`) so a longer number does not rewrap its line.
 */
export const TargetPageNumber = forwardRef<
  HTMLSpanElement,
  ComponentPropsWithoutRef<"span"> & { href: string }
>(function TargetPageNumber({ href, ...props }, ref) {
  return <span {...props} ref={ref} data-paged-react-target-page={href} />;
});

export const TotalPages = forwardRef<HTMLSpanElement, ComponentPropsWithoutRef<"span">>(
  function TotalPages(props, ref) {
    return <span {...props} ref={ref} data-paged-react-total-pages="" />;
  },
);
