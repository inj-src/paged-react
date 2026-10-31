/**
 * Keeps only a window of rows of very long tables in the pagination source.
 *
 * Every page removes consumed rows from the source, and Chrome then lays out the whole remaining
 * table again, so a long table costs O(rows) per page and the document O(pages × rows). Parking
 * the rows beyond a few pages in detached storage and restoring them as rows are consumed keeps
 * that layout O(window).
 *
 * Only fixed-layout tables qualify, so column widths (and thus row heights) do not depend on the
 * parked rows. The window is only cut where no rowspan crosses it; a row group boundary always
 * qualifies, so later row groups can be parked whole.
 */
type Unit =
  | { kind: "rows"; section: HTMLTableSectionElement; rows: HTMLTableRowElement[] }
  | { kind: "section"; section: HTMLTableSectionElement };

type TableWindow = {
  table: HTMLTableElement;
  parked: Unit[];
  heights: WeakMap<HTMLTableRowElement, number>;
};

const KEEP_PAGES = 6;
const REFILL_BELOW_PAGES = 4;
const MIN_ROWS = 100;

export type TableWindows = {
  /** Rows are still parked outside the source. */
  pending(): boolean;
  /** Restores parked rows so every windowed table keeps several pages of rows in the source. */
  topUp(): void;
};

export function createTableWindows(body: HTMLElement, view: Window, pageHeight: number): TableWindows {
  const windows: TableWindow[] = [];

  for (const table of Array.from(body.querySelectorAll("table"))) {
    // Nested tables are laid out with their outer table; leave them alone.
    if (table.parentElement?.closest("table")) continue;
    const sections = Array.from(table.tBodies);
    const rowCount = sections.reduce((count, section) => count + section.rows.length, 0);
    if (rowCount < MIN_ROWS || view.getComputedStyle(table).tableLayout !== "fixed") continue;

    // Row heights from this full layout, and whether a cut right before each row is clean.
    const heights = new WeakMap<HTMLTableRowElement, number>();
    const order: Array<{ section: HTMLTableSectionElement; row: HTMLTableRowElement; index: number; clean: boolean }> = [];
    let unsupported = false;
    let total = 0;
    for (const section of sections) {
      let spanEnd = -1;
      Array.from(section.rows).forEach((row, index) => {
        order.push({ section, row, index, clean: spanEnd < index });
        for (const cell of Array.from(row.cells)) {
          if (cell.rowSpan === 0) unsupported = true;
          spanEnd = Math.max(spanEnd, index + cell.rowSpan - 1);
        }
        const height = row.getBoundingClientRect().height;
        heights.set(row, height);
        total += height;
      });
    }
    if (unsupported || total < (KEEP_PAGES + 2) * pageHeight) continue;

    let kept = 0;
    let cut = -1;
    for (const [position, entry] of order.entries()) {
      if (kept >= KEEP_PAGES * pageHeight && entry.clean) {
        cut = position;
        break;
      }
      kept += heights.get(entry.row) ?? 0;
    }
    if (cut < 0) continue;

    // Rows after the cut in its own row group are parked in chunks between clean cuts; later row
    // groups are parked whole.
    const parked: Unit[] = [];
    let chunk: HTMLTableRowElement[] = [];
    const cutEntry = order[cut];
    const cutSection = cutEntry?.section;
    // A cut before a row group's first row parks the whole group: an emptied row group left in the
    // table would be cleaned up as an empty shell.
    const wholeGroup = cutEntry?.index === 0;
    if (cutEntry && wholeGroup) parked.push({ kind: "section", section: cutEntry.section });
    for (const entry of wholeGroup ? [] : order.slice(cut)) {
      if (entry.section !== cutSection) break;
      if (entry.clean && chunk.length) {
        parked.push({ kind: "rows", section: entry.section, rows: chunk });
        chunk = [];
      }
      chunk.push(entry.row);
    }
    if (chunk.length && cutSection) parked.push({ kind: "rows", section: cutSection, rows: chunk });
    for (const section of sections.slice(sections.indexOf(cutSection as HTMLTableSectionElement) + 1)) {
      parked.push({ kind: "section", section });
    }

    for (const unit of parked) {
      if (unit.kind === "rows") for (const row of unit.rows) row.remove();
      else unit.section.remove();
    }
    windows.push({ table, parked, heights });
  }

  const liveHeight = (window: TableWindow) => {
    let live = 0;
    for (const section of Array.from(window.table.tBodies)) {
      for (const row of Array.from(section.rows)) live += window.heights.get(row) ?? 0;
    }
    return live;
  };

  return {
    pending: () => windows.some((window) => window.parked.length > 0),
    topUp() {
      for (const window of windows) {
        if (!window.parked.length) continue;
        let live = liveHeight(window);
        if (live >= REFILL_BELOW_PAGES * pageHeight) continue;

        while (window.parked.length && live < KEEP_PAGES * pageHeight) {
          const unit = window.parked.shift() as Unit;
          if (unit.kind === "rows") {
            unit.section.append(...unit.rows);
            for (const row of unit.rows) live += window.heights.get(row) ?? 0;
          } else {
            // After the last row group still in the table (a row group may have been fully consumed).
            const lastBody = Array.from(window.table.tBodies).at(-1);
            if (lastBody) lastBody.after(unit.section);
            else window.table.append(unit.section);
            for (const row of Array.from(unit.section.rows)) live += window.heights.get(row) ?? 0;
          }
        }
      }
    },
  };
}
