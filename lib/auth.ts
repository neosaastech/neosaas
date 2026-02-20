import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key-here-change-in-production';
const TOKEN_NAME = 'auth-token';

export interface JWTPayload {
  userId: string;
  email: string;
  companyId?: string; // Optional - platform admins don't belong to a company
  roles?: string[]; // User roles (reader, writer, admin, super_admin)
  permissions?: string[]; // User permissions
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Create a JWT token
 */
export function createToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '7d', // Token expires in 7 days
  });
}

/**
 * Verify a JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Get the current user from the auth token cookie
 */
export async function getCurrentUser(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_NAME)?.value;

  if (!token) {
    return null;
  }

  return verifyToken(token);
}

/**
 * Derive the cookie domain from NEXTAUTH_URL / NEXT_PUBLIC_APP_URL.
 * Returns e.g. ".neosaas.tech" for production so the cookie is shared
 * between neosaas.tech and www.neosaas.tech.
 * Returns undefined for localhost / *.vercel.app (browser default scoping).
 */
function getCookieDomain(): string | undefined {
  const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || '';
  try {
    const { hostname } = new URL(appUrl);
    if (
      hostname !== 'localhost' &&
      !hostname.endsWith('.vercel.app') &&
      hostname.includes('.')
    ) {
      // ".neosaas.tech" covers both neosaas.tech and www.neosaas.tech
      const parts = hostname.split('.');
      return '.' + parts.slice(-2).join('.');
    }
  } catch {
    // malformed URL — fall through
  }
  return undefined;
}

/**
 * Set the auth token cookie
 */
export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  const domain = getCookieDomain();
  cookieStore.set(TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
    ...(domain ? { domain } : {}),
  });
}

/**
 * Remove the auth token cookie
 */
export async function removeAuthCookie() {
  const cookieStore = await cookies();
  const domain = getCookieDomain();
  if (domain) {
    cookieStore.set(TOKEN_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
      domain,
    });
  } else {
    cookieStore.delete(TOKEN_NAME);
  }
}
