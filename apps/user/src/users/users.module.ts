import { Module } from '@nestjs/common';
import { UsersController } from './users.controller.js';
import { UsersRepository } from './users.repository.js';

@Module({
  controllers: [UsersController],
  providers: [UsersRepository],
})
export class UsersModule {}