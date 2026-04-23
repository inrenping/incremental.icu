import { NextResponse } from 'next/server';
import { GarminConnect } from 'garmin-connect';
import { JsonObject } from 'next-auth/adapters';

export async function GET() {
  try {
    // 建议使用环境变量存储敏感信息，并根据需要配置区域
    // 中国版通常需要指定 domain 为 'garmin.cn'
    const GCClient = new GarminConnect({
      username: '',
      password: ''
    }, 'garmin.cn');

    // China Domain
    // const GCClient = new GarminConnect({
    //     username: 'your-email',
    //     password: 'your-password'
    // }, 'garmin.cn');

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