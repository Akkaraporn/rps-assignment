import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import type { RateLimiter } from '../rate-limit/rate-limiter.service.js';
import type { UpstreamClient } from '../upstream/upstream.client.js';
import { UserNotFoundError } from '../upstream/user-not-found.error.js';
import { SessionService } from './session.service.js';

const EXISTING_ID = '11111111-1111-4111-8111-111111111111';
const NEW_ID = '22222222-2222-4222-8222-222222222222';
const COOKIE = 'rps_sid';

const config = {
  getOrThrow: (key: string) =>
    ({ SESSION_COOKIE_NAME: COOKIE, USER_SERVICE_URL: 'http://user' })[key],
  get: () => undefined,
} as unknown as ConfigService;

function makeRequest(cookieValue?: unknown): Request {
  return {
    signedCookies: cookieValue === undefined ? {} : { [COOKIE]: cookieValue },
    ip: '10.0.0.1',
  } as unknown as Request;
}

describe('SessionService', () => {
  let request: ReturnType<typeof vi.fn>;
  let assertCanCreateGuest: ReturnType<typeof vi.fn>;
  let res: Response & { cookie: ReturnType<typeof vi.fn> };
  let service: SessionService;

  beforeEach(() => {
    request = vi.fn().mockResolvedValue({ userId: NEW_ID });
    assertCanCreateGuest = vi.fn().mockResolvedValue(undefined);
    res = { cookie: vi.fn() } as unknown as Response & { cookie: ReturnType<typeof vi.fn> };
    service = new SessionService(
      config,
      { request } as unknown as UpstreamClient,
      { assertCanCreateGuest } as unknown as RateLimiter,
    );
  });

  it('ใช้ userId จาก signed cookie ที่ถูกต้อง โดยไม่สร้าง guest ใหม่', async () => {
    const action = vi.fn().mockResolvedValue('ok');

    await expect(service.withUser(makeRequest(EXISTING_ID), res, action)).resolves.toBe('ok');

    expect(action).toHaveBeenCalledWith(EXISTING_ID);
    expect(request).not.toHaveBeenCalled();
    expect(res.cookie).not.toHaveBeenCalled();
  });

  it('ไม่มี cookie → สร้าง guest และตั้ง signed cookie', async () => {
    const action = vi.fn().mockResolvedValue('ok');

    await service.withUser(makeRequest(), res, action);

    expect(action).toHaveBeenCalledWith(NEW_ID);
    expect(res.cookie).toHaveBeenCalledWith(
      COOKIE,
      NEW_ID,
      expect.objectContaining({ signed: true, httpOnly: true, sameSite: 'lax' }),
    );
  });

  it('cookie ถูกแก้ (ลายเซ็นไม่ตรง) → ถือเป็นคนใหม่', async () => {
    const action = vi.fn().mockResolvedValue('ok');

    await service.withUser(makeRequest(false), res, action);

    expect(action).toHaveBeenCalledTimes(1);
    expect(action).toHaveBeenCalledWith(NEW_ID);
  });

  it('cookie ไม่ใช่ uuid → ถือเป็นคนใหม่', async () => {
    const action = vi.fn().mockResolvedValue('ok');

    await service.withUser(makeRequest('not-a-uuid'), res, action);

    expect(action).toHaveBeenCalledWith(NEW_ID);
  });

  it('user ใน cookie ไม่มีในระบบ → สร้าง guest แล้วลองใหม่หนึ่งครั้ง', async () => {
    const action = vi
      .fn()
      .mockRejectedValueOnce(new UserNotFoundError())
      .mockResolvedValueOnce('ok');

    await expect(service.withUser(makeRequest(EXISTING_ID), res, action)).resolves.toBe('ok');

    expect(action).toHaveBeenNthCalledWith(1, EXISTING_ID);
    expect(action).toHaveBeenNthCalledWith(2, NEW_ID);
    expect(res.cookie).toHaveBeenCalledOnce();
  });

  it('error อื่นส่งต่อออกไป โดยไม่สร้าง guest', async () => {
    const action = vi.fn().mockRejectedValue(new Error('boom'));

    await expect(service.withUser(makeRequest(EXISTING_ID), res, action)).rejects.toThrow('boom');

    expect(request).not.toHaveBeenCalled();
  });

  it('สร้าง guest เกินโควตา → ไม่เรียก action และไม่ตั้ง cookie', async () => {
    assertCanCreateGuest.mockRejectedValue(new Error('Too many requests'));
    const action = vi.fn();

    await expect(service.withUser(makeRequest(), res, action)).rejects.toThrow('Too many requests');

    expect(action).not.toHaveBeenCalled();
    expect(res.cookie).not.toHaveBeenCalled();
    expect(assertCanCreateGuest).toHaveBeenCalledWith('10.0.0.1');
  });
});