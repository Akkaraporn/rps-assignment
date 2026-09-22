import { Module } from '@nestjs/common';
import { HighScoreSocket } from './high-score.socket.js';
import { HighScoreSubscriber } from './high-score.subscriber.js';

@Module({
  providers: [HighScoreSocket, HighScoreSubscriber],
})
export class RealtimeModule {}