export type ConverterResult = {
  title: string | null;
  markdown: string;
  /** @deprecated Use `markdown` instead. */
  text_content: string;
} | null;

/**
 * In-memory inputs supported by the conversion API.
 *
 * `Uint8Array` is the preferred type. Other typed arrays, data views,
 * array buffers, shared array buffers, blobs, and files are normalized to it.
 */
export type ByteSource = Uint8Array | ArrayBufferLike | ArrayBufferView | Blob;

export type ConverterOptions = {
  /** Required for byte sources unless the source MIME type identifies the format. */
  file_extension?: string;
  /** Original URL, used by site-specific HTML converters. */
  url?: string;
  /** Override the global fetch implementation. */
  fetch?: typeof fetch;
  /** Mammoth style mapping used by the DOCX converter. */
  styleMap?: string | string[];
  includeEmbeddedStyleMap?: boolean;
  includeDefaultStyleMap?: boolean;
  ignoreEmptyParagraphs?: boolean;
  idPrefix?: string;
  transformDocument?: (element: unknown) => unknown;
  _parent_converters?: DocumentConverter[];
  debug?: boolean;
};

export interface DocumentConverter {
  convert(source: Uint8Array, options: ConverterOptions): Promise<ConverterResult>;
}
