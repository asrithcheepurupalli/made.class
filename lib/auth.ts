import { createHmac, scryptSync, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";

// v0 session: HMAC-signed cookie carrying the user id. Replace with a real
// session store + MFA before any production deployment.
const SECRET = process.env.AUTH_SECRET ?? "dev-only-secret-change-me";
const COOKIE = "mc_session";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  return timingSafeEqual(candidate, Buffer.from(hash, "hex"));
}

function sign(value: string): string {
  return createHmac("sha256", SECRET).update(value).digest("hex");
}

export async function createSession(userId: string) {
  const store = await cookies();
  store.set(COOKIE, `${userId}.${sign(userId)}`, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function currentUserId(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot < 0) return null;
  const userId = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  if (sign(userId) !== sig) return null;
  return userId;
}

export async function requireUser() {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) redirect("/login");
  return user;
}
