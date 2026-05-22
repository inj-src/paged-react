import { useContext, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { context } from "./context.js";

export function Watermark(props: {
  children: (ctx: { pageIndex: number; pages: HTMLElement[] }) => React.ReactNode;
}) {
  const { children } = props;
  const ctx = useContext(context);

  if (ctx === null) {
    throw "Watermark component must be used within a Document component";
  }

  const { pages } = ctx;

  const wrappers = useMemo(() => {
    if (pages === null) {
      return [];
    }

    return pages.map(() => {
      const wrapper = document.createElement("div");
      wrapper.setAttribute("data-paged-react-watermark", "");
      wrapper.style.position = "absolute";
      return wrapper;
    });
  }, [pages]);

  useEffect(() => {
    if (pages === null) {
      return;
    }

    for (const [pageIndex, page] of pages.entries()) {
      const wrapper = wrappers[pageIndex];
      if (wrapper === undefined) {
        continue;
      }

      page.appendChild(wrapper);
    }

    return () => {
      for (const wrapper of wrappers) {
        wrapper.remove();
      }
    };
  }, [pages, wrappers]);

  if (pages === null) {
    return null;
  }

  return wrappers.map((wrapper, pageIndex) => {
    return createPortal(children({ pageIndex, pages }), wrapper, String(pageIndex));
  });
}
