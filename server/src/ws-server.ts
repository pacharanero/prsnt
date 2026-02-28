import { WebSocketServer, type WebSocket } from 'ws';
import { makeToken } from './token.js';
import { defaultStatus, type Session } from './session.js';

type JoinMessage = {
  type: 'join';
  role: 'presenter' | 'remote';
  session?: string;
  token?: string;
};

type StatusMessage = {
  type: 'status';
  status: {
    slide: number;
    total: number;
    presenting: boolean;
    url: string;
  };
};

type CommandMessage = {
  type: 'command';
  command: {
    type: 'next' | 'prev' | 'play' | 'stop' | 'zoomin' | 'zoomout' | 'zoomreset' | 'scroll';
    dy?: number;
  };
};

type Incoming = JoinMessage | StatusMessage | CommandMessage;

type ClientMeta = {
  role?: 'presenter' | 'remote';
  sessionId?: string;
};

const PORT = Number(process.env.PRSNT_PORT || '9124');
const HOST = process.env.PRSNT_HOST || '0.0.0.0';

const sessions = new Map<string, Session>();
const clients = new WeakMap<WebSocket, ClientMeta>();

const wss = new WebSocketServer({ port: PORT, host: HOST });

function send(ws: WebSocket, payload: unknown) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcast(session: Session, payload: unknown) {
  for (const remote of session.remotes) {
    send(remote, payload);
  }
}

function getOrCreateSession(requestedId?: string, requestedToken?: string): Session {
  const id = requestedId || makeToken(8);
  const existing = sessions.get(id);
  if (existing) {
    return existing;
  }
  const session: Session = {
    id,
    token: requestedToken || makeToken(10),
    remotes: new Set(),
    status: defaultStatus(),
  };
  sessions.set(id, session);
  return session;
}

function pruneSession(id: string) {
  const session = sessions.get(id);
  if (!session) {
    return;
  }
  if (!session.presenter && session.remotes.size === 0) {
    sessions.delete(id);
  }
}

wss.on('connection', (ws) => {
  clients.set(ws, {});

  ws.on('message', (raw) => {
    let message: Incoming;
    try {
      message = JSON.parse(raw.toString()) as Incoming;
    } catch {
      send(ws, { type: 'error', message: 'invalid json' });
      return;
    }

    if (message.type === 'join') {
      if (message.role === 'presenter') {
        const session = getOrCreateSession(message.session, message.token);
        session.presenter = ws;
        clients.set(ws, { role: 'presenter', sessionId: session.id });
        send(ws, { type: 'welcome', session: session.id, token: session.token });
        broadcast(session, { type: 'status', status: session.status });
        return;
      }

      const session = sessions.get(message.session || '');
      if (!session) {
        send(ws, { type: 'error', message: 'session not found' });
        return;
      }
      if (message.token !== session.token) {
        send(ws, { type: 'error', message: 'invalid token' });
        return;
      }

      session.remotes.add(ws);
      clients.set(ws, { role: 'remote', sessionId: session.id });
      send(ws, { type: 'joined', session: session.id });
      send(ws, { type: 'status', status: session.status });
      return;
    }

    const meta = clients.get(ws);
    if (!meta?.sessionId) {
      send(ws, { type: 'error', message: 'join required' });
      return;
    }

    const session = sessions.get(meta.sessionId);
    if (!session) {
      send(ws, { type: 'error', message: 'session missing' });
      return;
    }

    if (message.type === 'status') {
      if (meta.role !== 'presenter') {
        send(ws, { type: 'error', message: 'only presenter may send status' });
        return;
      }
      session.status = message.status;
      broadcast(session, { type: 'status', status: message.status });
      return;
    }

    if (message.type === 'command') {
      if (meta.role !== 'remote') {
        send(ws, { type: 'error', message: 'only remote may send command' });
        return;
      }
      if (session.presenter) {
        send(session.presenter, { type: 'command', command: message.command });
      }
      return;
    }
  });

  ws.on('close', () => {
    const meta = clients.get(ws);
    if (!meta?.sessionId) {
      return;
    }
    const session = sessions.get(meta.sessionId);
    if (!session) {
      return;
    }

    if (meta.role === 'presenter' && session.presenter === ws) {
      session.presenter = undefined;
      session.status.presenting = false;
    }

    if (meta.role === 'remote') {
      session.remotes.delete(ws);
    }

    pruneSession(meta.sessionId);
  });
});

console.log(`prsnt server listening on ws://${HOST}:${PORT}`);
