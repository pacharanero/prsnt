import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { defaultWsUrl, parseIncoming, sendJson } from '../../lib/ws';
import type { RemoteCommand, RemoteStatus } from '../../store/types';

const EMPTY_STATUS: RemoteStatus = {
  slide: 0,
  total: 0,
  presenting: false,
  url: '',
};

export function RemoteRoute() {
  const [searchParams] = useSearchParams();
  const [session, setSession] = useState(searchParams.get('session') ?? '');
  const [token, setToken] = useState(searchParams.get('token') ?? '');
  const [status, setStatus] = useState<RemoteStatus>(EMPTY_STATUS);
  const [wsState, setWsState] = useState('disconnected');
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);

  const connectionDisabled = useMemo(() => !session || !token, [session, token]);

  useEffect(() => {
    if (connectionDisabled) {
      return;
    }

    const ws = new WebSocket(defaultWsUrl());
    setSocket(ws);
    setWsState('connecting');

    ws.onopen = () => {
      setWsState('connected');
      setConnected(true);
      sendJson(ws, { type: 'join', role: 'remote', session, token });
    };

    ws.onmessage = (event) => {
      const incoming = parseIncoming(event as MessageEvent<string>);
      if (!incoming) {
        return;
      }
      if (incoming.type === 'status') {
        setStatus(incoming.status);
      }
      if (incoming.type === 'error') {
        setWsState(`error: ${incoming.message}`);
      }
    };

    ws.onclose = () => {
      setWsState('disconnected');
      setConnected(false);
    };
    ws.onerror = () => setWsState('error');

    return () => ws.close();
  }, [connectionDisabled, session, token]);

  function sendCommand(command: RemoteCommand) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }
    sendJson(socket, { type: 'command', command });
  }

  return (
    <section className="remote-layout">
      <h2>Remote</h2>
      <div className="remote-connect">
        <label>
          Session
          <input value={session} onChange={(e) => setSession(e.target.value)} placeholder="session id" />
        </label>
        <label>
          Token
          <input value={token} onChange={(e) => setToken(e.target.value)} placeholder="token" />
        </label>
      </div>
      <div className="remote-status">{connected ? `Slide ${status.slide}/${status.total}` : 'Not connected'} | {wsState}</div>
      <div className="remote-buttons-row">
        <button onClick={() => sendCommand({ type: 'prev' })}>Prev</button>
        <button onClick={() => sendCommand({ type: 'next' })}>Next</button>
      </div>
      <div className="remote-buttons-row">
        <button onClick={() => sendCommand({ type: status.presenting ? 'stop' : 'play' })}>
          {status.presenting ? 'Stop' : 'Start'}
        </button>
        <button onClick={() => sendCommand({ type: 'zoomout' })}>A-</button>
        <button onClick={() => sendCommand({ type: 'zoomin' })}>A+</button>
      </div>
      <div className="remote-buttons-row">
        <button onClick={() => sendCommand({ type: 'scroll', dy: -300 })}>Scroll Up</button>
        <button onClick={() => sendCommand({ type: 'scroll', dy: 300 })}>Scroll Down</button>
      </div>
      <div className="remote-url-label">{status.url}</div>
    </section>
  );
}
