# Prsnt Chrome Extension Functional Specification

## 1. Product Summary

Prsnt is a Chrome extension for URL-based presentations using native browser tabs.

A presentation is a plaintext file containing one URL per line. The extension opens those URLs as tabs in a dedicated browser window, lets the presenter navigate next/previous, and supports exporting the current tab order back to plaintext.

## 2. Goals

- Use top-level browser tabs instead of iframe embedding.
- Preserve one-URL-per-line plaintext workflow.
- Allow manual tab reordering using built-in Chrome tab drag behavior.
- Provide lightweight presenter controls from extension UI and keyboard commands.

## 3. Core Domain Model

### 3.1 Presentation
- `title`: optional string
- `urls`: ordered string list

### 3.2 Deck Session
- `deckWindowId`: Chrome window id used for active presentation
- `createdAt`: timestamp
- `sourceName`: optional imported filename/title

## 4. Functional Requirements

## 4.1 Import and Parse

- User can load a plaintext `.txt` file (UTF-8, one URL per line).
- Blank lines are ignored.
- Invalid/non-http(s) lines are allowed but flagged in UI before opening.
- URLs without scheme are normalized to `https://` for opening.

## 4.2 Open Deck in Browser Tabs

- User can open parsed URLs in a new Chrome window.
- First URL opens as active tab.
- Remaining URLs open as inactive tabs in source order.
- New window becomes the active deck session.

## 4.3 Navigation

- User can move to next/previous tab in deck window.
- Navigation wraps around at beginning/end.
- Navigation is available from:
  - extension popup buttons
  - controller page buttons
  - extension keyboard commands

## 4.4 Reordering

- User can reorder slides by dragging tabs in Chrome.
- Extension treats current tab order as source of truth.

## 4.5 Save / Export

Two save modes are required:

1. Export mode
- User can export current URL list to plaintext via browser download.
- Output format is one URL per line with trailing newline.

2. File-handle mode (when supported)
- User can open a local text file via File System Access API.
- User can write updated URL list back to same file handle.
- If API unavailable, extension falls back to export download mode.

## 4.6 Capture Existing Window

- User can capture all tabs from a selected/current window as a URL deck.
- Captured order matches tab strip order.
- Internal Chrome pages (`chrome://`, extension pages) are excluded.

## 4.7 Session Status

- Extension shows:
  - deck window id
  - active tab index and total tab count
  - active tab URL
- If deck window is closed, status resets gracefully.

## 4.8 Persistence

- Extension stores last working URL list and deck session metadata in `chrome.storage.local`.
- On reopen, controller restores last list and session reference when available.

## 5. Non-Functional Requirements

## 5.1 Platform
- Chrome/Chromium extension using Manifest V3.
- No local server requirement.

## 5.2 Security and Permissions
- Use minimum permissions required:
  - `tabs`
  - `storage`
  - `downloads`
  - `commands`
- No remote code execution or external dependency loading.

## 5.3 Reliability
- All actions return explicit success/error messages to UI.
- Closing deck window does not crash extension; user can reopen deck.

## 6. Constraints and Trade-offs

## 6.1 What This Approach Solves
- Avoids iframe `X-Frame-Options` / CSP `frame-ancestors` blocking for slide display.
- Uses native tab UX for reorder and navigation.

## 6.2 What This Approach Cannot Fully Provide
- No single custom fullscreen canvas with overlay UI for all sites.
- No guaranteed in-place overwrite for arbitrary files when File System Access API is unavailable.
- Not cross-browser by default; this spec targets Chrome/Chromium first.

## 7. Out of Scope (v1)

- Multi-device remote control.
- Cloud sync/account system.
- Collaborative editing.
- Speaker notes/timer presenter overlays.

## 8. Acceptance Criteria

- User can import `.txt` URL file and open a deck window with all slides as tabs.
- User can navigate next/prev with wrap using popup and keyboard shortcuts.
- User can reorder by tab drag and export updated order to plaintext.
- User can capture current window tabs and save as deck.
- Extension persists last deck list and recovers cleanly after browser restart.
