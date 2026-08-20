import { zipSync } from "fflate";
import { describe, expect, it } from "vitest";
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

  it("converts PDFs from Uint8Array", async () => {
    const result = await new MarkItDown().convert(createPdf("Hello from PDF", "Sample PDF"), {
      file_extension: ".pdf"
    });

    expect(result?.title).toBe("Sample PDF");
    expect(result?.markdown).toContain("Hello from PDF");
  });

  it("infers PDF format from response headers", async () => {
    const result = await new MarkItDown().convert(
      new Response(createPdf("response pdf"), {
        headers: { "content-type": "application/pdf" }
      })
    );

    expect(result?.markdown).toContain("response pdf");
  });

  it("converts spreadsheets from Uint8Array", async () => {
    const result = await new MarkItDown().convert(createXlsx(), { file_extension: ".xlsx" });

    expect(result?.markdown).toContain("## Sheet");
    expect(result?.markdown).toContain("browser");
  });

  it("infers spreadsheet format from response headers", async () => {
    const result = await new MarkItDown().convert(
      new Response(createXlsx(), {
        headers: {
          "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        }
      })
    );

    expect(result?.markdown).toContain("browser");
  });

  it("converts presentations from Uint8Array", async () => {
    const result = await new MarkItDown().convert(createPptx("Hello from PPTX"), {
      file_extension: ".pptx"
    });

    expect(result?.markdown).toContain("<!-- Slide number: 1 -->");
    expect(result?.markdown).toContain("Hello from PPTX");
  });

  it("infers presentation format from response headers", async () => {
    const result = await new MarkItDown().convert(
      new Response(createPptx("response pptx"), {
        headers: {
          "content-type":
            "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        }
      })
    );

    expect(result?.markdown).toContain("response pptx");
  });

  it("converts zip archives from Uint8Array", async () => {
    const archive = zipSync({
      "docs/readme.txt": encoder.encode("hello from zip"),
      "page.html": encoder.encode(
        "<html><head><title>Zipped</title></head><body><h1>Inside</h1></body></html>"
      ),
      "binary.bin": new Uint8Array([0, 1, 2, 3])
    });
    const result = await new MarkItDown().convert(archive, { file_extension: ".zip" });

    expect(result?.title).toBeNull();
    expect(result?.markdown).toContain("Content from the zip file `archive.zip`:");
    expect(result?.markdown).toContain("## File: docs/readme.txt");
    expect(result?.markdown).toContain("hello from zip");
    expect(result?.markdown).toContain("## File: page.html");
    expect(result?.markdown).toContain("# Inside");
    expect(result?.markdown).not.toContain("binary.bin");
  });

  it("converts nested zip archives recursively", async () => {
    const archive = zipSync({
      "readme.txt": encoder.encode("outer file"),
      "nested/inner.zip": zipSync({
        "note.txt": encoder.encode("inner file")
      })
    });
    const result = await new MarkItDown().convert(archive, { file_extension: ".zip" });

    expect(result?.markdown).toContain("## File: readme.txt");
    expect(result?.markdown).toContain("outer file");
    expect(result?.markdown).toContain("## File: nested/inner.zip");
    expect(result?.markdown).toContain("## File: note.txt");
    expect(result?.markdown).toContain("inner file");
  });

  it("infers zip format from response headers", async () => {
    const archive = zipSync({
      "hello.txt": encoder.encode("response zip")
    });
    const result = await new MarkItDown().convert(
      new Response(archive, {
        headers: { "content-type": "application/zip" }
      })
    );

    expect(result?.markdown).toContain("response zip");
  });

  it("uses the source URL in the zip heading", async () => {
    const archive = zipSync({
      "hello.txt": encoder.encode("named zip")
    });
    const result = await new MarkItDown().convert("https://example.com/files/example.zip", {
      fetch: async () =>
        new Response(archive, {
          headers: { "content-type": "application/zip" }
        })
    });

    expect(result?.markdown).toContain(
      "Content from the zip file `https://example.com/files/example.zip`:"
    );
    expect(result?.markdown).toContain("named zip");
  });

  it("rejects local paths and unsupported URL protocols", async () => {
    await expect(new MarkItDown().convert("document.txt")).rejects.toThrow();
    await expect(new MarkItDown().convert("file:///document.txt")).rejects.toThrow(
      "Unsupported URL protocol"
    );
  });
});

function createXlsx(): Uint8Array<ArrayBuffer> {
  return zipOfficeDocument({
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Sheet" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`,
    "xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`,
    "xl/worksheets/sheet1.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1">
      <c r="A1" t="inlineStr"><is><t>name</t></is></c>
      <c r="B1" t="inlineStr"><is><t>value</t></is></c>
    </row>
    <row r="2">
      <c r="A2" t="inlineStr"><is><t>browser</t></is></c>
      <c r="B2"><v>1</v></c>
    </row>
  </sheetData>
</worksheet>`
  });
}

function createPptx(text: string): Uint8Array<ArrayBuffer> {
  const presentationNs = "http://schemas.openxmlformats.org/presentationml/2006/main";
  const drawingNs = "http://schemas.openxmlformats.org/drawingml/2006/main";
  const relNs = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  const packageRelNs = "http://schemas.openxmlformats.org/package/2006/relationships";
  const contentTypesNs = "http://schemas.openxmlformats.org/package/2006/content-types";

  return zipOfficeDocument({
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="${contentTypesNs}">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
</Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="${packageRelNs}">
  <Relationship Id="rId1" Type="${relNs}/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`,
    "ppt/presentation.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="${drawingNs}" xmlns:r="${relNs}" xmlns:p="${presentationNs}">
  <p:sldMasterIdLst/>
  <p:sldIdLst>
    <p:sldId id="256" r:id="rId1"/>
  </p:sldIdLst>
  <p:sldSz cx="12192000" cy="6858000"/>
  <p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`,
    "ppt/_rels/presentation.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="${packageRelNs}">
  <Relationship Id="rId1" Type="${relNs}/slide" Target="slides/slide1.xml"/>
</Relationships>`,
    "ppt/slides/_rels/slide1.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="${packageRelNs}"/>`,
    "ppt/slides/slide1.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="${drawingNs}" xmlns:r="${relNs}" xmlns:p="${presentationNs}">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="Title"/>
          <p:cNvSpPr txBox="1"/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="457200" y="457200"/>
            <a:ext cx="10972800" cy="1371600"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle/>
          <a:p>
            <a:r>
              <a:t>${escapeXml(text)}</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`
  });
}

function zipOfficeDocument(files: Record<string, string>): Uint8Array<ArrayBuffer> {
  const entries: Record<string, Uint8Array> = {};
  for (const [name, contents] of Object.entries(files)) {
    entries[name] = encoder.encode(contents);
  }
  return zipSync(entries);
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function createPdf(text: string, title?: string): ArrayBuffer {
  const stream = `BT /F1 12 Tf 72 720 Td (${escapePdfString(text)}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
  ];

  let trailerExtra = "";
  if (title) {
    objects.push(`<< /Title (${escapePdfString(title)}) >>`);
    trailerExtra = " /Info 6 0 R";
  }

  let body = "%PDF-1.4\n";
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(body.length);
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }

  const xrefStart = body.length;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index++) {
    xref += `${String(offsets[index] ?? 0).padStart(10, "0")} 00000 n \n`;
  }

  body += xref;
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R${trailerExtra} >>\n`;
  body += `startxref\n${xrefStart}\n%%EOF\n`;
  const bytes = encoder.encode(body);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function escapePdfString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}
