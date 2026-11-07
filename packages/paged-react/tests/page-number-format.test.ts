import { describe, expect, it } from "vitest";
import { formatPageNumber } from "../src/core/page-number-format.js";

describe("formatPageNumber", () => {
  it("writes CSS counter styles", () => {
    expect(formatPageNumber(14, null)).toBe("14");
    expect(formatPageNumber(14, "lower-roman")).toBe("xiv");
    expect(formatPageNumber(1994, "upper-roman")).toBe("MCMXCIV");
    expect(formatPageNumber(28, "lower-alpha")).toBe("ab");
    expect(formatPageNumber(26, "upper-alpha")).toBe("Z");
    expect(formatPageNumber(7, "decimal-leading-zero")).toBe("07");
    expect(formatPageNumber(125, "bengali")).toBe("১২৫");
    expect(formatPageNumber(3, "arabic-indic")).toBe("٣");
  });

  it("falls back to decimal outside a style's range and for unknown names", () => {
    expect(formatPageNumber(4000, "lower-roman")).toBe("4000");
    expect(formatPageNumber(0, "lower-alpha")).toBe("0");
    expect(formatPageNumber(12, "klingon")).toBe("12");
  });
});
