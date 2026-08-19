import { decodeText } from "../bytes";
import { isTextExtension } from "../mime";
import type { ConverterOptions, ConverterResult, DocumentConverter } from "../types";

export class PlainTextConverter implements DocumentConverter {
  async convert(source: Uint8Array, options: ConverterOptions = {}): Promise<ConverterResult> {
    if (!isTextExtension(options.file_extension ?? "")) {
      return null;
    }

    const content = decodeText(source);
    return { title: null, markdown: content, text_content: content };
  }
}
