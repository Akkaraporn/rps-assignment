import type { Move, RoundResult } from './moves';

export interface PlayRequest {
  move: Move;
}

export interface PlayResponse {
  botMove: Move;
  result: RoundResult;
  currentScore: number;
  highScore: number;
}

export interface SessionResponse {
  currentScore: number;
  highScore: number;
}