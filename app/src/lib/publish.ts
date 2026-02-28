import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { parseTextPresentation } from './urls';

export type PublishInput = {
  title: string;
  urls: string[];
  outDir: string;
};

export async function publishPresentation(input: PublishInput): Promise<void> {
  await mkdir(input.outDir, { recursive: true });

  const payload = {
    title: input.title,
    slides: input.urls,
  };

  await writeFile(join(input.outDir, 'presentation.json'), JSON.stringify(payload, null, 2), 'utf8');
  await writeFile(join(input.outDir, 'index.html'), viewerTemplate(), 'utf8');
}

export function parseTextToUrls(contents: string): string[] {
  return parseTextPresentation(contents);
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function ensureParent(path: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
}

function viewerTemplate(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Prsnt Viewer</title>
  <style>
    body { margin: 0; background: #0d1117; color: #fff; font-family: system-ui, sans-serif; }
    #stage { width: 100vw; height: 100vh; display: grid; place-items: center; }
    iframe, img { width: 100vw; height: 100vh; border: 0; object-fit: contain; background: #000; }
    #counter { position: fixed; right: 16px; bottom: 16px; background: rgba(0,0,0,.45); padding: 4px 8px; border-radius: 6px; }
  </style>
</head>
<body>
  <div id="stage"></div>
  <div id="counter"></div>
  <script>
    const IMAGE_EXTS = ['.png', '.gif', '.jpg', '.jpeg', '.webp', '.svg'];
    const stage = document.getElementById('stage');
    const counter = document.getElementById('counter');
    let index = 0;
    let slides = [];

    function normalize(url) {
      if (!url) return '';
      try { new URL(url); return url; } catch { return 'https://' + url; }
    }

    function isImage(url) {
      const normalized = normalize(url).toLowerCase().split('?')[0];
      return IMAGE_EXTS.some(ext => normalized.endsWith(ext));
    }

    function render() {
      if (!slides.length) {
        stage.innerHTML = '<div>No slides</div>';
        counter.textContent = '0 / 0';
        return;
      }
      const url = normalize(slides[index]);
      stage.innerHTML = '';
      if (isImage(url)) {
        const img = document.createElement('img');
        img.src = url;
        img.alt = 'Slide';
        stage.appendChild(img);
      } else {
        const iframe = document.createElement('iframe');
        iframe.src = url;
        stage.appendChild(iframe);
      }
      counter.textContent = (index + 1) + ' / ' + slides.length;
    }

    window.addEventListener('keydown', (event) => {
      if (!slides.length) return;
      if (event.key === 'ArrowRight') index = (index + 1) % slides.length;
      if (event.key === 'ArrowLeft') index = (index - 1 + slides.length) % slides.length;
      render();
    });

    fetch('./presentation.json').then(r => r.json()).then(data => {
      slides = data.slides || [];
      document.title = data.title || 'Prsnt Viewer';
      render();
    }).catch(() => {
      stage.innerHTML = '<div>Failed to load presentation.json</div>';
    });
  </script>
</body>
</html>`;
}
