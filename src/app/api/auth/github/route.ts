import { NextResponse, type NextRequest } from 'next/server';

const GITHUB_AUTH_ENDPOINT = 'https://github.com/login/oauth/authorize';

export async function GET(req: NextRequest) {
  const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'Missing GITHUB_CLIENT_ID environment variable' }, { status: 500 });
  }

  const origin = req.nextUrl.origin;
  const redirectUri = `${origin}/api/auth/github/callback`;

  const authUrl = new URL(GITHUB_AUTH_ENDPOINT);
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', 'read:user user:email');
  authUrl.searchParams.set('allow_signup', 'true');

  return NextResponse.redirect(authUrl);
}
