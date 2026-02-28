import { ChangeEvent, DragEvent, useRef } from 'react';
import { Link } from 'react-router-dom';
import { downloadTextPresentation, importFromTextFile } from '../../lib/fileio';
import { usePresentationStore } from '../../store/presentationStore';
import { SlideCanvas } from '../../components/SlideCanvas';

export function EditorRoute() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const presentation = usePresentationStore((s) => s.presentation);
  const selectedSlideId = usePresentationStore((s) => s.selectedSlideId);
  const setTitle = usePresentationStore((s) => s.setTitle);
  const selectSlide = usePresentationStore((s) => s.selectSlide);
  const addSlide = usePresentationStore((s) => s.addSlide);
  const updateSlide = usePresentationStore((s) => s.updateSlide);
  const deleteSlide = usePresentationStore((s) => s.deleteSlide);
  const reorderSlides = usePresentationStore((s) => s.reorderSlides);
  const setSlidesFromUrls = usePresentationStore((s) => s.setSlidesFromUrls);
  const zoomIn = usePresentationStore((s) => s.zoomIn);
  const zoomOut = usePresentationStore((s) => s.zoomOut);
  const zoomReset = usePresentationStore((s) => s.zoomReset);
  const setNotice = usePresentationStore((s) => s.setNotice);
  const notice = usePresentationStore((s) => s.statusNotice);

  const selected = presentation.slides[presentation.currentIndex];

  async function onImportFile(file: File) {
    const urls = await importFromTextFile(file);
    setSlidesFromUrls(urls);
    setNotice(`Imported ${urls.length} slides`);
  }

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      await onImportFile(file);
    } catch {
      setNotice('Failed to import file');
    }
    event.target.value = '';
  }

  function onExport() {
    const safeName = presentation.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    downloadTextPresentation(`${safeName || 'presentation'}.txt`, presentation.slides.map((s) => s.url));
    setNotice('Exported plaintext presentation');
  }

  function onDrop(fromIndex: number, toIndex: number) {
    reorderSlides(fromIndex, toIndex);
  }

  return (
    <section className="editor-layout">
      <aside className="sidebar">
        <div className="title-row">
          <input
            type="text"
            value={presentation.title}
            onChange={(e) => setTitle(e.target.value)}
            aria-label="Presentation title"
          />
        </div>
        <ul className="slide-list">
          {presentation.slides.map((slide, index) => (
            <SlideListItem
              key={slide.id}
              index={index}
              id={slide.id}
              url={slide.url}
              selected={selectedSlideId === slide.id}
              onSelect={() => selectSlide(slide.id)}
              onDelete={() => deleteSlide(slide.id)}
              onUpdate={(value) => updateSlide(slide.id, value)}
              onDrop={onDrop}
            />
          ))}
        </ul>
        <div className="sidebar-controls">
          <button onClick={() => addSlide()}>Add</button>
          <button onClick={() => fileInputRef.current?.click()}>Import .txt</button>
          <button onClick={onExport}>Export .txt</button>
          <button onClick={zoomOut}>A-</button>
          <button onClick={zoomIn}>A+</button>
          <button onClick={zoomReset}>A0</button>
          <Link className="button-link" to="/present">
            Present
          </Link>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="text/plain,.txt"
          style={{ display: 'none' }}
          onChange={onFileChange}
        />
        {notice ? <div className="notice">{notice}</div> : null}
      </aside>
      <div className="preview-panel">
        <SlideCanvas url={selected?.url} zoomLevel={presentation.zoomLevel} />
      </div>
    </section>
  );
}

type SlideListItemProps = {
  index: number;
  id: string;
  url: string;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onUpdate: (value: string) => void;
  onDrop: (fromIndex: number, toIndex: number) => void;
};

function SlideListItem({ index, url, selected, onSelect, onDelete, onUpdate, onDrop }: SlideListItemProps) {
  function handleDragStart(event: DragEvent<HTMLDivElement>) {
    event.dataTransfer.setData('text/plain', String(index));
    event.dataTransfer.effectAllowed = 'move';
  }

  function handleDrop(event: DragEvent<HTMLLIElement>) {
    event.preventDefault();
    const value = event.dataTransfer.getData('text/plain');
    const fromIndex = Number.parseInt(value, 10);
    if (!Number.isNaN(fromIndex)) {
      onDrop(fromIndex, index);
    }
  }

  return (
    <li
      className={selected ? 'slide-item selected' : 'slide-item'}
      onClick={onSelect}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <div className="slide-number" draggable onDragStart={handleDragStart}>
        {index + 1}
      </div>
      <input type="text" value={url} onChange={(e) => onUpdate(e.target.value)} aria-label={`Slide ${index + 1} URL`} />
      <button onClick={onDelete} aria-label={`Delete slide ${index + 1}`}>
        -
      </button>
    </li>
  );
}
