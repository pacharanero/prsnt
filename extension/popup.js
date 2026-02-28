function send(type, payload) {
  return chrome.runtime.sendMessage({ type, payload });
}

function setStatus(text) {
  const node = document.getElementById('status');
  node.textContent = text;
}

async function refreshStatus() {
  const result = await send('GET_STATUS');
  if (!result?.ok) {
    setStatus(result?.message || 'Unable to read status.');
    return;
  }
  if (!result.connected || !result.status) {
    setStatus(result.message || 'No active deck window.');
    return;
  }
  const { activeIndex, total, activeUrl } = result.status;
  setStatus(`Slide ${activeIndex}/${total}\n${activeUrl}`);
}

document.getElementById('nextBtn').addEventListener('click', async () => {
  const result = await send('NEXT_TAB');
  setStatus(result.message || 'Moved next.');
  await refreshStatus();
});

document.getElementById('prevBtn').addEventListener('click', async () => {
  const result = await send('PREV_TAB');
  setStatus(result.message || 'Moved previous.');
  await refreshStatus();
});

document.getElementById('focusBtn').addEventListener('click', async () => {
  const result = await send('FOCUS_DECK');
  setStatus(result.message || 'Focused.');
});

document.getElementById('openControllerBtn').addEventListener('click', async () => {
  await chrome.runtime.openOptionsPage();
});

refreshStatus().catch((error) => {
  setStatus(error?.message || 'Unexpected error.');
});
