function send(type, payload) {
  return chrome.runtime.sendMessage({ type, payload });
}

function parseUrls(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizeForInput(raw) {
  const trimmed = (raw || '').trim();
  if (!trimmed) {
    return '';
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol) {
      return trimmed;
    }
  } catch (error) {
    // fallback
  }
  return `https://${trimmed}`;
}

function urlsToText(urls) {
  return urls.join('\n');
}

const nodes = {
  sourceName: document.getElementById('sourceName'),
  fileInput: document.getElementById('fileInput'),
  openPickerBtn: document.getElementById('openPickerBtn'),
  saveBackBtn: document.getElementById('saveBackBtn'),
  urlsInput: document.getElementById('urlsInput'),
  storeBtn: document.getElementById('storeBtn'),
  openDeckBtn: document.getElementById('openDeckBtn'),
  captureDeckBtn: document.getElementById('captureDeckBtn'),
  captureCurrentBtn: document.getElementById('captureCurrentBtn'),
  prevBtn: document.getElementById('prevBtn'),
  nextBtn: document.getElementById('nextBtn'),
  focusBtn: document.getElementById('focusBtn'),
  exportBtn: document.getElementById('exportBtn'),
  filenameInput: document.getElementById('filenameInput'),
  status: document.getElementById('status'),
};

let currentHandle = null;

function setStatus(message, details) {
  const lines = [message];
  if (details) {
    lines.push(typeof details === 'string' ? details : JSON.stringify(details, null, 2));
  }
  nodes.status.textContent = lines.join('\n');
}

function getUrlsFromTextArea() {
  return parseUrls(nodes.urlsInput.value).map((url) => normalizeForInput(url)).filter(Boolean);
}

function updateTextArea(urls) {
  nodes.urlsInput.value = urlsToText(urls);
}

async function refreshFromStorage() {
  const data = await send('GET_URLS');
  if (!data?.ok) {
    setStatus(data?.message || 'Failed to load stored URLs.');
    return;
  }
  updateTextArea(data.urls || []);
  nodes.sourceName.value = data.sourceName || '';

  const status = await send('GET_STATUS');
  if (status?.connected && status?.status) {
    setStatus(
      `Deck window ${status.status.windowId} active: ${status.status.activeIndex}/${status.status.total}`,
      status.status.activeUrl
    );
  } else {
    setStatus(status?.message || 'No active deck window.');
  }
}

nodes.fileInput.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }
  const text = await file.text();
  const urls = parseUrls(text).map((url) => normalizeForInput(url)).filter(Boolean);
  updateTextArea(urls);
  nodes.sourceName.value = file.name.replace(/\.txt$/i, '');
  setStatus(`Loaded ${urls.length} URLs from ${file.name}.`);
});

nodes.openPickerBtn.addEventListener('click', async () => {
  if (!window.showOpenFilePicker) {
    setStatus('File System Access API is not available here. Use file input instead.');
    return;
  }
  const [handle] = await window.showOpenFilePicker({
    types: [{
      description: 'Text files',
      accept: { 'text/plain': ['.txt'] },
    }],
    excludeAcceptAllOption: false,
    multiple: false,
  });
  if (!handle) {
    return;
  }
  currentHandle = handle;
  const file = await handle.getFile();
  const text = await file.text();
  const urls = parseUrls(text).map((url) => normalizeForInput(url)).filter(Boolean);
  updateTextArea(urls);
  nodes.sourceName.value = file.name.replace(/\.txt$/i, '');
  setStatus(`Opened ${file.name} with handle support.`);
});

nodes.saveBackBtn.addEventListener('click', async () => {
  if (!currentHandle) {
    setStatus('No file handle active. Use Open File Picker first or use Export .txt.');
    return;
  }
  const urls = getUrlsFromTextArea();
  const writable = await currentHandle.createWritable();
  await writable.write(`${urls.join('\n')}\n`);
  await writable.close();
  setStatus(`Saved ${urls.length} URLs back to selected file.`);
});

nodes.storeBtn.addEventListener('click', async () => {
  const urls = getUrlsFromTextArea();
  const result = await send('SET_URLS', { urls });
  setStatus(result.message || 'Stored URLs.', { count: urls.length });
});

nodes.openDeckBtn.addEventListener('click', async () => {
  const urls = getUrlsFromTextArea();
  const sourceName = nodes.sourceName.value.trim();
  const result = await send('OPEN_DECK', { urls, sourceName });
  setStatus(result.message || 'Deck opened.', result);
});

nodes.captureDeckBtn.addEventListener('click', async () => {
  const result = await send('CAPTURE_WINDOW', {});
  if (result?.ok) {
    updateTextArea(result.urls || []);
  }
  setStatus(result?.message || 'Capture complete.', result);
});

nodes.captureCurrentBtn.addEventListener('click', async () => {
  const current = await chrome.windows.getCurrent();
  const result = await send('CAPTURE_WINDOW', { windowId: current.id });
  if (result?.ok) {
    updateTextArea(result.urls || []);
  }
  setStatus(result?.message || 'Capture complete.', result);
});

nodes.prevBtn.addEventListener('click', async () => {
  const result = await send('PREV_TAB');
  setStatus(result?.message || 'Moved previous.');
});

nodes.nextBtn.addEventListener('click', async () => {
  const result = await send('NEXT_TAB');
  setStatus(result?.message || 'Moved next.');
});

nodes.focusBtn.addEventListener('click', async () => {
  const result = await send('FOCUS_DECK');
  setStatus(result?.message || 'Focused deck window.');
});

nodes.exportBtn.addEventListener('click', async () => {
  const urls = getUrlsFromTextArea();
  const filename = nodes.filenameInput.value.trim() || 'presentation.txt';
  const result = await send('EXPORT_TEXT', { urls, filename });
  setStatus(result?.message || 'Export started.');
});

refreshFromStorage().catch((error) => {
  setStatus(error?.message || 'Failed to initialize controller.');
});
