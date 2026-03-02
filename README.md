# Prsnt (Chrome Extension)

Prsnt is now a Chrome extension for URL-based presentations using native tabs.

## Load Extension

1. Open `chrome://extensions`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select folder: `prsnt/extension`

## Use

1. Open extension popup and click `Open Controller`, or open options page directly.
2. Import a `.txt` file (one URL per line), or paste URLs.
3. Click `Open Deck Window`.
4. Navigate with:
   - popup `Prev` / `Next`
   - controller `Prev` / `Next`
   - keyboard shortcuts (configure at `chrome://extensions/shortcuts`)
5. Reorder slides by dragging tabs in the deck window.
6. Click `Capture Deck Tabs` to pull current tab order back into URL list.
7. Save via:
   - `Export .txt` (download)
   - `Save Back` (if File System Access API handle is active)

## Quick Open From Selection

1. Highlight text on any web page that contains one or more URLs.
2. Right-click and choose `Open selected URLs in Prsnt deck`.
3. Prsnt extracts links from the selected text and opens them in a new deck window as tabs.

## Notes

- This avoids iframe embed blocking because each slide is a top-level browser tab.
- Chrome internal URLs (`chrome://`, extension pages) are excluded from capture/export decks.
