function waitForImages(root: HTMLElement): Promise<void> {
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

export async function waitForLayoutReady(root: HTMLElement): Promise<void> {
  if (document.fonts && "ready" in document.fonts) {
    await document.fonts.ready;
  }

  await waitForImages(root);
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}
