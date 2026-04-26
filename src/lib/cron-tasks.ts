import { dbQuery } from '@/lib/db';
import { fetchAllUnreadArticles } from '@/lib/ttrss';
import { htmlToMarkdown } from '@/lib/html-to-markdown';
import { classifyAndScoreArticle } from '@/lib/ai-service';
import { scrapeArticle } from '@/lib/article-scraper';

export async function runFetchTask() {
  console.log('[Cron] Starting fetch task...');
  try {
    const ttrssArticles = await fetchAllUnreadArticles();
    if (ttrssArticles.length === 0) {
      console.log('[Cron] No new articles from TTRSS.');
      return { message: 'No new articles', processed: 0, total: 0 };
    }

    let processed = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const article of ttrssArticles) {
      try {
        const existing = await dbQuery('SELECT id FROM articles WHERE ttrss_article_id = $1 LIMIT 1', [article.id]);
        if (existing.rowCount && existing.rowCount > 0) {
          skipped++;
          continue;
        }

        let rawHtmlContent = article.content || '';
        let markdown = '';

        if (rawHtmlContent.length < 500 && article.link) {
          const scraped = await scrapeArticle(article.link);
          if (scraped) {
            if (scraped.type === 'markdown') {
              markdown = scraped.content;
            } else if (scraped.content.length > rawHtmlContent.length) {
              rawHtmlContent = scraped.content;
            }
          }
        }

        if (!markdown) {
          markdown = htmlToMarkdown(rawHtmlContent);
          if (!markdown.trim() && article.link) {
            const retried = await scrapeArticle(article.link, 15000);
            if (retried?.type === 'markdown' && retried.content.trim()) {
              markdown = retried.content;
            }
          }
        }

        if (!markdown.trim()) {
          errors.push(`Article ${article.id}: Empty content after fallback pipeline`);
          continue;
        }

        const aiResult = await classifyAndScoreArticle(article.title, markdown, article.feed_title);

        await dbQuery(
          `INSERT INTO articles (
            ttrss_article_id, title, link, author, feed_title, published_at,
            content_html, content_markdown,
            ai_title, ai_summary, ai_title_tc, ai_title_en, ai_summary_tc, ai_summary_en, ai_content_tc,
            ai_category, ai_score, ai_score_reasoning, metadata
          ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8,
            $9, $10, $11, $12, $13, $14, $15,
            $16, $17, $18, $19::jsonb
          )`,
          [
            article.id,
            article.title,
            article.link,
            article.author || null,
            article.feed_title,
            article.updated ? new Date(article.updated * 1000).toISOString() : null,
            rawHtmlContent,
            markdown,
            aiResult.title_tc,
            aiResult.summary_tc,
            aiResult.title_tc,
            aiResult.title_en,
            aiResult.summary_tc,
            aiResult.summary_en,
            aiResult.content_tc,
            aiResult.category,
            aiResult.score,
            aiResult.score_reasoning,
            JSON.stringify({
              tags: article.tags || [],
              language: article.lang || 'unknown',
              ai_model_used: process.env.OPENROUTER_MODEL,
              word_count: markdown.split(/\s+/).length,
            }),
          ],
        );

        processed++;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        errors.push(`Article ${article.id}: ${msg}`);
      }
    }

    return {
      message: `Processed ${processed} articles`,
      processed,
      skipped,
      total: ttrssArticles.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[Cron] Fetch articles failed:', msg);
    throw new Error(msg);
  }
}

function parseRetentionDays(input: string | undefined, defaultValue = 30): number {
  if (!input) return defaultValue;
  const trimmed = input.trim().toLowerCase();
  const match = trimmed.match(/^(\d+)\s*(d|day|days)?$/);
  if (match) return parseInt(match[1], 10);
  const parsed = parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

export async function runCleanupTask() {
  const retentionDays = parseRetentionDays(process.env.ARTICLE_RETENTION_DAYS, 30);
  const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

  try {
    const result = await dbQuery(
      `DELETE FROM articles
       WHERE is_bookmarked = false
         AND created_at < $1
       RETURNING id`,
      [cutoffDate],
    );

    return {
      message: 'Deleted old articles',
      deleted_count: result.rowCount || 0,
      retention_days: retentionDays,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[Cron] Cleanup failed:', msg);
    throw new Error(msg);
  }
}

