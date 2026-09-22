import type { HighScoreEvent } from '@rps/shared';

const RECONNECT_MS = 2000;

export function subscribeHighScore(onChange: (highScore: number) => void): () => void {
  let socket: WebSocket | null = null;
  let retryTimer: number | undefined;
  let stopped = false;

  const connect = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    socket = new WebSocket(`${protocol}://${window.location.host}/api/ws`);

    socket.onmessage = (message) => {
      const event = parseEvent(message.data);
      if (event) onChange(event.highScore);
    };

    socket.onclose = () => {
      if (!stopped) retryTimer = window.setTimeout(connect, RECONNECT_MS);
    };
  };

  connect();

  return () => {
    stopped = true;
    window.clearTimeout(retryTimer);
    socket?.close();
  };
}

function parseEvent(data: unknown): HighScoreEvent | null {
  if (typeof data !== 'string') return null;
  try {
    const value = JSON.parse(data) as Partial<HighScoreEvent>;
    return value.type === 'high_score' && typeof value.highScore === 'number'
      ? (value as HighScoreEvent)
      : null;
  } catch {
    return null;
  }
}