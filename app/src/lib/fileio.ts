import { parseTextPresentation, toTextPresentation } from './urls';

export async function importFromTextFile(file: File): Promise<string[]> {
  const contents = await file.text();
  return parseTextPresentation(contents);
}

export function downloadTextPresentation(filename: string, urls: string[]): void {
  const blob = new Blob([toTextPresentation(urls)], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
