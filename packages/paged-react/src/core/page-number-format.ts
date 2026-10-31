// CSS counter style names for native digits, mapped to Intl numbering systems.
const NUMBERING_SYSTEMS = {
  "arabic-indic": "arab",
  bengali: "beng",
  devanagari: "deva",
  gujarati: "gujr",
  gurmukhi: "guru",
  kannada: "knda",
  khmer: "khmr",
  lao: "laoo",
  malayalam: "mlym",
  mongolian: "mong",
  myanmar: "mymr",
  oriya: "orya",
  persian: "arabext",
  tamil: "tamldec",
  telugu: "telu",
  thai: "thai",
  tibetan: "tibt",
} as const;

/** CSS counter style names a page number can be written in. */
export type PageNumberFormat =
  | "decimal"
  | "decimal-leading-zero"
  | "lower-roman"
  | "upper-roman"
  | "lower-alpha"
  | "upper-alpha"
  | keyof typeof NUMBERING_SYSTEMS;

const ROMAN: Array<[number, string]> = [
  [1000, "m"], [900, "cm"], [500, "d"], [400, "cd"], [100, "c"], [90, "xc"],
  [50, "l"], [40, "xl"], [10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"],
];

/**
 * Writes a page number in a CSS counter style. Like CSS, roman numerals cover 1-3999 and letters
 * start at 1; outside that range, and for unknown names, the number is written in decimal.
 */
export function formatPageNumber(value: number, format: string | null): string {
  if ((format === "lower-roman" || format === "upper-roman") && value >= 1 && value <= 3999) {
    let rest = value;
    let roman = "";
    for (const [amount, letters] of ROMAN) {
      while (rest >= amount) {
        roman += letters;
        rest -= amount;
      }
    }
    if (format === "upper-roman") return roman.toUpperCase();
    return roman;
  }

  if ((format === "lower-alpha" || format === "upper-alpha") && value >= 1) {
    let rest = value;
    let letters = "";
    while (rest > 0) {
      rest -= 1;
      letters = String.fromCharCode(97 + (rest % 26)) + letters;
      rest = Math.floor(rest / 26);
    }
    if (format === "upper-alpha") return letters.toUpperCase();
    return letters;
  }

  if (format === "decimal-leading-zero" && value >= 0 && value < 10) return `0${value}`;

  if (format !== null && format in NUMBERING_SYSTEMS) {
    const numberingSystem = NUMBERING_SYSTEMS[format as keyof typeof NUMBERING_SYSTEMS];
    return new Intl.NumberFormat("en", { numberingSystem, useGrouping: false }).format(value);
  }

  return String(value);
}
