import * as XLSX from "xlsx";
import type { ConverterOptions, ConverterResult } from "../types";
import { HtmlConverter } from "./html";

export class XlsxConverter extends HtmlConverter {
  async convert(source: Uint8Array, options: ConverterOptions): Promise<ConverterResult> {
    if (options.file_extension?.toLowerCase() !== ".xlsx") {
      return null;
    }

    const workbook = XLSX.read(source, { type: "array" });
    const sections: string[] = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (sheet?.["!ref"]) {
        const result = await this.convertHtml(XLSX.utils.sheet_to_html(sheet));
        sections.push(`## ${sheetName}\n${result?.markdown.trim() ?? ""}`);
      }
    }

    const markdown = sections.join("\n\n");
    return {
      title: workbook.Props?.Title || "Untitled",
      markdown,
      text_content: markdown
    };
  }
}
