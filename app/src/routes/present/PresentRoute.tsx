import { useEffect, useMemo, useRef, useState } from 'react';
import { SlideCanvas } from '../../components/SlideCanvas';
import { SlideCounter } from '../../components/SlideCounter';
import { currentSlide, currentStatus, usePresentationStore } from '../../store/presentationStore';
import { defaultWsUrl, parseIncoming, sendJson } from '../../lib/ws';
import type { RemoteCommand } from '../../store/types';

export function PresentRoute() {
  const presentation = usePresentationStore((s) => s.presentation);
  const nextSlide = usePresentationStore((s) => s.nextSlide);
  const previousSlide = usePresentationStore((s) => s.previousSlide);
  const zoomIn = usePresentationStore((s) => s.zoomIn);
  const zoomOut = usePresentationStore((s) => s.zoomOut);
  const zoomReset = usePresentationStore((s) => s.zoomReset);
  const setPresenting = usePresentationStore((s) => s.setPresenting);
  const [sessionId, setSessionId] = useState('');
  const [token, setToken] = useState('');
  const [wsEnabled, setWsEnabled] = useState(true);
  const [wsState, setWsState] = useState('disconnected');
  const wsRef = useRef<WebSocket | null>(null);

  const current = useMemo(() => currentSlide(usePresentationStore.getState()), [presentation.currentIndex, presentation.slides]);

  function handleRemoteCommand(command: RemoteCommand) {
    switch (command.type) {
      case 'next':
        nextSlide();
        break;
      case 'prev':
        previousSlide();
        break;
      case 'zoomin':
        zoomIn();
        break;
      case 'zoomout':
        zoomOut();
        break;
      case 'zoomreset':
        zoomReset();
        break;
      case 'play':
        enterFullscreen();
        setPresenting(true);
        break;
      case 'stop':
        exitFullscreen();
        setPresenting(false);
        break;
      case 'scroll':
        window.scrollBy(0, command.dy ?? 0);
        break;
      default:
        break;
    }
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const cmd = event.metaKey || event.ctrlKey;
      switch (event.key) {
        case 'ArrowRight':
          event.preventDefault();
          nextSlide();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          previousSlide();
          break;
        case 'Escape':
          exitFullscreen();
          setPresenting(false);
          break;
        case '+':
        case '=':
          if (cmd) {
            event.preventDefault();
            zoomIn();
          }
          break;
        case '-':
          if (cmd) {
            event.preventDefault();
            zoomOut();
          }
          break;
        case '0':
          if (cmd) {
            event.preventDefault();
            zoomReset();
          }
          break;
        default:
          break;
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [nextSlide, previousSlide, setPresenting, zoomIn, zoomOut, zoomReset]);

  useEffect(() => {
    if (!wsEnabled) {
      return;
    }

    const ws = new WebSocket(defaultWsUrl());
    wsRef.current = ws;
    setWsState('connecting');

    ws.onopen = () => {
      setWsState('connected');
      sendJson(ws, { type: 'join', role: 'presenter', session: sessionId || undefined, token: token || undefined });
      sendJson(ws, { type: 'status', status: currentStatus(usePresentationStore.getState()) });
    };

    ws.onmessage = (event) => {
      const incoming = parseIncoming(event as MessageEvent<string>);
      if (!incoming) {
        return;
      }
      if (incoming.type === 'welcome') {
        setSessionId(incoming.session);
        setToken(incoming.token);
      } else if (incoming.type === 'command') {
        handleRemoteCommand(incoming.command);
      }
    };

    ws.onclose = () => setWsState('disconnected');
    ws.onerror = () => setWsState('error');

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [wsEnabled]);

  useEffect(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return;
    }
    sendJson(ws, { type: 'status', status: currentStatus(usePresentationStore.getState()) });
  }, [presentation.currentIndex, presentation.zoomLevel, presentation.slides]);

  useEffect(() => {
    setPresenting(document.fullscreenElement != null);
  }, [setPresenting]);

  const remoteUrl = sessionId
    ? `${window.location.origin}/remote?session=${encodeURIComponent(sessionId)}&token=${encodeURIComponent(token)}`
    : '';

  return (
    <section className="present-layout">
      <div className="present-toolbar">
        <button onClick={() => previousSlide()}>Prev</button>
        <button onClick={() => nextSlide()}>Next</button>
        <button onClick={enterFullscreen}>Fullscreen</button>
        <button onClick={exitFullscreen}>Exit</button>
        <button onClick={zoomOut}>A-</button>
        <button onClick={zoomIn}>A+</button>
        <button onClick={zoomReset}>A0</button>
        <label>
          <input type="checkbox" checked={wsEnabled} onChange={(e) => setWsEnabled(e.target.checked)} />
          Realtime remote
        </label>
        <span className="ws-state">WS: {wsState}</span>
      </div>
      <div className="remote-block">
        <div>Session: {sessionId || '-'}</div>
        <div>Token: {token || '-'}</div>
        <div className="remote-url">{remoteUrl || 'Remote URL appears when server is connected.'}</div>
      </div>
      <div className="present-stage">
        <SlideCanvas url={current?.url} zoomLevel={presentation.zoomLevel} className="present-canvas" />
        <SlideCounter current={presentation.currentIndex + 1} total={presentation.slides.length} />
      </div>
    </section>
  );
}

async function enterFullscreen() {
  if (!document.fullscreenElement) {
    await document.documentElement.requestFullscreen();
  }
}

async function exitFullscreen() {
  if (document.fullscreenElement) {
    await document.exitFullscreen();
  }
}
