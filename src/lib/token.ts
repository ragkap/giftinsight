import { randomBytes } from 'node:crypto';

const ALPH = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'; // 54-char base, removes 0/O/1/I/l for shareability

export function newToken(len = 22): string {
  const bytes = randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += ALPH[bytes[i] % ALPH.length];
  return out;
}
