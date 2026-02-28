const IMAGE_EXTENSIONS = ['.png', '.gif', '.jpg', '.jpeg', '.webp', '.svg'];

export function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return '';
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol) {
      return trimmed;
    }
  } catch {
    // fall through
  }
  return `https://${trimmed}`;
}

export function isImageUrl(raw: string): boolean {
  const normalized = normalizeUrl(raw).toLowerCase();
  const [path] = normalized.split('?');
  return IMAGE_EXTENSIONS.some((ext) => path.endsWith(ext));
}

export function parseTextPresentation(contents: string): string[] {
  return contents
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function toTextPresentation(urls: string[]): string {
  return `${urls.join('\n')}\n`;
}
