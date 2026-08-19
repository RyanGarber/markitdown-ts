import { type Cell, Workbook, type Worksheet } from "exceljs";
import { toArrayBuffer } from "../bytes";
import type { ConverterOptions, ConverterResult } from "../types";
import { HtmlConverter } from "./html";

export class XlsxConverter extends HtmlConverter {
  async convert(source: Uint8Array, options: ConverterOptions): Promise<ConverterResult> {
    if (options.file_extension?.toLowerCase() !== ".xlsx") {
      return null;
    }

    const workbook = new Workbook();
    await workbook.xlsx.load(toArrayBuffer(source));
    const sections: string[] = [];

    for (const worksheet of workbook.worksheets) {
      const html = worksheetToHtml(worksheet);
      if (!html) {
        continue;
      }
      const result = await this.convertHtml(html);
      sections.push(`## ${worksheet.name}\n${result?.markdown.trim() ?? ""}`);
    }

    const markdown = sections.join("\n\n");
    return {
      title: workbook.title || "Untitled",
      markdown,
      text_content: markdown
    };
  }
}

function worksheetToHtml(worksheet: Worksheet): string {
  const columnCount = worksheet.columnCount;
  if (!columnCount || !worksheet.actualRowCount) {
    return "";
  }

  const rows: string[] = [];
  worksheet.eachRow({ includeEmpty: true }, (row) => {
    const cells: string[] = [];
    for (let column = 1; column <= columnCount; column++) {
      cells.push(`<td>${escapeHtml(cellText(row.getCell(column)))}</td>`);
    }
    rows.push(`<tr>${cells.join("")}</tr>`);
  });

  return `<html><body><table>${rows.join("")}</table></body></html>`;
}

function cellText(cell: Cell): string {
  if (cell.isMerged && cell.master !== cell) {
    return "";
  }
  return cell.text;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
