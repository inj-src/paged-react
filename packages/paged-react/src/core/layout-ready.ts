async function waitForImages(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll("img"));

  if (!images.length) {
    return Promise.resolve();
  }

  return Promise.all(
    images.map((img) => {
      if (img.complete) {
        return Promise.resolve();
      }

      return new Promise<void>((resolve) => {
        img.addEventListener("load", () => resolve(), { once: true });
        img.addEventListener("error", () => resolve(), { once: true });
      });
    }),
  ).then(() => undefined);
}

export async function waitForLayoutReady(root: HTMLElement) {
  const ownerDocument = root.ownerDocument;
  if (ownerDocument.fonts && "ready" in ownerDocument.fonts) {
    await ownerDocument.fonts.ready;
  }

  await waitForImages(root);
  const view = ownerDocument.defaultView;
  if (!view) {
    return;
  }
  if (!view.requestAnimationFrame) {
    return;
  }
  await new Promise<void>((resolve) => view.requestAnimationFrame(() => resolve()));
}
