import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { HIGH_SCORE_CHANNEL, type HighScoreEvent } from '@rps/shared';
import { HighScoreSocket } from './high-score.socket.js';

@Injectable()
export class HighScoreSubscriber implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HighScoreSubscriber.name);
  private redis?: Redis;

  constructor(
    private readonly config: ConfigService,
    private readonly socket: HighScoreSocket,
  ) {}

  async onModuleInit(): Promise<void> {
    this.redis = new Redis(this.config.getOrThrow<string>('REDIS_URL'));
    this.redis.on('error', (error) => this.logger.warn(error.message));
    this.redis.on('message', (channel, message) => this.handle(channel, message));
    await this.redis.subscribe(HIGH_SCORE_CHANNEL);
    this.logger.log(`Subscribed to ${HIGH_SCORE_CHANNEL}`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis?.quit();
  }

  private handle(channel: string, message: string): void {
    if (channel !== HIGH_SCORE_CHANNEL) return;

    const event = parseEvent(message);
    if (!event) {
      this.logger.warn('Ignored malformed high score event');
      return;
    }
    this.socket.broadcast(event);
  }
}

function parseEvent(raw: string): HighScoreEvent | null {
  try {
    const value = JSON.parse(raw) as Partial<HighScoreEvent>;
    return value.type === 'high_score' && typeof value.highScore === 'number'
      ? { type: 'high_score', highScore: value.highScore }
      : null;
  } catch {
    return null;
  }
}