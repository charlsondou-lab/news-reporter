import { dbQuery } from '@/lib/db';

export async function POST(request: Request) {
  const body = await request.json();
  const { action, ids, filters } = body;

  try {
    switch (action) {
      case 'markAllRead': {
        if (filters?.category) {
          await dbQuery(
            'UPDATE articles SET is_read = true, read_at = NOW() WHERE is_read = false AND ai_category = $1',
            [filters.category],
          );
        } else {
          await dbQuery(
            'UPDATE articles SET is_read = true, read_at = NOW() WHERE is_read = false',
          );
        }
        return Response.json({ success: true, action: 'markAllRead' });
      }

      case 'hideReadArticles': {
        await dbQuery(
          'UPDATE articles SET is_hidden = true WHERE is_read = true AND is_hidden = false',
        );
        return Response.json({ success: true, action: 'hideReadArticles' });
      }

      case 'hideLowScore': {
        const threshold = Number(filters?.threshold || 4);
        await dbQuery(
          'UPDATE articles SET is_hidden = true WHERE ai_score <= $1 AND is_hidden = false',
          [threshold],
        );
        return Response.json({ success: true, action: 'hideLowScore' });
      }

      case 'updateMany': {
        if (!Array.isArray(ids) || ids.length === 0) {
          return Response.json({ error: 'No IDs provided' }, { status: 400 });
        }

        const setParts: string[] = [];
        const params: unknown[] = [];

        if (typeof body.is_read === 'boolean') {
          params.push(body.is_read);
          setParts.push(`is_read = $${params.length}`);
          if (body.is_read) {
            setParts.push('read_at = NOW()');
          } else {
            setParts.push('read_at = NULL');
          }
        }
        if (typeof body.is_hidden === 'boolean') {
          params.push(body.is_hidden);
          setParts.push(`is_hidden = $${params.length}`);
        }
        if (typeof body.is_bookmarked === 'boolean') {
          params.push(body.is_bookmarked);
          setParts.push(`is_bookmarked = $${params.length}`);
        }

        if (setParts.length === 0) {
          return Response.json({ error: 'No valid updates provided' }, { status: 400 });
        }

        params.push(ids);
        await dbQuery(
          `UPDATE articles SET ${setParts.join(', ')} WHERE id = ANY($${params.length}::uuid[])`,
          params,
        );

        return Response.json({ success: true, action: 'updateMany', count: ids.length });
      }

      default:
        return Response.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}

