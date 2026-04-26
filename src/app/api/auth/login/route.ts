import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    const sitePassword = process.env.SITE_PASSWORD;

    // 如果環境變數中沒有設定密碼，則視為不正確
    if (!sitePassword) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    if (password === sitePassword) {
      const response = NextResponse.json({ success: true });
      
      // 設定 HTTP-only Cookie，有效期為 30 天
      response.cookies.set('site_auth', password, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
      });

      return response;
    }

    return NextResponse.json({ error: '密碼錯誤' }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ error: '無效的請求' }, { status: 400 });
  }
}
