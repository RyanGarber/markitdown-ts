import mammoth from "mammoth";
import { toArrayBuffer } from "../bytes";
import type { ConverterOptions, ConverterResult } from "../types";
import { HtmlConverter } from "./html";

export class DocxConverter extends HtmlConverter {
  async convert(source: Uint8Array, options: ConverterOptions): Promise<ConverterResult> {
    if (options.file_extension?.toLowerCase() !== ".docx") {
      return null;
    }

    let mammothInput: Parameters<typeof mammoth.convertToHtml>[0] = {
      arrayBuffer: toArrayBuffer(source)
    };

    if (
      typeof process !== "undefined" &&
      process.versions !== null &&
      process.versions.node !== null
    ) {
      mammothInput = { buffer: Buffer.from(source) };
    }

    const mammothOptions: Parameters<typeof mammoth.convertToHtml>[1] = {
      styleMap: options.styleMap,
      includeEmbeddedStyleMap: options.includeEmbeddedStyleMap,
      includeDefaultStyleMap: options.includeDefaultStyleMap,
      ignoreEmptyParagraphs: options.ignoreEmptyParagraphs,
      idPrefix: options.idPrefix
    };

    if (options.transformDocument) {
      mammothOptions.transformDocument = options.transformDocument;
    }

    const html = await mammoth.convertToHtml(mammothInput, mammothOptions);

    return this.convertHtml(html.value);
  }
}
