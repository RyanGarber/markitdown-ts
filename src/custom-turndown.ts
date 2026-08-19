import turndownPluginGfm from "@joplin/turndown-plugin-gfm";
import TurndownService from "turndown";

export class CustomTurnDown {
  convertSoup(document: string | Node): string {
    const service = new TurndownService({ headingStyle: "atx" });
    service.use(turndownPluginGfm.gfm);

    service.addRule("anchor tags", {
      filter: ["a"],
      replacement(content, node) {
        if (!content) return "";

        const prefix = content.startsWith(" ") ? " " : "";
        const suffix = content.endsWith(" ") ? " " : "";
        const text = content.trim().replace(/\n\n.*/g, "");
        if (!text) return "";

        const element = node as unknown as Element;
        const href = element.getAttribute("href");
        let title = element.getAttribute("title") ?? "";
        if (!href) return `${prefix}${text}${suffix}`;

        try {
          const url = new URL(href);
          if (url.protocol !== "https:" && url.protocol !== "http:") {
            return `${prefix}${text}${suffix}`;
          }
        } catch {
          if (
            !href.startsWith("/") &&
            !href.startsWith("#") &&
            !href.startsWith("./") &&
            !href.startsWith("../")
          ) {
            return `${prefix}${text}${suffix}`;
          }
        }

        if (text.replace(/\\_/g, "_") === href && !title) {
          return `<${href}>`;
        }
        if (!title) title = href;
        return `${prefix}[${text}](${href}${title ? ` "${title}"` : ""})${suffix}`;
      }
    });

    service.addRule("img tags", {
      filter: ["img"],
      replacement(_content, node) {
        const element = node as unknown as Element;
        const alt = element.getAttribute("alt") ?? "";
        let source = element.getAttribute("src") ?? "";
        const title = element.getAttribute("title");
        if (source.startsWith("data:")) {
          source = `${source.split(",", 1)[0]}...`;
        }
        return `![${alt}](${source}${title ? ` "${title}"` : ""})`;
      }
    });

    return service.turndown(document as TurndownService.Node);
  }
}
