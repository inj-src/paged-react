export function splitBodyOnPageBreakMarkers(body: HTMLElement | null): HTMLElement[] {
  const bodySlices: HTMLElement[] = [];

  if (!body) {
    return bodySlices;
  }

  let hasPageBreakMarker = false;
  let bodySlice = body.cloneNode(false) as HTMLElement;

  for (const target of Array.from(body.childNodes)) {
    if (target instanceof HTMLElement && target.hasAttribute("data-paged-react-page-break")) {
      hasPageBreakMarker = true;
      bodySlices.push(bodySlice);

      bodySlice = body.cloneNode(false) as HTMLElement;
      continue;
    }

    bodySlice.appendChild(target.cloneNode(true));
  }

  if (!hasPageBreakMarker) {
    bodySlices.push(body);
    return bodySlices;
  }

  // Push the last slice if it has content
  bodySlices.push(bodySlice);

  return bodySlices;
}
