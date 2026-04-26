import { type NextRequest } from 'next/server';
import { runCleanupTask } from '@/lib/cron-tasks';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // 驗證密碼
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && secret !== cronSecret) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runCleanupTask();
    return Response.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500 });
  }
}

// 同步支援 POST
export async function POST(request: NextRequest) {
  return GET(request);
}
