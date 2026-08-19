import { decodeText } from "../bytes";
import { CustomTurnDown } from "../custom-turndown";
import { parseHtmlDocument } from "../html-document";
import type { ConverterOptions, ConverterResult, DocumentConverter } from "../types";

const BING_SEARCH_URL = /^https:\/\/www\.bing\.com\/search\?q=/i;
const BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export class BingSerpConverter implements DocumentConverter {
  async convert(source: Uint8Array, options: ConverterOptions = {}): Promise<ConverterResult> {
    const extension = options.file_extension?.toLowerCase() ?? "";
    const url = options.url ?? "";
    if ((extension !== ".html" && extension !== ".htm") || !BING_SEARCH_URL.test(url)) {
      return null;
    }

    const document = parseHtmlDocument(decodeText(source));
    const query = new URL(url).searchParams.get("q") ?? "";

    document.querySelectorAll(".tptt").forEach((element) => {
      if (element.textContent) {
        element.textContent += " ";
      }
    });
    document.querySelectorAll(".algoSlug_icon").forEach((element) => {
      element.remove();
    });

    const turndown = new CustomTurnDown();
    const results = [...document.querySelectorAll(".b_algo")].map((result) => {
      result.querySelectorAll("a[href]").forEach((anchor) => {
        const href = anchor.getAttribute("href");
        if (!href) {
          return;
        }
        try {
          const encoded = new URL(href, url).searchParams.get("u");
          if (encoded) {
            anchor.setAttribute("href", decodeBingUrl(encoded));
          }
        } catch {
          // Preserve malformed links as they appeared in the source document.
        }
      });

      return turndown
        .convertSoup(result)
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
        .join("\n");
    });

    const markdown = `## A Bing search for '${query}' found the following results:\n\n${results.join("\n\n")}`;
    return { title: document.title || null, markdown, text_content: markdown };
  }
}

function decodeBingUrl(encoded: string): string {
  const input = encoded.slice(2).replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/, "");
  const bytes: number[] = [];
  let bits = 0;
  let bitCount = 0;

  for (const character of input) {
    const value = BASE64_ALPHABET.indexOf(character);
    if (value < 0) {
      return encoded;
    }
    bits = (bits << 6) | value;
    bitCount += 6;
    if (bitCount >= 8) {
      bitCount -= 8;
      bytes.push((bits >> bitCount) & 0xff);
    }
  }

  return new TextDecoder().decode(new Uint8Array(bytes));
}
