import { useCallback, useEffect, useRef, useState } from 'react';
import type { Move, RoundResult } from '@rps/shared';
import { fetchSession, play } from '../api/client';
import { subscribeHighScore } from '../api/highScoreSocket';

const REVEAL_MS = 2000;

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
    setState((prev) => {
      if (prev.phase !== 'idle') return prev;
      return { ...prev, phase: 'playing', error: null };
    });

    play(move)
      .then((res) => {
        setState((prev) => ({
          ...prev,
          phase: 'revealing',
          botMove: res.botMove,
          result: res.result,
          currentScore: res.currentScore,
          highScore: res.highScore,
        }));

        timerRef.current = window.setTimeout(() => {
          setState((prev) => ({ ...prev, phase: 'idle', botMove: null, result: null }));
        }, REVEAL_MS);
      })
      .catch(() => {
        setState((prev) => ({ ...prev, phase: 'idle', error: 'เชื่อมต่อไม่สำเร็จ' }));
      });
  }, []);

  return { ...state, choose };
}