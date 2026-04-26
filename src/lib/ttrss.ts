/**
 * TTRSS (Tiny Tiny RSS) API Client
 * Mirrors the n8n workflow logic for authentication and article fetching.
 */

const TTRSS_URL = process.env.TTRSS_ENDPOINT_URL!;
const TTRSS_USER = process.env.TTRSS_USERNAME!;
const TTRSS_PASS = process.env.TTRSS_PASSWORD!;

/**
 * Parses the TTRSS_FEED_ID environment variable into an array of feed configurations.
 * Supports comma-separated IDs like "2,5,10".
 */
function getTtrssFeedConfigs(): { id: number; isCat: boolean }[] {
  const raw = process.env.TTRSS_FEED_ID;
  if (!raw) {
    // Default to All Articles virtual feed (-4)
    return [{ id: -4, isCat: false }];
  }

  return raw.split(',').map((part) => {
    const id = parseInt(part.trim(), 10);
    // Positive integers are treated as categories, negative/zero as virtual/specific feeds
    return { id, isCat: id > 0 };
  });
}

interface TTRSSResponse<T = unknown> {
  seq: number;
  status: number;
  content: T;
}

interface TTRSSLoginContent {
  session_id: string;
  api_level: number;
}

interface TTRSSHeadline {
  id: number;
  unread: boolean;
  title: string;
  link: string;
  feed_title: string;
  author: string;
  updated: number;
  excerpt: string;
  content: string;
  feed_id: number;
  labels: unknown[];
  tags: string[];
}

interface TTRSSArticle {
  id: number;
  title: string;
  link: string;
  content: string;
  author: string;
  feed_title: string;
  updated: number;
  labels: unknown[];
  comments_link: string;
  comments_count: number;
  always_display_enclosures: boolean;
  note: string | null;
  lang: string;
  tags: string[];
}

async function ttrssRequest<T>(payload: Record<string, unknown>): Promise<T> {
  const res = await fetch(TTRSS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`TTRSS API error: ${res.status} ${res.statusText}`);
  }

  const data: TTRSSResponse<T> = await res.json();

  if (data.status !== 0) {
    throw new Error(`TTRSS API returned error status: ${data.status}`);
  }

  return data.content;
}

/**
 * Login to TTRSS and get a session ID
 */
export async function login(): Promise<string> {
  const content = await ttrssRequest<TTRSSLoginContent>({
    op: 'login',
    user: TTRSS_USER,
    password: TTRSS_PASS,
  });

  return content.session_id;
}

/**
 * Get unread headlines from a specific feed or category
 */
export async function getHeadlines(
  sessionId: string,
  feedId: number,
  isCat: boolean
): Promise<TTRSSHeadline[]> {
  const content = await ttrssRequest<TTRSSHeadline[]>({
    op: 'getHeadlines',
    sid: sessionId,
    feed_id: feedId,
    is_cat: isCat,
    view_mode: 'unread',
    limit: 200,
  });

  return content;
}

/**
 * Get full article content by ID
 */
export async function getArticle(sessionId: string, articleId: number): Promise<TTRSSArticle | null> {
  const content = await ttrssRequest<TTRSSArticle[]>({
    op: 'getArticle',
    sid: sessionId,
    article_id: articleId.toString(),
  });

  return content?.[0] || null;
}

/**
 * Mark an article as read in TTRSS
 */
export async function markAsRead(sessionId: string, articleId: number): Promise<void> {
  await ttrssRequest({
    op: 'updateArticle',
    sid: sessionId,
    article_ids: articleId.toString(),
    field: 2, // unread
    mode: 0,  // set to false (mark as read)
  });
}

/**
 * Fetch all unread articles with full content from all configured feeds/categories
 */
export async function fetchAllUnreadArticles(): Promise<TTRSSArticle[]> {
  const sessionId = await login();
  const configs = getTtrssFeedConfigs();
  
  console.log(`[TTRSS] Fetching from ${configs.length} sources: ${configs.map(c => c.id).join(', ')}`);

  const allHeadlines: TTRSSHeadline[] = [];
  
  for (const config of configs) {
    try {
      const headlines = await getHeadlines(sessionId, config.id, config.isCat);
      allHeadlines.push(...headlines);
    } catch (err) {
      console.error(`[TTRSS] Failed to get headlines for feed ${config.id}:`, err);
    }
  }

  // Deduplicate headlines by ID (just in case they appear in multiple categories)
  const uniqueHeadlineMap = new Map<number, TTRSSHeadline>();
  for (const h of allHeadlines) {
    uniqueHeadlineMap.set(h.id, h);
  }
  const uniqueHeadlines = Array.from(uniqueHeadlineMap.values());

  console.log(`[TTRSS] Found ${uniqueHeadlines.length} total unique unread headlines`);

  const articles: TTRSSArticle[] = [];

  for (const headline of uniqueHeadlines) {
    try {
      const article = await getArticle(sessionId, headline.id);
      if (article) {
        articles.push(article);
        // Mark as read in TTRSS
        await markAsRead(sessionId, headline.id);
      }
    } catch (err) {
      console.error(`[TTRSS] Failed to fetch article ${headline.id}:`, err);
    }
  }

  console.log(`[TTRSS] Successfully fetched ${articles.length} articles`);
  return articles;
}

export type { TTRSSArticle, TTRSSHeadline };
