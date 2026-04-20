import { NextRequest } from 'next/server';

const GITHUB_TOKEN_ENDPOINT = 'https://github.com/login/oauth/access_token';
const GITHUB_USERINFO_ENDPOINT = 'https://api.github.com/user';
const GITHUB_EMAILS_ENDPOINT = 'https://api.github.com/user/emails';

interface GithubTokens {
  access_token: string;
}

interface GithubProfile {
  email?: string;
  name?: string;
  login?: string;
  avatar_url?: string;
  id?: string | number;
  [key: string]: unknown;
}

interface GithubEmail {
  email: string;
  primary?: boolean;
  [key: string]: unknown;
}

interface AppToken {
  access_token?: string;
  refresh_token?: string;
  accessToken?: string;
  refreshToken?: string;
  user?: Record<string, unknown>;
}

// 复用你的 HTML 构建函数
function buildLoginHtml(data: { accessToken: string; refreshToken: string; user: Record<string, unknown> }) {
  return `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Login Redirect</title></head>
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
  return `<!doctype html><html lang="en"><body><div style="padding:24px;font-family:system-ui,sans-serif;">
      <h1>GitHub 登录失败</h1><p>${message}</p><a href="/login">返回登录</a>
    </div></body></html>`;
}

// 1. 交换 Code
async function exchangeCode(code: string, redirectUri: string) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing GitHub OAuth environment variables');
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri
  });

  const response = await fetch(GITHUB_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: body.toString()
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub token exchange failed: ${errorText}`);
  }

  return response.json(); // 包含 access_token
}

// 2. 获取用户信息
async function fetchGithubProfile(accessToken: string) {
  const response = await fetch(GITHUB_USERINFO_ENDPOINT, {
    headers: { Authorization: `token ${accessToken}` } // GitHub 推荐使用 'token' 或 'Bearer'
  });

  if (!response.ok) throw new Error('Failed to fetch GitHub profile');
  const profile = await response.json();

  // 如果 email 为空，尝试请求私有邮箱接口
  if (!profile.email) {
    const emailRes = await fetch(GITHUB_EMAILS_ENDPOINT, {
      headers: { Authorization: `token ${accessToken}` }
    });
    if (emailRes.ok) {
      const emails = await emailRes.json() as GithubEmail[];
      const primaryEmail = emails.find((e) => e.primary) || emails[0];
      profile.email = primaryEmail?.email;
    }
  }

  return profile;
}

// 3. 请求你的后端（逻辑与 Google 一致）
async function requestAppToken(profile: GithubProfile, githubTokens: GithubTokens) {
  const endpoint = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/auth/github-login`;

  const body = {
    email: profile.email,
    name: profile.name || profile.login, // GitHub 可能没有真实姓名，用 login 名兜底
    avatar: profile.avatar_url,
    githubId: String(profile.id),
    accessToken: githubTokens.access_token,
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Backend failed: ${response.status}`);
  }

  return response.json() as Promise<AppToken>;
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  if (!code) return new Response(buildErrorHtml('Missing code'), { status: 400 });

  try {
    console.log("GitHub Code 交换中...");
    const redirectUri = `${req.nextUrl.origin}/api/auth/github/callback`;
    const githubTokens = await exchangeCode(code, redirectUri);

    console.log("获取 GitHub 用户信息...");
    const profile = await fetchGithubProfile(githubTokens.access_token);

    console.log("请求后端换取应用 Token...");
    const appToken = await requestAppToken(profile, githubTokens);
    const accessToken = appToken.access_token ?? appToken.accessToken;
    const refreshToken = appToken.refresh_token ?? appToken.refreshToken;

    if (!accessToken || !refreshToken) {
      throw new Error('Backend did not return application tokens');
    }

    return new Response(buildLoginHtml({
      accessToken,
      refreshToken,
      user: appToken.user || profile
    }), { headers: { 'Content-Type': 'text/html' } });

  } catch (err: unknown) {
    console.error("GitHub Auth Error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return new Response(buildErrorHtml(message), { status: 500, headers: { 'Content-Type': 'text/html' } });
  }
}