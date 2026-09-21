import { Controller, Post } from '@nestjs/common';
import type { GuestUserResponse } from '@rps/shared';
import { UsersRepository } from './users.repository.js';

@Controller('internal/users')
export class UsersController {
  constructor(private readonly users: UsersRepository) {}

  @Post('guest')
  async createGuest(): Promise<GuestUserResponse> {
    return { userId: await this.users.createGuest() };
  }
}