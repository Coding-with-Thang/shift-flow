import bcrypt from "bcryptjs";

const ROUNDS = 12;

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export async function hashInviteCode(plain: string) {
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifyInviteCode(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}
