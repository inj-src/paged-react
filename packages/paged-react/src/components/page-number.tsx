import { forwardRef } from "react";
import type { ComponentPropsWithoutRef } from "react";
import type { PageNumberFormat } from "../core/page-number-format.js";

type PageNumberProps = ComponentPropsWithoutRef<"span"> & {
  /** CSS counter style name, e.g. `lower-roman` or `bengali`. Defaults to decimal. */
  format?: PageNumberFormat;
};

export const PageNumber = forwardRef<HTMLSpanElement, PageNumberProps>(function PageNumber(
  { format, ...props },
  ref,
) {
  return <span {...props} ref={ref} data-paged-react-page-number="" data-paged-react-format={format} />;
});

/**
 * The page number of the element `href` (`#id`) points to, e.g. in a table of contents. Give it
 * a fixed width (`display: inline-block; width: 3ch`) so a longer number does not rewrap its line.
 */
export const TargetPageNumber = forwardRef<HTMLSpanElement, PageNumberProps & { href: string }>(
  function TargetPageNumber({ href, format, ...props }, ref) {
    return (
      <span {...props} ref={ref} data-paged-react-target-page={href} data-paged-react-format={format} />
    );
  },
);

export const TotalPages = forwardRef<HTMLSpanElement, PageNumberProps>(function TotalPages(
  { format, ...props },
  ref,
) {
  return <span {...props} ref={ref} data-paged-react-total-pages="" data-paged-react-format={format} />;
});
