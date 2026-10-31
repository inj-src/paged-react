import { describe, expect, it } from "vitest";
import { groupLineBoxes } from "../src/core/line-boxes.js";

const rect = (top: number, bottom: number) => ({ top, bottom });

describe("groupLineBoxes", () => {
  it("merges the extra newline rects Chrome reports for pre-formatted text", () => {
    // Range.getClientRects() of "\n001 alpha\n002 gamma\n003 delta\n" in a <pre> after an inline
    // token: the leading newline ends the token's line (zero height), then text + newline per line.
    const fragments = [
      rect(20, 20),
      rect(23, 38),
      rect(23, 38),
      rect(38, 53),
      rect(38, 53),
      rect(53, 68),
      rect(53, 68),
    ];

    expect(groupLineBoxes(fragments)).toEqual([rect(20, 20), rect(23, 38), rect(38, 53), rect(53, 68)]);
  });

  it("joins fragments of one line with different heights", () => {
    expect(groupLineBoxes([rect(10, 30), rect(14, 26), rect(30, 50)])).toEqual([rect(10, 30), rect(30, 50)]);
  });
});
