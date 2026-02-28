import type { Presentation } from '../store/types';

export const AUTOSAVE_KEY = 'prsnt:lastPresentation';

export function savePresentation(presentation: Presentation): void {
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(presentation));
  } catch {
    // Non-blocking by design.
  }
}

export function loadPresentation(): Presentation | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as Presentation;
  } catch {
    return null;
  }
}
