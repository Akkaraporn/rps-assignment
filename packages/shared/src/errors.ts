export const ERROR_CODES = {
  USER_NOT_FOUND: 'USER_NOT_FOUND',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];