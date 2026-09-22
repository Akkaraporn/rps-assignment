import type { PlayRequest, PlayResponse, SessionResponse } from '@rps/shared';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

  if (!res.ok) {
    throw new ApiError(res.status)
  }

  return res.json() as Promise<T>;
}

export function fetchSession(): Promise<SessionResponse> {
  return request<SessionResponse>('/session');
}

export function play(move: PlayRequest['move']): Promise<PlayResponse> {
  return request<PlayResponse>('/play', {
    method: 'POST',
    body: JSON.stringify({ move } satisfies PlayRequest),
  });
}

export class ApiError extends Error {
  constructor(readonly status: number) {
    super(`Request failed: ${status}`);
  }
}