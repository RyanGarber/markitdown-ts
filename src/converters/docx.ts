import mammoth from "mammoth";
import { toArrayBuffer } from "../bytes";
import type { ConverterOptions, ConverterResult } from "../types";
import { HtmlConverter } from "./html";

export class DocxConverter extends HtmlConverter {
  async convert(source: Uint8Array, options: ConverterOptions): Promise<ConverterResult> {
    if (options.file_extension?.toLowerCase() !== ".docx") {
      return null;
    }

    const html = await mammoth.convertToHtml(
      { arrayBuffer: toArrayBuffer(source) },
      {
        styleMap: options.styleMap,
        includeEmbeddedStyleMap: options.includeEmbeddedStyleMap,
        includeDefaultStyleMap: options.includeDefaultStyleMap,
        ignoreEmptyParagraphs: options.ignoreEmptyParagraphs,
        idPrefix: options.idPrefix,
        transformDocument: options.transformDocument
      }
    );
    return this.convertHtml(html.value);
  }
}
