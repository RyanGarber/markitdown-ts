import { readFile } from "node:fs/promises";
import { Command } from "@commander-js/extra-typings";
import { version } from "../package.json" with { type: "json" };
import { MarkItDown } from "./markitdown";

const command = new Command()
  .name("markitdown")
  .version(version)
  .argument("<file>", "The file to convert to Markdown")
  .action(async (file) => {
    const extension = file.split(".").pop()?.toLowerCase();
    const bytes = await readFile(file);
    const result = await new MarkItDown().convert(new Uint8Array(bytes), {
      file_extension: extension
    });
    console.log(result);
  });

command.parse();
