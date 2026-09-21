import { Inject, Injectable } from '@nestjs/common';
import type pg from 'pg';
import { PG_POOL } from '../database/database.module.js';

const CREATE_GUEST_SQL = `
  WITH new_user AS (
    INSERT INTO users DEFAULT VALUES RETURNING id
  )
  INSERT INTO player_scores (user_id)
  SELECT id FROM new_user
  RETURNING user_id`;

@Injectable()
export class UsersRepository {
  constructor(@Inject(PG_POOL) private readonly pool: pg.Pool) {}

  async createGuest(): Promise<string> {
    const { rows } = await this.pool.query<{ user_id: string }>(CREATE_GUEST_SQL);
    return rows[0].user_id;
  }
}