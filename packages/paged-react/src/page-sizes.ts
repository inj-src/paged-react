import type { PageSizeName, PageSizeValue } from "./types.js";

export const pageSizes = {
  A0: { width: "841mm", height: "1189mm" },
  A1: { width: "594mm", height: "841mm" },
  A2: { width: "420mm", height: "594mm" },
  A3: { width: "297mm", height: "420mm" },
  A4: { width: "210mm", height: "297mm" },
  A5: { width: "148mm", height: "210mm" },
  A6: { width: "105mm", height: "148mm" },
  A7: { width: "74mm", height: "105mm" },
  A8: { width: "52mm", height: "74mm" },
  A9: { width: "37mm", height: "52mm" },
  A10: { width: "26mm", height: "37mm" },
  B4: { width: "250mm", height: "353mm" },
  B5: { width: "176mm", height: "250mm" },
  Letter: { width: "8.5in", height: "11in" },
  Legal: { width: "8.5in", height: "14in" },
  Ledger: { width: "11in", height: "17in" },
} as const satisfies Record<PageSizeName, PageSizeValue>;
