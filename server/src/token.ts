import { randomBytes } from 'node:crypto';

export function makeToken(length = 12): string {
  return randomBytes(length).toString('base64url');
}
