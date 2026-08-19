import { decodeText } from "../bytes";
import { CustomTurnDown } from "../custom-turndown";
import { parseHtmlDocument } from "../html-document";
import type { ConverterOptions, ConverterResult, DocumentConverter } from "../types";

const WIKIPEDIA_URL = /^https?:\/\/[a-z]{2,3}\.wikipedia\.org\//i;

export class WikipediaConverter implements DocumentConverter {
  async convert(source: Uint8Array, options: ConverterOptions = {}): Promise<ConverterResult> {
    const extension = options.file_extension?.toLowerCase() ?? "";
    if ((extension !== ".html" && extension !== ".htm") || !WIKIPEDIA_URL.test(options.url ?? "")) {
      return null;
    }

    const document = parseHtmlDocument(decodeText(source));
    document.querySelectorAll("script, style").forEach((element) => {
      element.remove();
    });

    const body = document.querySelector("div#mw-content-text");
    const pageTitle = document.querySelector("span.mw-page-title-main")?.textContent?.trim();
    const title = pageTitle || document.title || null;
    const markdown = body
      ? `# ${title ?? "Wikipedia"}\n\n${new CustomTurnDown().convertSoup(body)}`
      : new CustomTurnDown().convertSoup(document);

    return { title, markdown, text_content: markdown };
  }
}
