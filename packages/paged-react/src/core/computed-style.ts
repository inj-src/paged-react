export type CachedBoxStyle = {
  borderBottomWidth: number;
  marginBottom: number;
  paddingBottom: number;
};

export function createComputedStyleCache() {
  const styles = new WeakMap<Element, CachedBoxStyle>();

  return {
    get(element: Element) {
      const cachedStyle = styles.get(element);

      if (cachedStyle) {
        return cachedStyle;
      }

      const computedStyle = getComputedStyle(element);
      const boxStyle = {
        borderBottomWidth: parseFloat(computedStyle.borderBottomWidth) || 0,
        marginBottom: parseFloat(computedStyle.marginBottom) || 0,
        paddingBottom: parseFloat(computedStyle.paddingBottom) || 0,
      };

      styles.set(element, boxStyle);
      return boxStyle;
    },
  };
}
