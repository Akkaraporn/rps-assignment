import type { Move, RoundResult } from './moves.js';

export interface GuestUserResponse {
  userId: string;
}

export interface ApplyScoreRequest {
  playerMove: Move;
  botMove: Move;
  result: RoundResult;
}

export interface ScoreSnapshot {
  currentScore: number;
  bestScore: number;
  highScore: number;
}