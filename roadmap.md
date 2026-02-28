# Prsnt Chrome Extension Roadmap

## 1. Target Architecture

## 1.1 Extension Components
- [x] `manifest.json` (Manifest V3 config, permissions, commands)
- [x] `background.js` (service worker, deck session logic)
- [x] `popup.html` + `popup.js` (quick controls)
- [x] `controller.html` + `controller.js` + `controller.css` (full workflow UI)

## 1.2 Runtime Responsibilities

1. Background service worker
- [x] Owns deck session state (`deckWindowId`)
- [x] Opens deck tabs/windows
- [x] Performs next/prev wrap navigation
- [x] Captures tab order from deck/current window
- [x] Exports plaintext via downloads API
- [x] Handles keyboard commands

2. Controller UI
- [x] File import and URL editing
- [x] Deck creation and capture actions
- [x] Save/export actions
- [x] Session status display

3. Popup UI
- [x] Minimal presenter controls: next, prev, status, open controller

## 2. Data Contracts

## 2.1 Message Types
- [x] `OPEN_DECK`
- [x] `GET_STATUS`
- [x] `NEXT_TAB`
- [x] `PREV_TAB`
- [x] `CAPTURE_WINDOW`
- [x] `EXPORT_TEXT`
- [x] `FOCUS_DECK`
- [x] `SET_URLS`
- [x] `GET_URLS`

## 2.2 Stored Keys (`chrome.storage.local`)
- [x] `prsnt.urls`: last edited URL list
- [x] `prsnt.deckWindowId`: active deck window id
- [x] `prsnt.sourceName`: optional source filename/title
- [x] `prsnt.updatedAt`: last update timestamp

## 3. Delivery Plan

## Phase 1: Extension Skeleton
- [x] Create manifest, background service worker, popup shell, controller shell.
- [x] Wire basic message passing and status query.

Exit criteria:
- Extension loads in Chrome and popup/controller render.

## Phase 2: Deck Open and Navigation
- [x] Implement URL normalization/parsing.
- [x] Implement opening deck in new window as ordered tabs.
- [x] Implement next/prev wrap navigation and keyboard commands.

Exit criteria:
- Imported URLs open as deck tabs and can be navigated reliably.

## Phase 3: Save and Capture Workflow
- [x] Implement capture current/deck window tab order.
- [x] Implement plaintext export download (`.txt`).
- [x] Implement optional in-place save using File System Access API when available.

Exit criteria:
- Presenter can reorder tabs and persist resulting order to plaintext.

## Phase 4: Persistence and Robustness
- [x] Persist last URL list and deck metadata.
- [x] Handle closed/missing deck window gracefully.
- [x] Add clear user-facing error/status messages.

Exit criteria:
- Restart-safe basic workflow with stable error handling.

## 4. Keyboard Command Plan

- [x] `Next Slide`: shortcut bound to extension command (default suggestion in manifest)
- [x] `Previous Slide`: shortcut bound to extension command

Notes:
- Final bindings may be user-customized in `chrome://extensions/shortcuts`.

## 5. UX Flow

1. Open controller page.
2. Load `.txt` file or paste URLs.
3. Click `Open Deck`.
4. Present by navigating tabs (buttons or shortcuts).
5. Reorder tabs manually in tab strip.
6. Click `Capture Deck` then `Export .txt` (or `Save Back` if available).

## 6. Known Trade-offs

- No custom full-canvas presenter overlay.
- Save-back to same file depends on browser support and user-granted file handle.
- Scope is Chrome/Chromium first.

## 7. Future Extensions

- [ ] Optional tab grouping and auto-labeling.
- [ ] Optional timer and notes side panel.
- [ ] Optional one-click publish of `.txt` to GitHub repo.
