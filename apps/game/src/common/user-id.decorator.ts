import { BadRequestException, createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { isUUID } from 'class-validator';
import type { Request } from 'express';

export const UserId = createParamDecorator((_: unknown, ctx: ExecutionContext): string => {
  const value = ctx.switchToHttp().getRequest<Request>().headers['x-user-id'];
  if (typeof value !== 'string' || !isUUID(value)) {
    throw new BadRequestException('Missing or invalid user id');
  }
  return value;
});