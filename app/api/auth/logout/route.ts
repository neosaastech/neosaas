import { NextResponse } from 'next/server';
import { removeAuthCookie } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    // Remove auth cookie using the lib function
    await removeAuthCookie();
    
    // Also explicitly delete on the response to be sure
    const response = NextResponse.json({
      message: 'Logout successful',
    });
    
    response.cookies.delete('auth-token');
    
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'An error occurred during logout' },
      { status: 500 }
    );
  }
}
