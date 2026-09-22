export const HIGH_SCORE_CHANNEL = 'rps:high-score:changed';

export interface HighScoreEvent {
  type: 'high_score';
  highScore: number;
}