import { Pool, type QueryResult, type QueryResultRow } from 'pg';

let pool: Pool | null = null;

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set');
  }
  return url;
}

function getPool(): Pool {
  if (!pool) {
    const connectionString = getDatabaseUrl();
    const pgSsl = process.env.PG_SSL?.toLowerCase();
    const shouldUseSsl =
      pgSsl === 'true'
        ? true
        : pgSsl === 'false'
          ? false
          : process.env.NODE_ENV === 'production';

    pool = new Pool({
      connectionString,
      ssl: shouldUseSsl ? { rejectUnauthorized: false } : undefined,
    });
  }
  return pool;
}

export async function dbQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> {
  return getPool().query<T>(text, params);
}

