export function sanitizeStoryText(input: string | null | undefined): string {
  if (!input) return '';

  // Replace em dash and en dash with commas for consistent pause pacing
  let sanitized = input.replace(/[—–]/g, ',');

  // Process line by line to preserve intentional newlines
  sanitized = sanitized
    .split(/\r?\n/)
    .map((line) => {
      // Collapse multiple spaces within each line
      let cleanedLine = line.replace(/[ \t]{2,}/g, ' ');

      // Remove spaces before punctuation
      cleanedLine = cleanedLine.replace(/\s+([,.;:!?])/g, '$1');

      // Ensure a single space after commas and periods
      cleanedLine = cleanedLine
        .replace(/,\s*/g, ', ')
        .replace(/\.\s*/g, '. ')
        .replace(/!\s*/g, '! ')
        .replace(/\?\s*/g, '? ');

      return cleanedLine.trim();
    })
    .join('\n');

  // Collapse multiple blank lines
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n');

  return sanitized.trim();
}
