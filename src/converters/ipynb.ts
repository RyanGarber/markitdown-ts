import { decodeText } from "../bytes";
import type { ConverterOptions, ConverterResult, DocumentConverter } from "../types";

type NotebookCell = {
  cell_type?: string;
  source?: string[];
};

type Notebook = {
  cells?: NotebookCell[];
  metadata?: { title?: string };
};

export class IpynbConverter implements DocumentConverter {
  async convert(source: Uint8Array, options: ConverterOptions = {}): Promise<ConverterResult> {
    if (options.file_extension?.toLowerCase() !== ".ipynb") {
      return null;
    }

    const notebook = JSON.parse(decodeText(source)) as Notebook;
    const output: string[] = [];
    let title: string | null = notebook.metadata?.title ?? null;

    for (const cell of notebook.cells ?? []) {
      const lines = cell.source ?? [];
      if (cell.cell_type === "markdown") {
        output.push(lines.join(""));
        title ??=
          lines
            .find((line) => line.startsWith("# "))
            ?.slice(2)
            .trim() ?? null;
      } else if (cell.cell_type === "code") {
        output.push(`\`\`\`python\n${lines.join("")}\n\`\`\``);
      } else if (cell.cell_type === "raw") {
        output.push(`\`\`\`\n${lines.join("")}\n\`\`\``);
      }
    }

    const markdown = output.join("\n\n");
    return { title, markdown, text_content: markdown };
  }
}
