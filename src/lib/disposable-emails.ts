// Curated short blocklist of free / disposable email providers.
// Business email = anything NOT in this list.
const BLOCKED = new Set([
  'gmail.com', 'googlemail.com',
  'hotmail.com', 'hotmail.co.uk', 'hotmail.fr', 'hotmail.de',
  'outlook.com', 'outlook.fr', 'outlook.de', 'live.com', 'live.co.uk', 'msn.com',
  'yahoo.com', 'yahoo.co.uk', 'yahoo.co.in', 'yahoo.co.jp', 'yahoo.fr', 'yahoo.de', 'ymail.com', 'rocketmail.com',
  'icloud.com', 'me.com', 'mac.com',
  'aol.com',
  'proton.me', 'protonmail.com', 'pm.me',
  'zoho.com',
  'gmx.com', 'gmx.de', 'gmx.net',
  'mail.com', 'fastmail.com', 'tutanota.com', 'tutanota.de', 'tuta.io',
  'rediffmail.com', 'qq.com', '163.com', '126.com', 'sina.com', 'foxmail.com',
  'yandex.com', 'yandex.ru',
  // Disposable
  'mailinator.com', '10minutemail.com', 'guerrillamail.com', 'tempmail.com',
  'throwawaymail.com', 'maildrop.cc', 'getnada.com', 'sharklasers.com',
  'yopmail.com', 'trashmail.com', 'fakeinbox.com', 'dispostable.com',
]);

const RFC = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emailDomain(email: string): string {
  return email.trim().toLowerCase().split('@')[1] ?? '';
}

export function isBusinessEmail(email: string): { ok: true } | { ok: false; reason: string } {
  const trimmed = email.trim();
  if (!RFC.test(trimmed)) return { ok: false, reason: 'Please enter a valid email address.' };
  const domain = emailDomain(trimmed);
  if (BLOCKED.has(domain)) return { ok: false, reason: 'Please use your business email (not Gmail, Yahoo, Hotmail, etc.).' };
  return { ok: true };
}

const NAME_RE = /^[A-Za-zÀ-ÖØ-öø-ÿ'’\-\.]{2,40}$/;
export function isValidName(s: string): boolean {
  return NAME_RE.test(s.trim());
}
