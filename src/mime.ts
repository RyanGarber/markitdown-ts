const MIME_EXTENSIONS: Record<string, string> = {
  "application/atom+xml": ".atom",
  "application/json": ".json",
  "application/pdf": ".pdf",
  "application/zip": ".zip",
  "application/rss+xml": ".rss",
  "application/x-pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/xml": ".xml",
  "text/csv": ".csv",
  "text/html": ".html",
  "text/markdown": ".md",
  "text/plain": ".txt",
  "text/xml": ".xml"
};

const TEXT_EXTENSIONS = new Set([".csv", ".json", ".log", ".markdown", ".md", ".text", ".txt"]);

export function extensionFromMime(contentType: string | null | undefined): string | null {
  if (!contentType) {
    return null;
  }

  const mime = contentType.split(";", 1)[0]?.trim().toLowerCase() ?? "";
  return MIME_EXTENSIONS[mime] ?? (mime.startsWith("text/") ? ".txt" : null);
}

export function isTextExtension(extension: string): boolean {
  return TEXT_EXTENSIONS.has(extension.toLowerCase());
}

export function extensionFromPathname(pathname: string): string | null {
  const filename = pathname.split("/").pop() ?? "";
  const dot = filename.lastIndexOf(".");
  return dot > 0 ? filename.slice(dot).toLowerCase() : null;
}
