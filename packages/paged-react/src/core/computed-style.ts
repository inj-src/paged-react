import { getBoxStyle } from "./utils.js";

export type BoxStyle = {
  borderTopWidth: number;
  borderBottomWidth: number;
  marginTop: number;
  marginBottom: number;
  paddingTop: number;
  paddingBottom: number;
};

export function createComputedStyleCache() {
  const styles = new WeakMap<Element, BoxStyle>();

  return {
    get(element: Element) {
      const cachedStyle = styles.get(element);

      if (cachedStyle) {
        return cachedStyle;
      }

      const boxStyle = getBoxStyle(element);

      styles.set(element, boxStyle);
      return boxStyle;
    },
  };
}
