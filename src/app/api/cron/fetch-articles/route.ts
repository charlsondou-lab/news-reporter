import { type NextRequest } from 'next/server';
import { runFetchTask } from '@/lib/cron-tasks';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; 

export async function POST(request: NextRequest) {
  // 驗證密碼
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && secret !== cronSecret) {
    // 檢查是否為手動觸發（來自同一個 Origin）
    const origin = request.headers.get('origin') || '';
    const referer = request.headers.get('referer') || '';
    if (!origin && !referer) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const result = await runFetchTask();
    return Response.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500 });
  }
}
