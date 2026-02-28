import { create } from 'zustand';
import { makeId } from '../lib/ids';
import { loadPresentation, savePresentation } from '../lib/persistence';
import type { Presentation, Slide } from './types';

const ZOOM_STEP = 0.1;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 5.0;

type PresentationStore = {
  presentation: Presentation;
  isPresenting: boolean;
  selectedSlideId?: string;
  statusNotice?: string;
  setNotice: (message?: string) => void;
  restoreAutosave: () => void;
  addSlide: (url?: string) => void;
  updateSlide: (id: string, url: string) => void;
  deleteSlide: (id: string) => void;
  reorderSlides: (from: number, to: number) => void;
  selectSlide: (id?: string) => void;
  goToIndex: (index: number) => void;
  nextSlide: () => void;
  previousSlide: () => void;
  setSlidesFromUrls: (urls: string[]) => void;
  setTitle: (title: string) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomReset: () => void;
  setPresenting: (value: boolean) => void;
};

function defaultPresentation(): Presentation {
  return {
    id: makeId(),
    title: 'Untitled Presentation',
    slides: [{ id: makeId(), url: 'https://example.com' }],
    currentIndex: 0,
    zoomLevel: 1.0,
  };
}

function clampIndex(index: number, length: number): number {
  if (length <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(index, length - 1));
}

function persist(state: PresentationStore): void {
  savePresentation(state.presentation);
}

const initialPresentation = defaultPresentation();

