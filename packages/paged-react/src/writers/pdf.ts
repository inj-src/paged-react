import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { PaginatedDocumentIR, PaintNode, PaintStyle } from "../core/ir.js";
import { parseCssColor, type ParsedPdfColor } from "./pdf-color.js";

const CSS_PIXEL_TO_POINT = 72 / 96;

export type PdfWriterOptions = {
  fetchImage?: (source: string) => Promise<ArrayBuffer>;
};

export class PdfWriterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PdfWriterError";
  }
}

export async function writePdf(ir: PaginatedDocumentIR, options: PdfWriterOptions = {}): Promise<Uint8Array> {
  if (ir.pages.length === 0) {
    throw new PdfWriterError("Cannot create a PDF without paginated pages.");
  }

  const pdf = await PDFDocument.create();
  const fonts = new Map<StandardFonts, PDFFont>();

  for (const pageIR of ir.pages) {
    if (![pageIR.width, pageIR.height].every((value) => value > 0)) {
      throw new PdfWriterError(`Page ${pageIR.index} has no usable dimensions.`);
    }

    const width = pageIR.width * CSS_PIXEL_TO_POINT;
    const height = pageIR.height * CSS_PIXEL_TO_POINT;
    const page = pdf.addPage([width, height]);

    for (const node of pageIR.paint) {
      await drawPaintNode(pdf, page, pageIR.height, node, fonts, options);
    }
  }

  return pdf.save();
}

async function drawPaintNode(
  pdf: PDFDocument,
  page: PDFPage,
  pageHeight: number,
  node: PaintNode,
  fonts: Map<StandardFonts, PDFFont>,
  options: PdfWriterOptions,
): Promise<void> {
  if (node.type === "box") {
    drawBox(page, pageHeight, node.rect, node.style);
    return;
  }

  if (node.type === "text") {
    await drawText(pdf, page, pageHeight, node, fonts);
    return;
  }

  await drawImage(pdf, page, pageHeight, node, options);
}

function drawBox(page: PDFPage, pageHeight: number, rect: PaintNode["rect"], style: PaintStyle): void {
  const geometry = toPdfRect(rect, pageHeight);
  const background = parseCssColor(style.backgroundColor);
  if (background !== undefined) {
    page.drawRectangle({
      x: geometry.x,
      y: geometry.y,
      width: geometry.width,
      height: geometry.height,
      color: background.value,
      opacity: combineOpacity(style.opacity, background),
    });
  }

  drawBorder(page, geometry.x, geometry.y + geometry.height, geometry.x + geometry.width, geometry.y + geometry.height, style.borderTopWidth, style.borderTopColor, style.opacity);
  drawBorder(page, geometry.x + geometry.width, geometry.y + geometry.height, geometry.x + geometry.width, geometry.y, style.borderRightWidth, style.borderRightColor, style.opacity);
  drawBorder(page, geometry.x, geometry.y, geometry.x + geometry.width, geometry.y, style.borderBottomWidth, style.borderBottomColor, style.opacity);
  drawBorder(page, geometry.x, geometry.y + geometry.height, geometry.x, geometry.y, style.borderLeftWidth, style.borderLeftColor, style.opacity);
}

