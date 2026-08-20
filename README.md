# markitdown-ts

`markitdown-ts` converts various file types to Markdown without filesystem, process, stream, or any other runtime-specific dependencies. It can run in browsers, workers, edge functions, and all other modern JavaScript environments.

## Supported formats

- Plain text, Markdown, CSV, and JSON
- HTML
- XML, RSS, and Atom feeds
- Jupyter notebooks (`.ipynb`)
- Word documents (`.docx`)
- Excel workbooks (`.xlsx`)
- PowerPoint presentations (`.pptx`)
- PDF documents (`.pdf`)
- ZIP archives (`.zip`), with nested files converted recursively
- Wikipedia, YouTube metadata, and Bing result pages supplied as HTML

Audio, image metadata, local-path, and YouTube transcript features from the original project are intentionally left out because their implementations depended on runtime-specific modules, binaries, streams, or filesystem access. They may be added back over time as alternative implementations are found.  Want to see one added? Contributions are welcome!

## Installation

```sh
pnpm install @ryangarber/markitdown-ts
```

## Usage

```ts
import { MarkItDown } from "@ryangarber/markitdown-ts";

const bytes: Uint8Array = /* plain bytes */;

const result = await new MarkItDown().convert(bytes, {
  file_extension: ".txt"
});

console.log(result?.markdown);
```

The same `convert` method accepts:

- `Uint8Array`
- `ArrayBuffer` and `SharedArrayBuffer`
- `DataView` or any other typed array 
- `Blob` and `File`
- `Response`

A `file_extension` is required when the source does not carry a recognized MIME type or filename.

```ts
const file = new File([docxBytes], "document.docx");
const result = await new MarkItDown().convert(file);
```

### URLs

HTTP and HTTPS URLs are fetched with the global `fetch`. Pass a custom implementation when needed.

```ts
const result = await new MarkItDown().convert("https://example.com/article.html");
```

Browser requests remain subject to the remote server's CORS policy.

### Responses

```ts
const response = await fetch("https://example.com/feed.xml");
const result = await new MarkItDown().convert(response);
```

## API

```ts
type ByteSource = Uint8Array | ArrayBufferLike | ArrayBufferView | Blob;
type ConversionSource = ByteSource | Response | URL | string;

class MarkItDown {
  convert(source: ConversionSource, options?: ConverterOptions): Promise<ConverterResult>;

  /** @deprecated Pass the source directly to convert(). */
  convertBuffer(
    source: ByteSource,
    options: ConverterOptions & { file_extension: string }
  ): Promise<ConverterResult>;
}
```

`convertBuffer` remains as a compatibility alias, but `convert(bytes, options)` is preferred.

## Development

```sh
pnpm install
pnpm check
pnpm test --run
pnpm build
```

Biome handles both formatting and linting. `tsup` produces ESM, CommonJS, source maps, and declarations in `dist`.

## License

MIT License © 2026 Ryan Garber\
MIT License © 2024 Vaibhav Raj