export const usePresentationStore = create<PresentationStore>((set, get) => ({
  presentation: initialPresentation,
  isPresenting: false,
  selectedSlideId: initialPresentation.slides[0]?.id,
  statusNotice: undefined,

  setNotice: (message) => set({ statusNotice: message }),

  restoreAutosave: () => {
    const loaded = loadPresentation();
    if (!loaded) {
      return;
    }
    const slides = loaded.slides?.length ? loaded.slides : [{ id: makeId(), url: 'https://example.com' }];
    const sanitizedSlides = slides.map((slide) => ({
      id: slide.id || makeId(),
      url: slide.url ?? '',
    }));
    const restoredIndex = clampIndex(loaded.currentIndex || 0, sanitizedSlides.length);
    set({
      presentation: {
        id: loaded.id || makeId(),
        title: loaded.title || 'Untitled Presentation',
        slides: sanitizedSlides,
        currentIndex: restoredIndex,
        zoomLevel:
          typeof loaded.zoomLevel === 'number'
            ? Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, loaded.zoomLevel))
            : 1.0,
      },
      selectedSlideId: sanitizedSlides[restoredIndex]?.id,
    });
  },

  addSlide: (url = 'https://example.com') => {
    set((state) => {
      const newSlide: Slide = { id: makeId(), url };
      const slides = [...state.presentation.slides, newSlide];
      const next = {
        ...state,
        presentation: {
          ...state.presentation,
          slides,
          currentIndex: slides.length - 1,
        },
        selectedSlideId: newSlide.id,
      };
      persist(next);
      return next;
    });
  },

  updateSlide: (id, url) => {
    set((state) => {
      const slides = state.presentation.slides.map((slide) => (slide.id === id ? { ...slide, url } : slide));
      const next = {
        ...state,
        presentation: {
          ...state.presentation,
          slides,
        },
      };
      persist(next);
      return next;
    });
  },

  deleteSlide: (id) => {
    set((state) => {
      const idx = state.presentation.slides.findIndex((s) => s.id === id);
      if (idx < 0) {
        return state;
      }
      const slides = state.presentation.slides.filter((s) => s.id !== id);
      const effectiveSlides = slides.length ? slides : [{ id: makeId(), url: 'https://example.com' }];
      const currentIndex = clampIndex(state.presentation.currentIndex, effectiveSlides.length);
      const selectedSlideId = effectiveSlides[currentIndex]?.id;
      const next = {
        ...state,
        presentation: {
          ...state.presentation,
          slides: effectiveSlides,
          currentIndex,
        },
        selectedSlideId,
      };
      persist(next);
      return next;
    });
  },

  reorderSlides: (from, to) => {
    set((state) => {
      if (
        from < 0 ||
        to < 0 ||
        from >= state.presentation.slides.length ||
        to >= state.presentation.slides.length ||
        from === to
      ) {
        return state;
      }
      const slides = [...state.presentation.slides];
      const [moved] = slides.splice(from, 1);
      slides.splice(to, 0, moved);

      const currentSlide = state.presentation.slides[state.presentation.currentIndex];
      const currentIndex = clampIndex(
        slides.findIndex((s) => s.id === currentSlide?.id),
        slides.length
      );

      const next = {
        ...state,
        presentation: {
          ...state.presentation,
          slides,
          currentIndex,
        },
      };
      persist(next);
      return next;
    });
  },

  selectSlide: (id) => {
    set((state) => {
      if (!id) {
        return { ...state, selectedSlideId: undefined };
      }
      const index = state.presentation.slides.findIndex((slide) => slide.id === id);
      if (index < 0) {
        return state;
      }
      const next = {
        ...state,
        selectedSlideId: id,
        presentation: {
          ...state.presentation,
          currentIndex: index,
        },
      };
      persist(next);
      return next;
    });
  },

  goToIndex: (index) => {
    set((state) => {
      const nextIndex = clampIndex(index, state.presentation.slides.length);
      const next = {
        ...state,
        presentation: {
          ...state.presentation,
          currentIndex: nextIndex,
        },
        selectedSlideId: state.presentation.slides[nextIndex]?.id,
      };
      persist(next);
      return next;
    });
  },

  nextSlide: () => {
    set((state) => {
      const length = state.presentation.slides.length;
      const nextIndex = length ? (state.presentation.currentIndex + 1) % length : 0;
      const next = {
        ...state,
        presentation: {
          ...state.presentation,
          currentIndex: nextIndex,
        },
        selectedSlideId: state.presentation.slides[nextIndex]?.id,
      };
      persist(next);
      return next;
    });
  },

  previousSlide: () => {
    set((state) => {
      const length = state.presentation.slides.length;
      const nextIndex = length ? (state.presentation.currentIndex - 1 + length) % length : 0;
      const next = {
        ...state,
        presentation: {
          ...state.presentation,
          currentIndex: nextIndex,
        },
        selectedSlideId: state.presentation.slides[nextIndex]?.id,
      };
      persist(next);
      return next;
    });
  },

  setSlidesFromUrls: (urls) => {
    set((state) => {
      const slides = urls.length
        ? urls.map((url) => ({ id: makeId(), url }))
        : [{ id: makeId(), url: 'https://example.com' }];
      const next = {
        ...state,
        presentation: {
          ...state.presentation,
          slides,
          currentIndex: 0,
        },
        selectedSlideId: slides[0]?.id,
      };
      persist(next);
      return next;
    });
  },

  setTitle: (title) => {
    set((state) => {
      const next = {
        ...state,
        presentation: {
          ...state.presentation,
          title,
        },
      };
      persist(next);
      return next;
    });
  },

  zoomIn: () => {
    set((state) => {
      const next = {
        ...state,
        presentation: {
          ...state.presentation,
          zoomLevel: Math.min(MAX_ZOOM, state.presentation.zoomLevel + ZOOM_STEP),
        },
      };
      persist(next);
      return next;
    });
  },

  zoomOut: () => {
    set((state) => {
      const next = {
        ...state,
        presentation: {
          ...state.presentation,
          zoomLevel: Math.max(MIN_ZOOM, state.presentation.zoomLevel - ZOOM_STEP),
        },
      };
      persist(next);
      return next;
    });
  },

  zoomReset: () => {
    set((state) => {
      const next = {
        ...state,
        presentation: {
          ...state.presentation,
          zoomLevel: 1.0,
        },
      };
      persist(next);
      return next;
    });
  },

  setPresenting: (value) => set({ isPresenting: value }),
}));

export function currentSlide(state: PresentationStore): Slide | undefined {
  return state.presentation.slides[state.presentation.currentIndex];
}

export function currentStatus(state: PresentationStore) {
  const slide = currentSlide(state);
  return {
    slide: state.presentation.currentIndex + 1,
    total: state.presentation.slides.length,
    presenting: state.isPresenting,
    url: slide?.url ?? '',
  };
}
