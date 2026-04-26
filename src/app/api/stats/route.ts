import { dbQuery } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface CountRow {
  count: string;
}

interface ArticleStatRow {
  ai_category: string;
  ai_score: number;
  user_score: number | null;
  is_read: boolean;
  is_hidden: boolean;
}

export async function GET() {
  try {
    const [
      totalResult,
      unreadResult,
      bookmarkedResult,
      readResult,
      hiddenResult,
      prefResult,
      articleResult,
      categoryResult,
    ] = await Promise.all([
      dbQuery<CountRow>('SELECT COUNT(*)::text AS count FROM articles'),
      dbQuery<CountRow>('SELECT COUNT(*)::text AS count FROM articles WHERE is_read = false AND is_hidden = false'),
      dbQuery<CountRow>('SELECT COUNT(*)::text AS count FROM articles WHERE is_bookmarked = true'),
      dbQuery<CountRow>('SELECT COUNT(*)::text AS count FROM articles WHERE is_read = true'),
      dbQuery<CountRow>('SELECT COUNT(*)::text AS count FROM articles WHERE is_hidden = true'),
      dbQuery<CountRow>('SELECT COUNT(*)::text AS count FROM user_preferences'),
      dbQuery<ArticleStatRow>('SELECT ai_category, ai_score, user_score, is_read, is_hidden FROM articles'),
      dbQuery('SELECT * FROM categories WHERE is_active = true ORDER BY sort_order'),
    ]);

    const all = articleResult.rows;
    const categoryStats: Record<string, { total: number; unread: number; avgAiScore: number; avgUserScore: number }> = {};

    for (const article of all) {
      const cat = article.ai_category;
      if (!categoryStats[cat]) {
        categoryStats[cat] = { total: 0, unread: 0, avgAiScore: 0, avgUserScore: 0 };
      }

      categoryStats[cat].total += 1;
      if (!article.is_read && !article.is_hidden) categoryStats[cat].unread += 1;
      categoryStats[cat].avgAiScore += article.ai_score || 0;
      if (article.user_score) categoryStats[cat].avgUserScore += article.user_score;
    }

    for (const cat of Object.keys(categoryStats)) {
      const stat = categoryStats[cat];
      stat.avgAiScore = stat.total > 0 ? Math.round((stat.avgAiScore / stat.total) * 10) / 10 : 0;
      const scoredCount = all.filter((a: ArticleStatRow) => a.ai_category === cat && a.user_score).length;
      stat.avgUserScore = scoredCount > 0 ? Math.round((stat.avgUserScore / scoredCount) * 10) / 10 : 0;
    }

    return Response.json({
      overview: {
        total: parseInt(totalResult.rows[0]?.count || '0', 10),
        unread: parseInt(unreadResult.rows[0]?.count || '0', 10),
        bookmarked: parseInt(bookmarkedResult.rows[0]?.count || '0', 10),
        hidden: parseInt(hiddenResult.rows[0]?.count || '0', 10),
        read: parseInt(readResult.rows[0]?.count || '0', 10),
      },
      categoryStats,
      categories: categoryResult.rows || [],
      learningRecords: parseInt(prefResult.rows[0]?.count || '0', 10),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
