import { useEffect, useState } from 'react';
import { SlideCanvas } from '../../components/SlideCanvas';
import { parseTextPresentation } from '../../lib/urls';

type PublishedDeck = {
  title?: string;
  slides: string[];
};

export function ViewRoute() {
  const [slides, setSlides] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [title, setTitle] = useState('Published Presentation');
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const jsonResp = await fetch('./presentation.json');
        if (jsonResp.ok) {
          const data = (await jsonResp.json()) as PublishedDeck;
          setTitle(data.title || 'Published Presentation');
          setSlides(data.slides || []);
          return;
        }
      } catch {
        // fall through to txt
      }

      try {
        const textResp = await fetch('./presentation.txt');
        if (textResp.ok) {
          const text = await textResp.text();
          setSlides(parseTextPresentation(text));
          return;
        }
      } catch {
        // ignored
      }

      setError('No presentation.json or presentation.txt found at this location.');
    }
    void load();
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!slides.length) {
        return;
      }
      if (event.key === 'ArrowRight') {
        setCurrentIndex((v) => (v + 1) % slides.length);
      }
      if (event.key === 'ArrowLeft') {
        setCurrentIndex((v) => (v - 1 + slides.length) % slides.length);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [slides]);

  if (error) {
    return <div className="empty-canvas">{error}</div>;
  }

  return (
    <section className="view-layout">
      <h2>{title}</h2>
      <div className="present-stage">
        <SlideCanvas url={slides[currentIndex]} zoomLevel={1} className="present-canvas" />
        <div className="slide-counter">
          {slides.length ? `${currentIndex + 1} / ${slides.length}` : '0 / 0'}
        </div>
      </div>
    </section>
  );
}
