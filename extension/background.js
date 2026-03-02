const KEYS = {
  URLS: 'prsnt.urls',
  DECK_WINDOW_ID: 'prsnt.deckWindowId',
  SOURCE_NAME: 'prsnt.sourceName',
  UPDATED_AT: 'prsnt.updatedAt',
};

const CONTEXT_MENU_ID = 'prsnt.openSelectionUrls';
const URL_MATCH_RE = /(?:https?:\/\/|www\.)[^\s<>"'`]+|(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}(?:\/[^\s<>"'`]*)?/gi;

function parseUrlsFromText(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function trimUrlCandidate(raw) {
  let value = (raw || '').trim();
  if (!value) {
    return '';
  }

  value = value.replace(/^[({[<"'`]+/, '');
  value = value.replace(/[)\]}>"'`]+$/, '');

  while (/[.,!?;:]$/.test(value)) {
    value = value.slice(0, -1);
  }

  if (value.endsWith(')') && !value.includes('(')) {
    value = value.slice(0, -1);
  }

  return value.trim();
}

function normalizeUrl(raw) {
  const trimmed = trimUrlCandidate(raw);
  if (!trimmed) {
    return '';
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol) {
      return parsed.href;
    }
  } catch (error) {
    // Continue to https fallback.
  }
  return `https://${trimmed}`;
}

function parseUrlsFromSelection(text) {
  const candidates = (text || '').match(URL_MATCH_RE) || [];
  const seen = new Set();
  const urls = [];

  for (const candidate of candidates) {
    const normalized = normalizeUrl(candidate);
    if (!normalized || !isTabUrlPresentable(normalized)) {
      continue;
    }

    try {
      const parsed = new URL(normalized);
      if (!/^https?:$/i.test(parsed.protocol)) {
        continue;
      }
      const href = parsed.href;
      if (seen.has(href)) {
        continue;
      }
      seen.add(href);
      urls.push(href);
    } catch (error) {
      // Ignore values that still fail URL parsing.
    }
  }

  return urls;
}

function isTabUrlPresentable(url) {
  if (!url) {
    return false;
  }
  return /^https?:\/\//i.test(url);
}

function urlsToText(urls) {
  return `${urls.join('\n')}\n`;
}

async function getStoredState() {
  return chrome.storage.local.get([KEYS.URLS, KEYS.DECK_WINDOW_ID, KEYS.SOURCE_NAME, KEYS.UPDATED_AT]);
}

async function setStoredState(patch) {
  await chrome.storage.local.set({ ...patch, [KEYS.UPDATED_AT]: Date.now() });
}

async function getDeckWindowId() {
  const data = await chrome.storage.local.get(KEYS.DECK_WINDOW_ID);
  return data[KEYS.DECK_WINDOW_ID];
}

async function setDeckWindowId(windowId) {
  await setStoredState({ [KEYS.DECK_WINDOW_ID]: windowId });
}

async function getDeckStatus() {
  const windowId = await getDeckWindowId();
  if (typeof windowId !== 'number') {
    return {
      ok: true,
      connected: false,
      message: 'No active deck window.',
      status: null,
    };
  }

  let windowInfo;
  try {
    windowInfo = await chrome.windows.get(windowId, { populate: true });
  } catch (error) {
    await setStoredState({ [KEYS.DECK_WINDOW_ID]: null });
    return {
      ok: true,
      connected: false,
      message: 'Deck window is closed.',
      status: null,
    };
  }

  const tabs = (windowInfo.tabs || []).filter((tab) => isTabUrlPresentable(tab.url));
  if (!tabs.length) {
    return {
      ok: true,
      connected: true,
      message: 'Deck window has no presentable tabs.',
      status: {
        windowId,
        activeIndex: 0,
        total: 0,
        activeUrl: '',
      },
    };
  }

  tabs.sort((a, b) => (a.index || 0) - (b.index || 0));
  const activeIndex = tabs.findIndex((tab) => tab.active);
  const safeIndex = activeIndex >= 0 ? activeIndex : 0;

  return {
    ok: true,
    connected: true,
    message: 'Deck active.',
    status: {
      windowId,
      activeIndex: safeIndex + 1,
      total: tabs.length,
      activeUrl: tabs[safeIndex]?.url || '',
    },
  };
}

async function moveInDeck(direction) {
  const statusResponse = await getDeckStatus();
  if (!statusResponse.connected || !statusResponse.status) {
    return {
      ok: false,
      message: statusResponse.message,
    };
  }

  const windowId = statusResponse.status.windowId;
  const tabs = await chrome.tabs.query({ windowId });
  const presentableTabs = tabs.filter((tab) => isTabUrlPresentable(tab.url));

  if (!presentableTabs.length) {
    return { ok: false, message: 'No presentable tabs in deck window.' };
  }

  presentableTabs.sort((a, b) => (a.index || 0) - (b.index || 0));

  let current = presentableTabs.findIndex((tab) => tab.active);
  if (current < 0) {
    current = 0;
  }

  const offset = direction === 'next' ? 1 : -1;
  const target = (current + offset + presentableTabs.length) % presentableTabs.length;
  const targetTab = presentableTabs[target];

  await chrome.tabs.update(targetTab.id, { active: true });
  await chrome.windows.update(windowId, { focused: true });

  return {
    ok: true,
    message: `Moved to ${target + 1} / ${presentableTabs.length}`,
  };
}

async function openDeck({ urls, sourceName }) {
  const normalized = urls.map((url) => normalizeUrl(url)).filter(Boolean);
  if (!normalized.length) {
    return { ok: false, message: 'No URLs to open.' };
  }

  const first = normalized[0];
  const rest = normalized.slice(1);

  const windowInfo = await chrome.windows.create({ url: first, focused: true });
  const windowId = windowInfo.id;

  if (typeof windowId !== 'number') {
    return { ok: false, message: 'Unable to create deck window.' };
  }

  for (const url of rest) {
    await chrome.tabs.create({ windowId, url, active: false });
  }

  await setStoredState({
    [KEYS.URLS]: normalized,
    [KEYS.SOURCE_NAME]: sourceName || 'Untitled',
  });
  await setDeckWindowId(windowId);

  return {
    ok: true,
    message: `Opened ${normalized.length} tabs in deck window ${windowId}.`,
    windowId,
    total: normalized.length,
  };
}

async function captureWindow(windowId) {
  let targetWindowId = windowId;
  if (typeof targetWindowId !== 'number') {
    targetWindowId = await getDeckWindowId();
  }

  if (typeof targetWindowId !== 'number') {
    const current = await chrome.windows.getCurrent();
    targetWindowId = current.id;
  }

  if (typeof targetWindowId !== 'number') {
    return { ok: false, message: 'No window available for capture.' };
  }

  const tabs = await chrome.tabs.query({ windowId: targetWindowId });
  const urls = tabs
    .map((tab) => tab.url || '')
    .filter((url) => isTabUrlPresentable(url));

  await setStoredState({ [KEYS.URLS]: urls });

  return {
    ok: true,
    message: `Captured ${urls.length} tab URLs from window ${targetWindowId}.`,
    urls,
    windowId: targetWindowId,
  };
}

async function exportText({ urls, filename }) {
  if (!Array.isArray(urls) || !urls.length) {
    return { ok: false, message: 'No URLs to export.' };
  }

  const normalized = urls.map((u) => normalizeUrl(u)).filter(Boolean);
  const text = urlsToText(normalized);
  const safeName = (filename || 'presentation.txt').replace(/[^a-zA-Z0-9._-]/g, '-');
  const dataUrl = `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`;

  await chrome.downloads.download({
    url: dataUrl,
    filename: safeName,
    saveAs: true,
  });

  return {
    ok: true,
    message: `Export started for ${safeName}.`,
  };
}

async function setUrls(urls) {
  const normalized = (urls || []).map((u) => normalizeUrl(u)).filter(Boolean);
  await setStoredState({ [KEYS.URLS]: normalized });
  return {
    ok: true,
    message: `Stored ${normalized.length} URLs.`,
    urls: normalized,
  };
}

async function getUrls() {
  const data = await getStoredState();
  return {
    ok: true,
    urls: data[KEYS.URLS] || [],
    sourceName: data[KEYS.SOURCE_NAME] || '',
    deckWindowId: data[KEYS.DECK_WINDOW_ID] || null,
    updatedAt: data[KEYS.UPDATED_AT] || null,
  };
}

async function ensureContextMenu() {
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({
    id: CONTEXT_MENU_ID,
    title: 'Open selected URLs in Prsnt deck',
    contexts: ['selection'],
  });
}

chrome.runtime.onInstalled.addListener(() => {
  ensureContextMenu().catch(() => {
    // Ignore setup errors; extension can still run core actions.
  });
});

chrome.runtime.onStartup.addListener(() => {
  ensureContextMenu().catch(() => {
    // Ignore setup errors; extension can still run core actions.
  });
});

ensureContextMenu().catch(() => {
  // Ignore setup errors; extension can still run core actions.
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== CONTEXT_MENU_ID) {
    return;
  }

  (async () => {
    const urls = parseUrlsFromSelection(info.selectionText || '');
    if (!urls.length) {
      return;
    }

    await openDeck({
      urls,
      sourceName: tab?.title ? `Selection from ${tab.title}` : 'Selection',
    });
  })().catch(() => {
    // Swallow errors because context-menu clicks are fire-and-forget.
  });
});

chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  const deckWindowId = await getDeckWindowId();
  if (typeof deckWindowId !== 'number' || removeInfo.windowId !== deckWindowId) {
    return;
  }

  const tabs = await chrome.tabs.query({ windowId: deckWindowId });
  const presentable = tabs.filter((tab) => isTabUrlPresentable(tab.url));
  if (!presentable.length) {
    await setDeckWindowId(null);
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'next-slide') {
    await moveInDeck('next');
  }
  if (command === 'prev-slide') {
    await moveInDeck('prev');
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    switch (message?.type) {
      case 'OPEN_DECK':
        sendResponse(await openDeck(message.payload || {}));
        break;
      case 'GET_STATUS':
        sendResponse(await getDeckStatus());
        break;
      case 'NEXT_TAB':
        sendResponse(await moveInDeck('next'));
        break;
      case 'PREV_TAB':
        sendResponse(await moveInDeck('prev'));
        break;
      case 'CAPTURE_WINDOW':
        sendResponse(await captureWindow(message?.payload?.windowId));
        break;
      case 'EXPORT_TEXT':
        sendResponse(await exportText(message.payload || {}));
        break;
      case 'SET_URLS':
        sendResponse(await setUrls(message.payload?.urls || []));
        break;
      case 'GET_URLS':
        sendResponse(await getUrls());
        break;
      case 'FOCUS_DECK': {
        const deckWindowId = await getDeckWindowId();
        if (typeof deckWindowId === 'number') {
          await chrome.windows.update(deckWindowId, { focused: true });
          sendResponse({ ok: true, message: `Focused window ${deckWindowId}.` });
        } else {
          sendResponse({ ok: false, message: 'No active deck window.' });
        }
        break;
      }
      default:
        sendResponse({ ok: false, message: 'Unknown message type.' });
    }
  })().catch((error) => {
    sendResponse({ ok: false, message: error?.message || 'Unexpected error.' });
  });

  return true;
});
