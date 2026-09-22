import { useCallback, useEffect, useRef, useState } from 'react';
import type { Move, RoundResult } from '@rps/shared';
import { fetchSession, play } from '../api/client';
import { subscribeHighScore } from '../api/highScoreSocket';
import { ApiError } from '../api/client';

const REVEAL_MS = Number(import.meta.env.VITE_REVEAL_DURATION_MS ?? 2000);
type Phase = 'idle' | 'playing' | 'revealing';

interface GameState {
  phase: Phase;
  botMove: Move | null;
  result: RoundResult | null;
  currentScore: number;
  highScore: number;
  error: string | null;
}

export function useGame() {
  const [state, setState] = useState<GameState>({
    phase: 'idle',
    botMove: null,
    result: null,
    currentScore: 0,
    highScore: 0,
    error: null,
  });

  const timerRef = useRef<number | null>(null);
  const phaseRef = useRef<Phase>('idle');
  useEffect(() => {
    let cancelled = false;

    fetchSession()
      .then((session) => {
        if (cancelled) return;
        setState((prev) => ({ ...prev, ...session }));
      })
      .catch(() => {
        if (cancelled) return;
        setState((prev) => ({ ...prev, error: 'โหลดคะแนนไม่สำเร็จ' }));
      });

    return () => {
      cancelled = true;
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

    useEffect(() => {
    return subscribeHighScore((highScore) => {
      setState((prev) => ({ ...prev, highScore: Math.max(prev.highScore, highScore) }));
    });
  }, []);

  const choose = useCallback((move: Move) => {
    if (phaseRef.current !== 'idle') return;
    phaseRef.current = 'playing';
    setState((prev) => ({ ...prev, phase: 'playing', error: null }));

    play(move)
      .then((res) => {
        phaseRef.current = 'revealing';
        setState((prev) => ({
          ...prev,
          phase: 'revealing',
          botMove: res.botMove,
          result: res.result,
          currentScore: res.currentScore,
          highScore: Math.max(prev.highScore, res.highScore),
        }));

        timerRef.current = window.setTimeout(() => {
          phaseRef.current = 'idle';
          setState((prev) => ({ ...prev, phase: 'idle', botMove: null, result: null }));
        }, REVEAL_MS);
      })
      .catch((error: unknown) => {
        phaseRef.current = 'idle';
        const message =
          error instanceof ApiError && error.status === 429
            ? 'เล่นเร็วเกินไป ลองใหม่อีกครั้ง'
            : 'เชื่อมต่อไม่สำเร็จ';
        setState((prev) => ({ ...prev, phase: 'idle', error: message }));
      });
  }, []);

  return { ...state, choose };
}