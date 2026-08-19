import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { MarkItDown } from "../src";

const encoder = new TextEncoder();

describe("MarkItDown", () => {
  it("treats Uint8Array as a first-class source", async () => {
    const result = await new MarkItDown().convert(encoder.encode("hello\n\n\nworld"), {
      file_extension: ".txt"
    });

    expect(result).toEqual({
      title: null,
      markdown: "hello\n\nworld",
      text_content: "hello\n\nworld"
    });
  });

  it.each([
    ["ArrayBuffer", "array buffer", () => encoder.encode("array buffer").buffer],
    [
      "DataView",
      "data view",
      () => {
        const bytes = encoder.encode("data view");
        return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      }
    ],
    ["Blob", "blob", () => new Blob(["blob"], { type: "text/plain" })]
  ])("normalizes %s sources", async (_name, expected, createSource) => {
    const result = await new MarkItDown().convert(createSource(), {
      file_extension: ".txt"
    });
    expect(result?.markdown).toBe(expected);
  });

  it("infers formats from response headers", async () => {
    const response = new Response("response body", {
      headers: { "content-type": "text/plain; charset=utf-8" }
    });
    const result = await new MarkItDown().convert(response);
    expect(result?.markdown).toBe("response body");
  });

  it("fetches URL sources with an injectable fetch implementation", async () => {
    const result = await new MarkItDown().convert("https://example.com/article.html", {
      fetch: async () =>
        new Response(
          "<html><head><title>Example</title></head><body><h1>Hello</h1></body></html>",
          {
            headers: { "content-type": "text/html" }
          }
        )
    });

    expect(result?.title).toBe("Example");
    expect(result?.markdown).toBe("# Hello");
  });

  it("converts notebooks from bytes", async () => {
    const notebook = {
      metadata: { title: "Notebook" },
      cells: [
        { cell_type: "markdown", source: ["# Intro"] },
        { cell_type: "code", source: ["print(42)"] }
      ]
    };
    const result = await new MarkItDown().convert(encoder.encode(JSON.stringify(notebook)), {
      file_extension: ".ipynb"
    });

    expect(result?.title).toBe("Notebook");
    expect(result?.markdown).toContain("```python\nprint(42)\n```");
  });

  it("converts spreadsheets from Uint8Array", async () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ["name", "value"],
        ["browser", 1]
      ]),
      "Sheet"
    );
    const bytes = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as Uint8Array;
    const result = await new MarkItDown().convert(bytes, { file_extension: ".xlsx" });

    expect(result?.markdown).toContain("## Sheet");
    expect(result?.markdown).toContain("browser");
  });

  it("rejects local paths and unsupported URL protocols", async () => {
    await expect(new MarkItDown().convert("document.txt")).rejects.toThrow();
    await expect(new MarkItDown().convert("file:///document.txt")).rejects.toThrow(
      "Unsupported URL protocol"
    );
  });
});
