import type { Document, Element } from "@xmldom/xmldom";
import { DOMParser } from "@xmldom/xmldom";
import { decodeText } from "../bytes";
import { CustomTurnDown } from "../custom-turndown";
import { parseHtmlDocument } from "../html-document";
import type { ConverterOptions, ConverterResult, DocumentConverter } from "../types";

export class RSSConverter implements DocumentConverter {
  async convert(source: Uint8Array, options: ConverterOptions = {}): Promise<ConverterResult> {
    const extension = options.file_extension?.toLowerCase() ?? "";
    if (![".xml", ".rss", ".atom"].includes(extension)) {
      return null;
    }

    const document = new DOMParser().parseFromString(decodeText(source), "text/xml");
    if (document.getElementsByTagName("rss").length > 0) {
      return this.parseRss(document);
    }
    if (document.getElementsByTagName("feed")[0]?.getElementsByTagName("entry").length) {
      return this.parseAtom(document);
    }
    return null;
  }

  private parseAtom(document: Document): ConverterResult {
    const root = document.getElementsByTagName("feed")[0];
    if (!root) return null;

    const title = getText(root, "title");
    const subtitle = getText(root, "subtitle");
    const sections = [`# ${title ?? "Feed"}`];
    if (subtitle) sections.push(subtitle);

    for (const entry of [...root.getElementsByTagName("entry")]) {
      const entryTitle = getText(entry, "title");
      const updated = getText(entry, "updated");
      const summary = getText(entry, "summary");
      const content = getText(entry, "content");
      const lines: string[] = [];
      if (entryTitle) lines.push(`## ${entryTitle}`);
      if (updated) lines.push(`Updated on: ${updated}`);
      if (summary) lines.push(parseContent(summary));
      if (content) lines.push(parseContent(content));
      sections.push(lines.join("\n"));
    }

    const markdown = sections.join("\n\n");
    return { title, markdown, text_content: markdown };
  }

  private parseRss(document: Document): ConverterResult {
    const channel = document.getElementsByTagName("rss")[0]?.getElementsByTagName("channel")[0];
    if (!channel) return null;

    const title = getText(channel, "title");
    const description = getText(channel, "description");
    const sections: string[] = title ? [`# ${title}`] : [];
    if (description) sections.push(description);

    for (const item of [...channel.getElementsByTagName("item")]) {
      const itemTitle = getText(item, "title");
      const published = getText(item, "pubDate");
      const itemDescription = getText(item, "description");
      const content = getText(item, "content:encoded");
      const lines: string[] = [];
      if (itemTitle) lines.push(`## ${itemTitle}`);
      if (published) lines.push(`Published on: ${published}`);
      if (itemDescription) lines.push(parseContent(itemDescription));
      if (content) lines.push(parseContent(content));
      sections.push(lines.join("\n"));
    }

    const markdown = sections.join("\n\n");
    return { title, markdown, text_content: markdown };
  }
}

function parseContent(content: string): string {
  return new CustomTurnDown().convertSoup(parseHtmlDocument(content).documentElement);
}

function getText(element: Element, tagName: string): string | null {
  const node = element.getElementsByTagName(tagName)[0];
  return node?.textContent?.trim() || null;
}
