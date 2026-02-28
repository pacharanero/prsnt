import type { RemoteCommand, RemoteStatus } from '../store/types';

export type WsIncoming =
  | { type: 'welcome'; session: string; token: string }
  | { type: 'status'; status: RemoteStatus }
  | { type: 'command'; command: RemoteCommand }
  | { type: 'error'; message: string }
  | { type: 'joined'; session: string };

export type WsOutgoing =
  | { type: 'join'; role: 'presenter' | 'remote'; session?: string; token?: string }
  | { type: 'status'; status: RemoteStatus }
  | { type: 'command'; command: RemoteCommand };

export function defaultWsUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.hostname}:9124`;
}

export function sendJson(socket: WebSocket, payload: WsOutgoing): void {
  socket.send(JSON.stringify(payload));
}

export function parseIncoming(input: MessageEvent<string>): WsIncoming | null {
  try {
    return JSON.parse(input.data) as WsIncoming;
  } catch {
    return null;
  }
}
