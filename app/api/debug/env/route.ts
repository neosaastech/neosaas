import { NextResponse } from 'next/server';

export async function GET() {
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  
  return NextResponse.json({
    nextauthSecretDefined: !!process.env.NEXTAUTH_SECRET,
    authSecretDefined: !!process.env.AUTH_SECRET,
    secretLength: secret ? secret.length : 0,
    isValid: secret ? secret.length >= 32 : false,
    environment: process.env.VERCEL_ENV || 'development',
    nodeEnv: process.env.NODE_ENV,
  });
}
