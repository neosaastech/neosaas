import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { isOfflineDev } from '@/lib/dev/offline-mode';
import { OFFLINE_DEV_USER } from '@/lib/dev/mock-data';

function getJwtSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('NEXTAUTH_SECRET is not set — required to sign and verify JWTs');
  }
  return secret;
}

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
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: '7d', // Token expires in 7 days
  });
}

/**
 * Verify a JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as JWTPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Get the current user from the auth token cookie
 */
export async function getCurrentUser(): Promise<JWTPayload | null> {
  if (isOfflineDev()) {
    return OFFLINE_DEV_USER;
  }

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
