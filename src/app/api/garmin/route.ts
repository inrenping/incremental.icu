import { NextResponse } from 'next/server';
import { GarminConnect } from 'garmin-connect';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const domainParam = body.domain;
    const usernameParam = body.username;
    const passwordParam = body.password;

    if (!usernameParam || !passwordParam) {
      return NextResponse.json({ error: 'Username and password are required in the request body.' }, { status: 400 });
    }

    // 建议使用环境变量存储敏感信息，并根据需要配置区域
    // 默认是国际版。如果 domainParam 为 'cn'，则使用 'garmin.cn'
    const garminDomain = (domainParam === 'cn') ? 'garmin.cn' : undefined;

    const GCClient = new GarminConnect({
      username: usernameParam || '',
      password: passwordParam || ''
    }, garminDomain);

    await GCClient.login();

    // 获取登录后的 Session 信息，其中包含了 OAuth Token
    // 注意：在生产环境中，请勿将敏感的 session 信息直接返回给前端
    const rawClient = (GCClient as any).client;

    const tokenData = {
      // OAuth 1.0 令牌 (常用于私有 API)
      oauth1: rawClient.oauth1Token || null,
      // OAuth 2.0 令牌 (较新 API 使用)
      oauth2: rawClient.oauth2Token || null,
      // 备用：某些版本存在 session 属性
      session: (GCClient as any).session || null
    };

    return NextResponse.json({
      tokenData

    });
  } catch (error: any) {
    console.error("Garmin API Error:", error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch Garmin profile' },
      { status: 500 }
    );
  }
}