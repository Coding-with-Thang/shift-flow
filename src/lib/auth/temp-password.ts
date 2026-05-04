import { randomBytes } from "crypto";

const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@%^*";

/** Cryptographically random password (min 14 chars) suitable for Supabase `min(8)` policy. */
export function generateTempPassword(): string {
  let out = "";
  const buf = randomBytes(16);
  for (let i = 0; i < 14; i++) {
    out += CHARSET[buf[i]! % CHARSET.length];
  }
  return out;
}
