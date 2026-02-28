import { CSSProperties } from 'react';
import { isImageUrl, normalizeUrl } from '../lib/urls';

type SlideCanvasProps = {
  url?: string;
  zoomLevel: number;
  className?: string;
};

export function SlideCanvas({ url, zoomLevel, className }: SlideCanvasProps) {
  if (!url) {
    return <div className={`empty-canvas ${className ?? ''}`.trim()}>No slide selected</div>;
  }

  const normalized = normalizeUrl(url);

  if (!normalized) {
    return <div className={`empty-canvas ${className ?? ''}`.trim()}>Invalid URL</div>;
  }

  if (isImageUrl(url)) {
    return (
      <div className={`image-canvas ${className ?? ''}`.trim()}>
        <img src={normalized} alt="Slide" />
      </div>
    );
  }

  const style: CSSProperties = {
    transform: `scale(${zoomLevel})`,
    transformOrigin: 'top left',
    width: `${100 / zoomLevel}%`,
    height: `${100 / zoomLevel}%`,
    border: 0,
    background: '#fff',
  };

  return (
    <div className={`web-canvas ${className ?? ''}`.trim()}>
      <iframe src={normalized} title="Slide preview" style={style} />
    </div>
  );
}
