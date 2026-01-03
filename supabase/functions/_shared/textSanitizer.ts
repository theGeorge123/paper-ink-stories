export function sanitizeStoryText(input: string | null | undefined): string {
  if (!input) return "";

  let sanitized = input.replace(/[—–]/g, ",");

  sanitized = sanitized
    .split(/\r?\n/)
    .map((line) => {
      let cleanedLine = line.replace(/[ \t]{2,}/g, " ");
      cleanedLine = cleanedLine.replace(/\s+([,.;:!?])/g, "$1");
      cleanedLine = cleanedLine
        .replace(/,\s*/g, ", ")
        .replace(/\.\s*/g, ". ")
        .replace(/!\s*/g, "! ")
        .replace(/\?\s*/g, "? ");

      return cleanedLine.trim();
    })
    .join("\n");

  sanitized = sanitized.replace(/\n{3,}/g, "\n\n");

  return sanitized.trim();
}
