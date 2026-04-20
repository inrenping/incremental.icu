import { NextRequest } from 'next/server';

const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v3/userinfo';

interface GoogleTokens {
  id_token?: string;
  access_token: string;
  refresh_token?: string;
}

interface GoogleProfile {
  email?: string;
  name?: string;
  picture?: string;
  sub?: string;
  [key: string]: unknown;
}

interface AppToken {
  access_token?: string;
  refresh_token?: string;
  accessToken?: string;
  refreshToken?: string;
  user?: Record<string, unknown>;
}

function buildLoginHtml(data: { accessToken: string; refreshToken: string; user: Record<string, unknown> }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Login Redirect</title>
  </head>
  <body>
    <script>
      const payload = ${JSON.stringify(data)};
      localStorage.setItem('accessToken', payload.accessToken);
      localStorage.setItem('refreshToken', payload.refreshToken);
      localStorage.setItem('user', JSON.stringify(payload.user));
      window.location.href = '/dash';
    </script>
  </body>
</html>`;
}

function buildErrorHtml(message: string) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Login Failed</title>
  </head>
  <body>
    <div style="padding:24px;font-family:system-ui,sans-serif;">
      <h1>Google 登录失败</h1>
      <p>${message}</p>
      <a href="/login">返回登录</a>
    </div>
  </body>
</html>`;
}

async function exchangeCode(code: string, redirectUri: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing Google OAuth environment variables');
  }

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code'
  });

  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body.toString()
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Token exchange failed: ${payload}`);
  }

  return response.json();
}

async function fetchGoogleProfile(accessToken: string) {
  const response = await fetch(GOOGLE_USERINFO_ENDPOINT, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error('Unable to fetch Google profile');
  }

  return response.json();
}

async function requestAppToken(profile: GoogleProfile, googleTokens: GoogleTokens) {

  const endpoints = [
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/auth/google-login`
  ];

  const body = {
    email: profile.email,
    name: profile.name,
    avatar: profile.picture,
    googleId: profile.sub,
    idToken: googleTokens.id_token,
    accessToken: googleTokens.access_token,
    refreshToken: googleTokens.refresh_token
  };

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        return response.json() as Promise<AppToken>;
      }

      if (response.status === 404) {
        continue;
      }

      const errorText = await response.text();
      throw new Error(`Backend auth failed: ${response.status} ${errorText}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        continue;
      }
      throw error;
    }
  }

  throw new Error('No supported backend Google login endpoint found');
}

export async function GET(req: NextRequest) {
  const error = req.nextUrl.searchParams.get('error');
  if (error) {
    return new Response(buildErrorHtml(`Google returned an error: ${error}`), {
      headers: { 'Content-Type': 'text/html' },
      status: 400
    });
  }

  const code = req.nextUrl.searchParams.get('code');
  if (!code) {
    return new Response(buildErrorHtml('Missing authorization code from Google.'), {
      headers: { 'Content-Type': 'text/html' },
      status: 400
    });
  }

  const redirectUri = `${req.nextUrl.origin}/api/auth/google/callback`;

  try {
    console.log("正在尝试用 code 交换 token...");
    const googleTokens = await exchangeCode(code, redirectUri);

    console.log("获取 profile...");
    const profile = await fetchGoogleProfile(googleTokens.access_token);

    console.log("正在请求后端接口:", process.env.NEXT_PUBLIC_BACKEND_URL);
    const appToken = await requestAppToken(profile, googleTokens);

    const accessToken = appToken.access_token || appToken.accessToken;
    const refreshToken = appToken.refresh_token || appToken.refreshToken;
    const user = appToken.user || profile;

    if (!accessToken || !refreshToken) {
      throw new Error('Backend did not return application tokens');
    }

    return new Response(buildLoginHtml({ accessToken, refreshToken, user }), {
      headers: { 'Content-Type': 'text/html' }
    });
  } catch (err: unknown) {
    console.error("详细错误信息:", err);
    const message = err instanceof Error ? err.message : String(err);
    return new Response(buildErrorHtml(message), {
      headers: { 'Content-Type': 'text/html' },
      status: 500
    });
  }
}