async function drawText(
  pdf: PDFDocument,
  page: PDFPage,
  pageHeight: number,
  node: Extract<PaintNode, { type: "text" }>,
  fonts: Map<StandardFonts, PDFFont>,
): Promise<void> {
  const fontName = getFontName(node.style);
  let font = fonts.get(fontName);
  if (font === undefined) {
    font = await pdf.embedFont(fontName);
    fonts.set(fontName, font);
  }

  const geometry = toPdfRect(node.rect, pageHeight);
  const size = getFontSize(node.style.fontSize);
  const color = parseCssColor(node.style.color);
  let textColor = rgb(0, 0, 0);
  let textOpacity = getStyleOpacity(node.style.opacity);
  if (color !== undefined) {
    textColor = color.value;
    textOpacity = combineOpacity(node.style.opacity, color);
  }

  try {
    page.drawText(node.text, {
      x: geometry.x,
      y: geometry.y + Math.max(0, geometry.height - size) * 0.15,
      size,
      font,
      color: textColor,
      opacity: textOpacity,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown text encoding error";
    throw new PdfWriterError(`Cannot draw text from ${node.sourceId}: ${reason}`);
  }
}

async function drawImage(
  pdf: PDFDocument,
  page: PDFPage,
  pageHeight: number,
  node: Extract<PaintNode, { type: "image" }>,
  options: PdfWriterOptions,
): Promise<void> {
  const bytes = await loadImageBytes(node.source, options);
  let image;
  try {
    image = await pdf.embedPng(bytes);
  } catch {
    try {
      image = await pdf.embedJpg(bytes);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unsupported image format";
      throw new PdfWriterError(`Cannot embed image from ${node.source}: ${reason}`);
    }
  }

  const geometry = toPdfRect(node.rect, pageHeight);
  page.drawImage(image, {
    x: geometry.x,
    y: geometry.y,
    width: geometry.width,
    height: geometry.height,
    opacity: getStyleOpacity(node.style.opacity),
  });
}

async function loadImageBytes(source: string, options: PdfWriterOptions): Promise<Uint8Array> {
  if (options.fetchImage !== undefined) {
    return new Uint8Array(await options.fetchImage(source));
  }

  const response = await fetch(source);
  if (!response.ok) {
    throw new PdfWriterError(`Cannot fetch image ${source}: HTTP ${response.status}.`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

function drawBorder(
  page: PDFPage,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  widthValue: string | undefined,
  colorValue: string | undefined,
  styleOpacity: number | undefined,
): void {
  if (widthValue === undefined) {
    return;
  }
  const width = Number.parseFloat(widthValue) * CSS_PIXEL_TO_POINT;
  if (!Number.isFinite(width) || width <= 0) {
    return;
  }

  const color = parseCssColor(colorValue);
  if (color === undefined) {
    return;
  }
  page.drawLine({
    start: { x: startX, y: startY },
    end: { x: endX, y: endY },
    thickness: width,
    color: color.value,
    opacity: combineOpacity(styleOpacity, color),
  });
}

function toPdfRect(rect: PaintNode["rect"], pageHeight: number) {
  return {
    x: rect.x * CSS_PIXEL_TO_POINT,
    y: (pageHeight - rect.y - rect.height) * CSS_PIXEL_TO_POINT,
    width: rect.width * CSS_PIXEL_TO_POINT,
    height: rect.height * CSS_PIXEL_TO_POINT,
  };
}

function getFontName(style: PaintStyle): StandardFonts {
  const weight = style.fontWeight;
  let bold = false;
  if (weight !== undefined) {
    bold = ["bold", "600", "700", "800", "900"].includes(weight.toLowerCase());
    const numericWeight = Number.parseInt(weight, 10);
    if (Number.isFinite(numericWeight) && numericWeight >= 600) {
      bold = true;
    }
  }

  const fontStyle = style.fontStyle;
  const italic = fontStyle !== undefined && ["italic", "oblique"].includes(fontStyle.toLowerCase());
  if (bold && italic) {
    return StandardFonts.HelveticaBoldOblique;
  }
  if (bold) {
    return StandardFonts.HelveticaBold;
  }
  if (italic) {
    return StandardFonts.HelveticaOblique;
  }
  return StandardFonts.Helvetica;
}

function getFontSize(value: string | undefined): number {
  if (value === undefined) {
    return 12;
  }
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 12;
  }
  return parsed * CSS_PIXEL_TO_POINT;
}

function getStyleOpacity(value: number | undefined): number {
  if (value === undefined) {
    return 1;
  }
  return Math.min(1, Math.max(0, value));
}

function combineOpacity(styleOpacity: number | undefined, color: ParsedPdfColor): number {
  return getStyleOpacity(styleOpacity) * color.opacity;
}
