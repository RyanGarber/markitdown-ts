import { extractText, getDocumentProxy, getMeta } from "unpdf";
import type { ConverterOptions, ConverterResult, DocumentConverter } from "../types";

export class PdfConverter implements DocumentConverter {
  async convert(source: Uint8Array, options: ConverterOptions): Promise<ConverterResult> {
    if (options.file_extension?.toLowerCase() !== ".pdf") {
      return null;
    }

    const pdf = await getDocumentProxy(source.slice());
    try {
      const [{ text }, { info }] = await Promise.all([
        extractText(pdf, { mergePages: true }),
        getMeta(pdf)
      ]);
      const title = typeof info.Title === "string" && info.Title.trim() ? info.Title : null;

      return { title, markdown: text, text_content: text };
    } finally {
      await pdf.loadingTask.destroy();
    }
  }
}
