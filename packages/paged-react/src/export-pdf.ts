import { paginateDocumentIR } from "./core/paginate.js";
import { writePdf, type PdfWriterOptions } from "./writers/pdf.js";
import type { PaginateDocumentContext } from "./types.js";

export async function exportPdf(ctx: PaginateDocumentContext, options?: PdfWriterOptions): Promise<Uint8Array> {
  const result = await paginateDocumentIR(ctx);
  return writePdf(result.ir, options);
}

export type { PdfWriterOptions } from "./writers/pdf.js";
