import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. 允許排除的路徑 (登入頁、API 認證路徑、公用靜態檔案)
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/cron') || // 允許 Cron 任務執行
    pathname.includes('.') // 靜態檔案 如 favicon.ico 等
  ) {
    return NextResponse.next();
  }

  // 2. 檢查 Cookie 中的認證狀態
  const authCookie = request.cookies.get('site_auth');
  const sitePassword = process.env.SITE_PASSWORD;

  // 如果沒有設定密碼，則預設允許存取 (防止初次部署未設定環境變數導致無法進入)
  if (!sitePassword) {
    return NextResponse.next();
  }

  // 如果 Cookie 內容不匹配密碼，則重新導向到登入頁面
  if (authCookie?.value !== sitePassword) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// 設定作用範圍
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
