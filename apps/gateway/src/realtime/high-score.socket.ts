import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { WebSocket, type WebSocketServer as WsServer } from 'ws';
import type { HighScoreEvent } from '@rps/shared';

@WebSocketGateway({ path: '/api/ws' })
export class HighScoreSocket {
  @WebSocketServer()
  private readonly server?: WsServer;

  broadcast(event: HighScoreEvent): void {
    if (!this.server) return;
    const data = JSON.stringify(event);
    for (const client of this.server.clients) {
      if (client.readyState === WebSocket.OPEN) client.send(data);
    }
  }
}