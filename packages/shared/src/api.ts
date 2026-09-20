import type { Move, RoundResult } from './moves.js';

export interface PlayRequest {
  move: Move;
}

export interface PlayResponse {
  playerMove: Move;
  botMove: Move;
  result: RoundResult;
  currentScore: number;
  highScore: number;
}

export interface SessionResponse {
  currentScore: number;
  highScore: number;
}