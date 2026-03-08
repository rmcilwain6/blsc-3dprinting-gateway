import type { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import type { WsEvent } from './types';

let wss: WebSocketServer | null = null;

export function setupWebSocket(server: Server): void {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    ws.on('error', (err) => console.error('WebSocket client error:', err));
  });

  console.log('WebSocket server ready at /ws');
}

export function broadcast(event: WsEvent): void {
  if (!wss) return;
  const message = JSON.stringify(event);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}
