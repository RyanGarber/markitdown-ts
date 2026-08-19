# markitdown-ts

`markitdown-ts` converts web-native document data to Markdown without filesystem, process, stream, or other runtime-specific dependencies. It is designed for browsers, workers, edge functions, and all other modern JavaScript environments.

## Supported formats

- Plain text, Markdown, CSV, and JSON
- HTML
- XML, RSS, and Atom feeds
- Jupyter notebooks (`.ipynb`)
- Word documents (`.docx`)
- Excel workbooks (`.xlsx`)
- Wikipedia, YouTube metadata, and Bing result pages supplied as HTML

PDF, archive, audio, image metadata, local-path, and YouTube transcript features from the original project are intentionally not included because their implementations depended on runtime-specific modules, binaries, streams, or filesystem access.

## Installation

```sh
npm install @ryangarber/markitdown-ts
```

## Usage

### `Uint8Array` (preferred)

```ts
import { MarkItDown } from "markitdown-ts";

const bytes = new TextEncoder().encode("Hello from the web");
const result = await new MarkItDown().convert(bytes, {
  file_extension: ".txt"
});

console.log(result?.markdown);
```

Any `Uint8Array` subclass is accepted as well. This keeps byte data from other modern JavaScript runtimes interoperable without requiring runtime-specific types.

### Other in-memory sources

The same `convert` method accepts:

- `ArrayBuffer` and `SharedArrayBuffer`
- Any typed array or `DataView`
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

MIT License © 2024 Vaibhav Raj
