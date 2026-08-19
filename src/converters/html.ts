import { decodeText } from "../bytes";
import { CustomTurnDown } from "../custom-turndown";
import { parseHtmlDocument } from "../html-document";
import type { ConverterOptions, ConverterResult, DocumentConverter } from "../types";

export class HtmlConverter implements DocumentConverter {
  async convert(source: Uint8Array, options: ConverterOptions): Promise<ConverterResult> {
    const extension = options.file_extension?.toLowerCase() ?? "";
    if (extension !== ".html" && extension !== ".htm") {
      return null;
    }

    return this.convertHtml(decodeText(source));
  }

  async convertHtml(html: string): Promise<ConverterResult> {
    const document = parseHtmlDocument(html);

    const title = document.title;
    document.querySelectorAll("script, style, title").forEach((element) => {
      element.remove();
    });

    const markdown = new CustomTurnDown().convertSoup(document);
    return {
      title: title || null,
      markdown,
      text_content: markdown
    };
  }
}
