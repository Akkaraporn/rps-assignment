import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlayResponse } from '@rps/shared';
import { ApiError, fetchSession, play } from '../api/client';
import { subscribeHighScore } from '../api/highScoreSocket';
import { useGame } from './useGame';

vi.mock('../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/client')>()),
  fetchSession: vi.fn(),
  play: vi.fn(),
}));

vi.mock('../api/highScoreSocket', () => ({
  subscribeHighScore: vi.fn(() => () => {}),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const WIN: PlayResponse = { playerMove: 'ROCK', botMove: 'SCISSORS', result: 'WIN', currentScore: 4, highScore: 9 };

async function flush(ms = 0) {
  await act(() => vi.advanceTimersByTimeAsync(ms));
}

describe('useGame', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(fetchSession).mockResolvedValue({ currentScore: 3, highScore: 9 });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('โหลดคะแนนจาก server ตอนเริ่ม', async () => {
    const { result } = renderHook(() => useGame());
    await flush();

    expect(result.current.currentScore).toBe(3);
    expect(result.current.highScore).toBe(9);
    expect(result.current.phase).toBe('idle');
  });

  it('ล็อกทันทีที่กด ไม่รอ response', async () => {
    const pending = deferred<PlayResponse>();
    vi.mocked(play).mockReturnValue(pending.promise);
    const { result } = renderHook(() => useGame());
    await flush();

    act(() => result.current.choose('ROCK'));

    expect(result.current.phase).toBe('playing');
  });

  it('แสดงผลของบอท แล้วกลับเป็น ??? หลังครบ 2 วินาที โดยคะแนนยังอยู่', async () => {
    vi.mocked(play).mockResolvedValue(WIN);
    const { result } = renderHook(() => useGame());
    await flush();

    act(() => result.current.choose('ROCK'));
    await flush();

    expect(result.current.phase).toBe('revealing');
    expect(result.current.botMove).toBe('SCISSORS');
    expect(result.current.currentScore).toBe(4);

    await flush(1999);
    expect(result.current.phase).toBe('revealing');

    await flush(1);
    expect(result.current.phase).toBe('idle');
    expect(result.current.botMove).toBeNull();
    expect(result.current.currentScore).toBe(4);
  });

  it('กดซ้ำระหว่างแสดงผลไม่ส่ง request เพิ่ม', async () => {
    vi.mocked(play).mockResolvedValue(WIN);
    const { result } = renderHook(() => useGame());
    await flush();

    act(() => result.current.choose('ROCK'));
    await flush();
    act(() => result.current.choose('PAPER'));
    act(() => result.current.choose('SCISSORS'));
    await flush();

    expect(play).toHaveBeenCalledTimes(1);
  });

  it('โดน rate limit → แจ้งผู้เล่นและปลดล็อกปุ่ม', async () => {
    vi.mocked(play).mockRejectedValue(new ApiError(429));
    const { result } = renderHook(() => useGame());
    await flush();

    act(() => result.current.choose('ROCK'));
    await flush();

    expect(result.current.phase).toBe('idle');
    expect(result.current.error).toMatch(/เร็วเกินไป/);
  });

  it('High Score จาก WebSocket ขึ้นได้ แต่ไม่ถอยหลัง', async () => {
    let push: (highScore: number) => void = () => {};
    vi.mocked(subscribeHighScore).mockImplementation((onChange) => {
      push = onChange;
      return () => {};
    });
    const { result } = renderHook(() => useGame());
    await flush();

    act(() => push(15));
    expect(result.current.highScore).toBe(15);

    act(() => push(12));
    expect(result.current.highScore).toBe(15);
  });
});