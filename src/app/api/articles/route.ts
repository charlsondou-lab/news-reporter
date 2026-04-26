import { type NextRequest } from 'next/server';
import { dbQuery } from '@/lib/db';

export const dynamic = 'force-dynamic';

const VALID_SORTS = new Set(['created_at', 'ai_score', 'published_at', 'user_score']);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const category = searchParams.get('category');
  const hideRead = searchParams.get('hideRead') === 'true';
  const hideHidden = searchParams.get('hideHidden') !== 'false';
  const onlyBookmarked = searchParams.get('bookmarked') === 'true';
  const minScore = parseInt(searchParams.get('minScore') || '0', 10);
  const sortBy = searchParams.get('sort') || 'created_at';
  const sortOrder = searchParams.get('order') === 'asc' ? 'asc' : 'desc';
  const search = searchParams.get('search');
  const offset = searchParams.has('offset')
    ? parseInt(searchParams.get('offset') || '0', 10)
    : (page - 1) * limit;

  const where: string[] = [];
  const params: unknown[] = [];

  if (category && category !== 'all') {
    params.push(category);
    where.push(`ai_category = $${params.length}`);
  }
  if (hideRead) where.push('is_read = false');
  if (hideHidden) where.push('is_hidden = false');
  if (onlyBookmarked) where.push('is_bookmarked = true');
  if (minScore > 0) {
    params.push(minScore);
    where.push(`ai_score >= $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    where.push(`(title ILIKE $${params.length} OR ai_title ILIKE $${params.length} OR ai_summary ILIKE $${params.length})`);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  const sortField = VALID_SORTS.has(sortBy) ? sortBy : 'created_at';

  try {
    const countResult = await dbQuery<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM articles ${whereSql}`,
      params,
    );

    const pageParams = [...params, limit, offset];
    const dataResult = await dbQuery(
      `SELECT * FROM articles ${whereSql} ORDER BY ${sortField} ${sortOrder} LIMIT $${pageParams.length - 1} OFFSET $${pageParams.length}`,
      pageParams,
    );

    const total = parseInt(countResult.rows[0]?.count || '0', 10);

    return Response.json({
      articles: dataResult.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}

