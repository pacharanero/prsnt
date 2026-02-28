import type { WebSocket } from 'ws';

export type RemoteStatus = {
  slide: number;
  total: number;
  presenting: boolean;
  url: string;
};

export type Session = {
  id: string;
  token: string;
  presenter?: WebSocket;
  remotes: Set<WebSocket>;
  status: RemoteStatus;
};

export function defaultStatus(): RemoteStatus {
  return {
    slide: 0,
    total: 0,
    presenting: false,
    url: '',
  };
}
