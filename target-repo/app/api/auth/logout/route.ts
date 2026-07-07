import { NextResponse } from 'next/server';
import { TOKEN_NAME, getCookieDomain } from '@/lib/auth';

export async function POST() {
  try {
    const response = NextResponse.json({
      message: 'Logout successful',
    });

    // The login cookie is set with an explicit `domain` attribute (e.g.
    // ".neosaas.tech") whenever the request host matches the configured
    // NEXTAUTH_URL root domain — see setAuthCookie(). Browsers treat a
    // domain-scoped cookie and a host-only cookie of the same name as two
    // distinct cookies, so both variants need to be cleared to cover any
    // pre-existing host-only cookie from before this fix.
    //
    // IMPORTANT: response.cookies.set() calls for the *same cookie name*
    // overwrite each other in Next.js's cookie store — only the last call
    // actually produces a Set-Cookie header. Confirmed by hand (curl -D-
    // against this exact route): calling .set() twice for TOKEN_NAME here
    // only ever sent ONE Set-Cookie line (the last one), silently dropping
    // the other — which is exactly how the previous version of this fix
    // still failed to log anyone out. Append raw header lines instead so
    // both actually go out on the wire.
    const domain = await getCookieDomain();
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    const base = 'Path=/; Max-Age=0; HttpOnly; SameSite=Lax' + secure;
    if (domain) {
      response.headers.append('Set-Cookie', `${TOKEN_NAME}=; Domain=${domain}; ${base}`);
    }
    response.headers.append('Set-Cookie', `${TOKEN_NAME}=; ${base}`);

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'An error occurred during logout' },
      { status: 500 }
    );
  }
}
