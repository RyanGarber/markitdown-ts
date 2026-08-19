import { unzipSync } from "fflate";
import { extensionFromPathname } from "../mime";
import type { ConverterOptions, ConverterResult, DocumentConverter } from "../types";

export class ZipConverter implements DocumentConverter {
  async convert(source: Uint8Array, options: ConverterOptions = {}): Promise<ConverterResult> {
    if (options.file_extension?.toLowerCase() !== ".zip") {
      return null;
    }

    const files = unzipSync(source, {
      filter: (file) => !file.name.endsWith("/")
    });
    const converters = options._parent_converters ?? [];
    const zipName = options.url ?? "archive.zip";
    const sections = [`Content from the zip file \`${zipName}\`:`];

    for (const [name, bytes] of Object.entries(files)) {
      const result = await convertEntry(bytes, name, converters, options);
      if (result) {
        sections.push(`## File: ${name}\n\n${result.markdown}`);
      }
    }

    const markdown = sections.join("\n\n");
    return { title: null, markdown, text_content: markdown };
  }
}

async function convertEntry(
  source: Uint8Array,
  name: string,
  converters: DocumentConverter[],
  options: ConverterOptions
): Promise<ConverterResult> {
  const extension = extensionFromPathname(name);
  if (!extension) {
    return null;
  }

  const entryOptions: ConverterOptions = {
    ...options,
    file_extension: extension,
    url: undefined,
    _parent_converters: converters
  };

  for (const converter of converters) {
    try {
      const result = await converter.convert(source, entryOptions);
      if (result) {
        return result;
      }
    } catch {
      // Match the original ZipConverter: skip entries that fail conversion.
    }
  }

  return null;
}
