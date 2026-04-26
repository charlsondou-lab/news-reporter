import { dbQuery } from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const result = await dbQuery('SELECT * FROM articles WHERE id = $1 LIMIT 1', [id]);
    const article = result.rows[0];
    if (!article) {
      return Response.json({ error: 'Article not found' }, { status: 404 });
    }
    return Response.json(article);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();

  const setParts: string[] = [];
  const queryParams: unknown[] = [];

  if (typeof body.is_read === 'boolean') {
    queryParams.push(body.is_read);
    setParts.push(`is_read = $${queryParams.length}`);
    setParts.push(body.is_read ? 'read_at = NOW()' : 'read_at = NULL');
  }

  if (typeof body.is_hidden === 'boolean') {
    queryParams.push(body.is_hidden);
    setParts.push(`is_hidden = $${queryParams.length}`);
  }

  if (typeof body.is_bookmarked === 'boolean') {
    queryParams.push(body.is_bookmarked);
    setParts.push(`is_bookmarked = $${queryParams.length}`);
  }

  if (setParts.length === 0) {
    return Response.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  try {
    queryParams.push(id);
    const result = await dbQuery(
      `UPDATE articles SET ${setParts.join(', ')} WHERE id = $${queryParams.length} RETURNING *`,
      queryParams,
    );
    return Response.json(result.rows[0]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}

