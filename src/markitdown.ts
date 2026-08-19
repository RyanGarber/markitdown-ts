import { isBlob, toUint8Array } from "./bytes";
import { BingSerpConverter } from "./converters/bingserp";
import { DocxConverter } from "./converters/docx";
import { HtmlConverter } from "./converters/html";
import { IpynbConverter } from "./converters/ipynb";
import { PdfConverter } from "./converters/pdf";
import { PlainTextConverter } from "./converters/plain-text";
import { WikipediaConverter } from "./converters/wikipedia";
import { XlsxConverter } from "./converters/xlsx";
import { RSSConverter } from "./converters/xml-rss-atom";
import { YouTubeConverter } from "./converters/youtube";
import { ZipConverter } from "./converters/zip";
import { extensionFromMime, extensionFromPathname } from "./mime";
import type { ByteSource, ConverterOptions, ConverterResult, DocumentConverter } from "./types";

export type ConversionSource = ByteSource | Response | URL | string;

export class MarkItDown {
  private readonly converters: DocumentConverter[] = [];

  constructor() {
    this.registerConverter(new PlainTextConverter());
    this.registerConverter(new HtmlConverter());
    this.registerConverter(new ZipConverter());
    this.registerConverter(new RSSConverter());
    this.registerConverter(new WikipediaConverter());
    this.registerConverter(new YouTubeConverter());
    this.registerConverter(new BingSerpConverter());
    this.registerConverter(new DocxConverter());
    this.registerConverter(new XlsxConverter());
    this.registerConverter(new PdfConverter());
    this.registerConverter(new IpynbConverter());
  }

  /** Convert a URL, response, blob, array buffer, data view, or typed array. */
  async convert(
    source: ConversionSource,
    options: ConverterOptions = {}
  ): Promise<ConverterResult> {
    if (typeof source === "string" || source instanceof URL) {
      return this.convertUrl(source.toString(), options);
    }

    if (isResponse(source)) {
      return this.convertResponse(source, options);
    }

    const extensions = new Set<string>();
    this.addExtension(extensions, options.file_extension?.replace(/^\./, ""));

    if (isBlob(source)) {
      this.addExtension(extensions, extensionFromMime(source.type));
      if ("name" in source && typeof source.name === "string") {
        this.addExtension(extensions, extensionFromPathname(source.name));
      }
    }

    if (extensions.size === 0) {
      throw new Error(
        "Could not determine the file type. Provide `file_extension` when converting bytes."
      );
    }

    return this.convertBytes(await toUint8Array(source), extensions, options);
  }

  /**
   * @deprecated Pass the byte source directly to `convert`.
   */
  async convertBuffer(
    source: ByteSource,
    options: ConverterOptions & { file_extension: string }
  ): Promise<ConverterResult> {
    return this.convert(source, options);
  }

  private async convertUrl(
    source: string,
    { fetch: fetchImplementation = globalThis.fetch, ...options }: ConverterOptions
  ): Promise<ConverterResult> {
    const url = new URL(source);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error(`Unsupported URL protocol: ${url.protocol}`);
    }
    if (!fetchImplementation) {
      throw new Error("No fetch implementation is available.");
    }

    const response = await fetchImplementation(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${url}, status: ${response.status}`);
    }

    return this.convertResponse(response, { ...options, url: url.toString() });
  }

  private async convertResponse(
    response: Response,
    options: ConverterOptions
  ): Promise<ConverterResult> {
    const extensions = new Set<string>();
    this.addExtension(extensions, options.file_extension);
    this.addExtension(extensions, extensionFromMime(response.headers.get("content-type")));

    const disposition = response.headers.get("content-disposition") ?? "";
    const filename = disposition.match(/filename\*?=(?:UTF-8''|["']?)([^;"']+)/i)?.[1];
    if (filename) {
      this.addExtension(extensions, extensionFromPathname(decodeURIComponent(filename.trim())));
    }

    const responseUrl = options.url || response.url;
    if (responseUrl) {
      this.addExtension(extensions, extensionFromPathname(new URL(responseUrl).pathname));
    }

    if (extensions.size === 0) {
      throw new Error(
        "Could not determine the file type. Provide `file_extension` or a Content-Type header."
      );
    }

    return this.convertBytes(new Uint8Array(await response.arrayBuffer()), extensions, {
      ...options,
      url: responseUrl
    });
  }

  private async convertBytes(
    source: Uint8Array,
    extensions: Set<string>,
    options: ConverterOptions
  ): Promise<ConverterResult> {
    let lastError: unknown;

    for (const extension of extensions) {
      for (const converter of this.converters) {
        try {
          const result = await converter.convert(source, {
            ...options,
            file_extension: extension,
            _parent_converters: this.converters
          });
          if (result) {
            result.markdown = result.markdown
              .replace(/\r\n|\r|\n/g, "\n")
              .trim()
              .replace(/\n{3,}/g, "\n\n");
            result.text_content = result.markdown;
            return result;
          }
        } catch (error) {
          if (options.debug) {
            console.error("Converter threw error:", error);
          }
          lastError = error;
        }
      }
    }

    const formats = [...extensions].join(", ");
    if (lastError) {
      throw new Error(`Could not convert ${formats} to Markdown: ${String(lastError)}`);
    }
    throw new Error(`Unsupported file type: ${formats}.`);
  }

  private addExtension(extensions: Set<string>, extension: string | null | undefined): void {
    if (!extension) {
      return;
    }
    extensions.add(
      extension.startsWith(".") ? extension.toLowerCase() : `.${extension.toLowerCase()}`
    );
  }

  private registerConverter(converter: DocumentConverter): void {
    this.converters.unshift(converter);
  }
}

function isResponse(value: unknown): value is Response {
  return typeof Response !== "undefined" && value instanceof Response;
}
