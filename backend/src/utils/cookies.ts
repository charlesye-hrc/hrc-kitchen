import { CookieOptions } from 'express';

export const AUTH_COOKIE_NAME = 'auth_token';

const isProduction = process.env.NODE_ENV === 'production';

export const getAuthCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
});
