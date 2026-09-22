import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException, Logger, ServiceUnavailableException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { ERROR_CODES } from '@rps/shared';
import { UpstreamClient } from './upstream.client.js';
import { UserNotFoundError } from './user-not-found.error.js';

const config = {
  getOrThrow: () => 'test-token',
  get: () => '1000',
} as unknown as ConfigService;

function reply(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('UpstreamClient', () => {
  const fetchMock = vi.fn();
  let client: UpstreamClient;

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    client = new UpstreamClient(config);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    fetchMock.mockReset();
  });

  it('แนบ internal token, user id และ body แล้วคืน payload', async () => {
    fetchMock.mockResolvedValue(reply(200, { ok: true }));

    await expect(
      client.request('http://game', 'POST', '/internal/play', { userId: 'u1', body: { move: 'ROCK' } }),
    ).resolves.toEqual({ ok: true });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://game/internal/play');
    expect(init.headers).toMatchObject({ 'x-internal-token': 'test-token', 'x-user-id': 'u1' });
    expect(init.body).toBe(JSON.stringify({ move: 'ROCK' }));
  });

  it('400 จากข้างหลัง → ส่งต่อเป็น 400 ให้ผู้ใช้', async () => {
    fetchMock.mockResolvedValue(reply(400, { message: ['move must be one of ...'] }));

    await expect(client.request('http://game', 'POST', '/x')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('USER_NOT_FOUND → UserNotFoundError เพื่อให้ gateway สร้าง guest ใหม่', async () => {
    fetchMock.mockResolvedValue(reply(404, { code: ERROR_CODES.USER_NOT_FOUND }));

    await expect(client.request('http://user', 'GET', '/x')).rejects.toBeInstanceOf(UserNotFoundError);
  });

  it.each([401, 404, 500])('%i อื่น ๆ → 503 ไม่เผยรายละเอียดภายใน', async (status) => {
    fetchMock.mockResolvedValue(reply(status, { message: 'internal detail' }));

    await expect(client.request('http://user', 'GET', '/x')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('ต่อไม่ติดหรือ timeout → 503', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    await expect(client.request('http://user', 'GET', '/x')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});