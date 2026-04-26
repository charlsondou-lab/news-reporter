import { after } from 'next/server';
import { dbQuery } from '@/lib/db';
import { analyzeFeedbackDifference } from '@/lib/ai-service';

interface ArticleRow {
  id: string;
  ai_title: string | null;
  title: string;
  content_markdown: string | null;
  ai_summary: string | null;
  ai_category: string;
  ai_score: number;
  feed_title: string | null;
  read_at: string | null;
}

interface InsertedPreferenceRow {
  id: string;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const { score, comment } = body as { score: number; comment?: string };

  if (!score || score < 1 || score > 10) {
    return Response.json({ error: 'Score must be between 1 and 10' }, { status: 400 });
  }

  try {
    const articleResult = await dbQuery<ArticleRow>(
      'SELECT id, ai_title, title, content_markdown, ai_summary, ai_category, ai_score, feed_title, read_at FROM articles WHERE id = $1 LIMIT 1',
      [id],
    );
    const article = articleResult.rows[0];

    if (!article) {
      return Response.json({ error: 'Article not found' }, { status: 404 });
    }

    const updatedResult = await dbQuery(
      `UPDATE articles
       SET user_score = $1,
           user_comment = $2,
           scored_at = NOW(),
           is_read = true,
           is_hidden = true,
           read_at = COALESCE(read_at, NOW())
       WHERE id = $3
       RETURNING *`,
      [score, comment || null, id],
    );

    const updated = updatedResult.rows[0];
    const scoreDiff = Math.abs(score - article.ai_score);
    const threshold = 1;

    // Always persist user preference synchronously so comment never gets lost.
    const preferenceInsert = await dbQuery<InsertedPreferenceRow>(
      `INSERT INTO user_preferences
        (article_id, ai_score, user_score, user_comment, article_category, article_feed, learning_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
       RETURNING id`,
      [
        id,
        article.ai_score,
        score,
        comment || null,
        article.ai_category,
        article.feed_title,
        JSON.stringify({}),
      ],
    );
    const preferenceId = preferenceInsert.rows[0]?.id;

    if (scoreDiff >= threshold && preferenceId) {
      after(async () => {
        try {
          const feedbackAnalysis = await analyzeFeedbackDifference(
            article.ai_title || article.title,
            article.content_markdown || article.ai_summary || '',
            article.ai_category,
            article.ai_score,
            score,
            comment || '',
          );

          await dbQuery(
            'UPDATE articles SET ai_feedback_analysis = $1 WHERE id = $2',
            [feedbackAnalysis.analysis, id],
          );

          await dbQuery(
            `UPDATE user_preferences
             SET ai_analysis = $1,
                 learned_pattern = $2,
                 learning_data = $3::jsonb
             WHERE id = $4`,
            [
              feedbackAnalysis.analysis,
              feedbackAnalysis.learned_pattern,
              JSON.stringify({
                keywords_liked: feedbackAnalysis.keywords_liked,
                keywords_disliked: feedbackAnalysis.keywords_disliked,
                topic_preference: feedbackAnalysis.topic_preference,
              }),
              preferenceId,
            ],
          );
        } catch (error) {
          console.error('[Score] Background AI feedback analysis failed:', error);
        }
      });
    }

    return Response.json({
      success: true,
      article: updated,
      scoreDiff,
      analysisScheduled: scoreDiff >= threshold,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}

